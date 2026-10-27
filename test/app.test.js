const { test } = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const { JSDOM, VirtualConsole, requestInterceptor } = require('jsdom')
const { readFileSync } = require('node:fs')
const { createHash } = require('node:crypto')
const { createSSRApp, h } = require('vue')
const { renderToString } = require('@vue/server-renderer')
const { Box, OfficeLayout } = require('../components/office-layout')
const app = require('../app')

const vueUrl = `https://cdn.jsdelivr.net/npm/vue@${require('vue/package.json').version}/dist/vue.global.prod.js`
const vueSource = readFileSync(require.resolve('vue/dist/vue.global.prod.js'))

test('static Pages entry pins Vue to the installed version and integrity hash', () => {
  const dom = new JSDOM(readFileSync(require.resolve('../index.html'), 'utf8'))
  const script = dom.window.document.querySelector('script')
  assert.equal(script.src, vueUrl)
  assert.equal(script.integrity || script.getAttribute('integrity'),
    'sha384-' + createHash('sha384').update(vueSource).digest('base64'))
  assert.equal(script.crossOrigin, 'anonymous')
  dom.window.close()
})

test('SSR escapes labels and preserves geometry and rotation', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(OfficeLayout, {
      boxes: [new Box(2, 3, 2, 4, '<script>alert(1)</script>', 90)]
    })
  }))
  assert.match(html, /width="121" height="241"/)
  assert.match(html, /rotate\(90 80,160\)/)
  assert.match(html, /&lt;script&gt;/)
  const dom = new JSDOM(html)
  assert.equal(dom.window.document.querySelector('script'), null)
  dom.window.close()
})

test('HTTP routes and browser editor work with Vue 3', async (t) => {
  const server = app.listen(0, '127.0.0.1')
  t.after(() => new Promise(resolve => server.close(resolve)))
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  for (const route of ['/', '/nested/path']) {
    const response = await fetch(base + route)
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /text\/html/)
    assert.equal(response.headers.get('x-powered-by'), null)
    assert.match(await response.text(), /<svg[^>]*width="41"[^>]*height="41"/)
  }
  for (const route of ['/package.json', '/.git/config', '/node_modules/vue/package.json']) {
    const response = await fetch(base + route)
    assert.match(response.headers.get('content-type'), /text\/html/)
    assert.match(await response.text(), /<svg/)
  }
  const errors = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', error => errors.push(error.message))
  virtualConsole.on('error', (...args) => errors.push(args.join(' ')))
  const dom = await JSDOM.fromURL(base + '/index.html', {
    resources: {
      interceptors: [requestInterceptor(request => {
        if (request.url === vueUrl) {
          return new Response(vueSource, { headers: { 'content-type': 'application/javascript' } })
        }
      })]
    },
    runScripts: 'dangerously', virtualConsole
  })
  t.after(() => dom.window.close())
  if (dom.window.document.readyState !== 'complete') {
    await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }))
  }
  const { document, Event } = dom.window
  assert.match(document.querySelector('svg').textContent, /山田/)
  const textarea = document.querySelector('textarea')
  textarea.value = '2,3,2,4,<img src=x onerror=alert(1)>,90'
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  await dom.window.Vue.nextTick()
  assert.equal(document.querySelector('svg').getAttribute('width'), '121')
  assert.equal(document.querySelector('svg text').getAttribute('transform'), 'rotate(90 80,160)')
  assert.equal(document.querySelector('svg text').textContent, '<img src=x onerror=alert(1)>')
  assert.equal(document.querySelector('svg img'), null)
  textarea.value = ''
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  await dom.window.Vue.nextTick()
  assert.equal(document.querySelectorAll('svg text').length, 0)
  assert.equal(document.querySelector('svg').getAttribute('width'), '1')
  assert.deepEqual(errors, [])
  let limitedResponse
  for (let i = 0; i < 121; i++) {
    limitedResponse = await fetch(base + '/index.html')
    await limitedResponse.text()
    if (limitedResponse.status === 429) break
  }
  assert.equal(limitedResponse.status, 429)
  assert.ok(Number(limitedResponse.headers.get('retry-after')) > 0)
})
