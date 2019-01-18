/**
 * Launcher expects all files to be accessible inside the current directory.
 * This includes probot, bride as well as application files which should be first processed
 * in build step and referenced during compilation.
 */

const { createProbot, ApplicationFunction } = require('probot')
const { findPrivateKey } = require('probot/lib/private-key')
const logRequestErrors = require('probot/lib/middleware/log-request-errors')
const { Bridge } = require('./now__bridge.js')

/* Setup bridge */

const bridge = new Bridge()
bridge.port = 3000

let apps = []

try {
  process.env.NODE_ENV = 'production'

  const cert = findPrivateKey()

  const probot = createProbot({
    id: parseInt(process.env.APP_ID, 10),
    secret: process.env.WEBHOOK_SECRET,
    cert: cert,
  })

  /* Load apps */

  // PLACEHOLDER

  process.on('unhandledRejection', probot.errorHandler)

  apps.forEach(appFn => probot.load(appFn))

  // Register error handler as the last middleware
  probot.server.use(logRequestErrors)

  /* Start the server */

  probot.server.listen(bridge.port)
} catch (err) {
  console.error(err)
}

exports.launcher = bridge.launcher
