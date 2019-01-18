import * as probot from 'probot'

module.exports = (app: probot.Application): void => {
  app.on('issues.opened', async context => {
    // A new issue was opened, what should we do with it?
    context.log(context.payload)
  })
}
