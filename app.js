const { createSSRApp } = require('vue')
const server = require('express')()
const { renderToString } = require('@vue/server-renderer')
const { Box, OfficeLayout } = require('./components/office-layout')
const path = require('node:path')

server.disable('x-powered-by')
// Serve only public assets, never the repository or node_modules directory.
for (const file of ['index.html', 'index.js', 'textarea-data.js', 'components/office-layout.js']) {
  server.get('/' + file, (req, res) => res.sendFile(path.join(__dirname, file)))
}
server.get('/vendor/vue.global.prod.js', (req, res) => {
  res.sendFile(require.resolve('vue/dist/vue.global.prod.js'))
})

server.get('/{*path}', async (req, res) => {
  const app = createSSRApp({
    components: { OfficeLayout },
    data() {
      return { boxes: [new Box(1,1,1,1,'abc')] }
    },
    template: `<office-layout :boxes=boxes></office-layout>`
  })

  try {
    const html = await renderToString(app)
    res.type('html').send(`
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Hello</title></head>
        <body>${html}</body>
      </html>
    `)
  } catch {
    res.status(500).send('Internal Server Error')
  }
})

if (require.main === module) server.listen(8080)

module.exports = server
