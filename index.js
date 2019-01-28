const { createLambda } = require('@now/build-utils/lambda.js')
const download = require('@now/build-utils/fs/download.js')
const FileBlob = require('@now/build-utils/file-blob.js')
const FileFsRef = require('@now/build-utils/file-fs-ref.js')
const { readFile } = require('fs.promised')
const glob = require('@now/build-utils/fs/glob.js')
const path = require('path')
const { runNpmInstall } = require('@now/build-utils/fs/run-user-scripts.js')
const rename = require('@now/build-utils/fs/rename')

/** @typedef { import('@now/build-utils/file-ref') } FileRef */
/** @typedef {{[filePath: string]: FileRef}} Files */

/**
 * @typedef {Object} BuildParamsType
 * @property {Files} files - Files object
 * @property {string} entrypoint - Entrypoint specified for the builder
 * @property {string} workPath - Working directory for this build
 * @property {object} config - User forwarded configuration
 */

/**
 * @param {BuildParamsType} buildParams
 * @returns {Promise<Files>}
 */
exports.build = async ({ files, entrypoint, workPath, config }) => {
  /* Validate entrypoint and configuration */

  if (!/package\.json$/.exec(entrypoint)) {
    throw new Error(
      'Specified "src" for "@maticzav/now-probot" has to be "package.json"',
    )
  }

  if (!config.appId || !config.webhookSecret || !config.privateKey) {
    throw new Error('Missing probot configuration.')
  }

  /* Download files */

  const userPath = path.join(workPath, 'user')

  console.log('downloading user files...')
  const downloadedFiles = await download(files, userPath)

  /* Load apps */

  console.log('loading apps...')

  const packageJsonPath = downloadedFiles['package.json'].fsPath
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))

  if (!packageJson.probot || !packageJson.probot.apps) {
    throw new Error('No applications found in the definition file.')
  }

  const apps = packageJson.probot.apps

  /**
   * User files
   *
   * Filter out user files which pack the apps
   * in the configuration.
   */
  const appFiles = Object.keys(downloadedFiles).filter(path =>
    apps.some(app => new RegExp(app).exec(path)),
  )

  /**
   * NPM modules
   *
   * Include the apps pointing to node_modules.
   */
  const appModules = apps.filter(app =>
    Object.keys(downloadedFiles).every(path => !new RegExp(app).exec(path)),
  )

  // TODO: Check missing appModules

  /**
   * Builder should find the files for the bot and compile them.
   * require() should be able to pick the rest from node_modules.
   */

  /* Load dependenies */

  console.log('running npm install for user...')
  const entrypointFsDirname = path.join(userPath, path.dirname(entrypoint))
  await runNpmInstall(entrypointFsDirname, ['--prefer-offline'])

  /* Load ncc */

  const nccPath = path.join(workPath, 'ncc')

  console.log('writing ncc package.json...')
  await download(
    {
      'package.json': new FileBlob({
        data: JSON.stringify({
          dependencies: {
            '@zeit/ncc': '0.6.0',
          },
        }),
      }),
    },
    nccPath,
  )

  console.log('loading ncc...')
  await runNpmInstall(nccPath, ['--prefer-offline'])

  /* Load probot */

  const probotPath = path.join(workPath, 'probot')

  console.log('writing probot package.json...')
  await download(
    {
      'package.json': new FileBlob({
        data: JSON.stringify({
          dependencies: {
            probot: '7.5.0',
          },
        }),
      }),
    },
    probotPath,
  )

  console.log('loading probot...')
  await runNpmInstall(probotPath, ['--prefer-offline'])

  /* Compiling apps */

  console.log(`compiling ${appFiles.length} of ${apps.length} probot apps`)

  const compiledApplications = await appFiles.reduce(async (acc, app) => {
    const compiled = await compile(nccPath, downloadedFiles, app)
    return { ...acc, ...compiled }
  }, Promise.resolve({}))

  /* Create Launcher */

  console.log(`creating launcher`)

  const launcherPath = path.join(__dirname, 'launcher.js')
  let launcherData = await readFile(launcherPath, 'utf8')

  const appFilesImports = appFiles.map(app => `require("./${app}")`).join(',')
  const appModulesImports = appModules.map(app => `require("${app}")`).join(',')

  launcherData = launcherData.replace(
    '// PLACEHOLDER',
    `
process.chdir("./user")

apps = [
  ${appFilesImports ? `${appFilesImports},` : ''}
  ${appModulesImports ? `${appModulesImports},` : ''}
  require('probot/lib/apps/default'),
  require('probot/lib/apps/sentry'),
  require('probot/lib/apps/stats'),
]
`,
  )

  /* Create Lambda */

  console.log('creating lambda')

  /**
   * All files for lambda should be moved to a launcher.js directory
   * so that launcher can access all the files.
   */

  const probotFiles = await glob('node_modules/**', probotPath)
  const userNodeModulesFiles = await glob('node_modules/**', userPath)

  const launcherFiles = {
    'launcher.js': new FileBlob({ data: launcherData }),
    'bridge.js': new FileFsRef({ fsPath: require('@now/node-bridge') }),
  }

  const lambda = await createLambda({
    files: {
      ...userNodeModulesFiles,
      ...probotFiles,
      ...compiledApplications,
      ...launcherFiles,
    },
    handler: 'launcher.launcher',
    runtime: 'nodejs8.10',
    environment: {
      APP_ID: config.appId,
      WEBHOOK_SECRET: config.webhookSecret,
      PRIVATE_KEY: config.privateKey,
      SENTRY_DSN: config.sentryDsn,
    },
  })

  console.log('lambda created')

  return { 'index.js': lambda }
}

exports.config = {
  maxLambdaSize: '15mb',
}

/* Helper functions */

async function compile(workNccPath, downloadedFiles, entrypoint) {
  /* Get file */
  const input = downloadedFiles[entrypoint].fsPath

  /* Compile */
  const ncc = require(path.join(workNccPath, 'node_modules/@zeit/ncc'))
  const { code, assets } = await ncc(input, {
    minify: true,
  })

  /* Files with application blob */
  const preparedFiles = {
    [entrypoint]: new FileBlob({ data: code }),
  }

  /* Load remaining assets */
  const files = Object.keys(assets).reduce((acc, assetName) => {
    const assetPath = path.join(path.dirname(entrypoint), assetName)

    return {
      ...acc,
      [assetPath]: new FileBlob({ data: assets[assetName] }),
    }
  }, preparedFiles)

  return files
}
