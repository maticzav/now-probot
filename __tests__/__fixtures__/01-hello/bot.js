module.exports = app => {
  app.on('issues.opened', async context => {
    // A new issue was opened, what should we do with it?
    context.log(context.payload)
  })
}