const fs = require('fs')
const path = require('path')

const {
  packAndDeploy,
  testDeployment,
} = require('./__utils__/test-deployment.js')

jest.setTimeout(2 * 60 * 1000)
let builderUrl

beforeAll(async () => {
  const builderPath = path.resolve(__dirname, '..')
  builderUrl = await packAndDeploy(builderPath)
  console.log('builderUrl', builderUrl)
})

const fixturesPath = path.resolve(__dirname, '__fixtures__')

// eslint-disable-next-line no-restricted-syntax
for (const fixture of fs.readdirSync(fixturesPath)) {
  // eslint-disable-next-line no-loop-func
  it(`should build ${fixture}`, async () => {
    await expect(
      testDeployment({ builderUrl }, path.join(fixturesPath, fixture)),
    ).resolves.toBe(undefined)
  })
}
