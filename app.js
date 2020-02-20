const Vue = require('vue')
const server = require('express')()
const renderer = require('vue-server-renderer').createRenderer()
const Box = require('./components/office-layout')

server.get('*', (req, res) => {
  const app = new Vue({
    data: {
      boxes: [new Box(1,1,1,1,'abc')]
    },
    template: `<office-layout :boxes=boxes></office-layout>`
  })

  renderer.renderToString(app, (err, html) => {
    if (err) {
      res.status(500).end('Internal Server Error')
      return
    }
    res.end(`
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Hello</title></head>
        <body>${html}</body>
      </html>
    `)
  })
})

server.listen(8080)
