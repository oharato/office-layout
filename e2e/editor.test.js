const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { readFile } = require('node:fs/promises');
const { chromium } = require('playwright');
const app = require('../app');

test('Chromium: input validation, real PNG download, and export failures', async t => {
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await once(server, 'listening');
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Use the locked Vue build; test/app.test.js verifies its CDN URL and SRI.
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    path: require.resolve('vue/dist/vue.global.prod.js'), contentType: 'application/javascript'
  }));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  await page.goto(url);
  await page.locator('svg text').first().waitFor();
  const input = page.getByLabel('座席データ');
  const save = page.getByRole('button', { name: 'PNGで保存', exact: true });

  await t.test('sample downloads as a real PNG with the expected dimensions', async () => {
    const downloaded = page.waitForEvent('download');
    await save.click();
    const download = await downloaded;
    assert.equal(download.suggestedFilename(), 'office-layout.png');
    assert.equal(await download.failure(), null);
    const png = await readFile(await download.path());
    assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(png.readUInt32BE(16), 561);
    assert.equal(png.readUInt32BE(20), 401);
    assert.ok(png.length > 1000);
  });

  await t.test('bad rows do not hide valid seats and cannot be silently exported', async () => {
    for (const bad of ['abc,3,1,2,鈴木', ',3,1,2,鈴木', '1,3,-1,2,鈴木',
      '1,3,Infinity,2,鈴木', '1,3,1,2,鈴木,abc', '1,3,1,2', '1,3,1,2,鈴木,0,extra']) {
      await input.fill('1,1,1,2,山田\n' + bad);
      await page.getByText('2行目：', { exact: false }).waitFor();
      assert.equal(await page.locator('svg').getAttribute('width'), '41');
      assert.equal(await page.locator('svg text').count(), 1);
      await save.click();
      await page.getByText('有効な座席データを入力し、入力エラーを修正してから保存してください。').waitFor();
    }
  });

  await t.test('empty, too-wide, and excessive-area layouts are rejected', async () => {
    await input.fill('');
    await save.click();
    await page.getByText('有効な座席データを入力し、入力エラーを修正してから保存してください。').waitFor();
    for (const data of ['1,1,1000000,1,会議室', '1,1,150,150,会議室']) {
      await input.fill(data);
      await save.click();
      await page.getByText('PNGは各辺8192px以内、総画素数16,777,216以内で保存できます。座標やサイズを小さくしてください。').waitFor();
    }
  });

  for (const failure of ['decode', 'context', 'encode']) {
    await t.test(`${failure} failure is reported and the save button recovers`, async () => {
      await page.goto(url);
      await page.locator('svg text').first().waitFor();
      await page.evaluate(kind => {
        if (kind === 'decode') HTMLImageElement.prototype.decode = () => Promise.reject(new Error('test failure'));
        if (kind === 'context') HTMLCanvasElement.prototype.getContext = () => null;
        if (kind === 'encode') HTMLCanvasElement.prototype.toBlob = callback => callback(null);
      }, failure);
      await save.click();
      await page.getByText('PNGの保存に失敗しました。座席表を小さくするか、別のブラウザーでお試しください。').waitFor();
      assert.equal(await save.isEnabled(), true);
    });
  }
  assert.deepEqual(errors, []);
});
