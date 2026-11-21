import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { connectApp } from './cdp-client.mjs';

const types = {
  'index.html': 'text/html; charset=utf-8',
  'sw.js': 'text/javascript',
  'manifest.json': 'application/manifest+json',
  'roost-desk.css': 'text/css',
  'roost-ridgeline.jpg': 'image/jpeg',
  'icon-180.png': 'image/png', 'icon-192.png': 'image/png', 'icon-512.png': 'image/png', 'favicon-32.png': 'image/png',
  'iq-rfsoc-explorer.html': 'text/html; charset=utf-8', 'roost-destination-finder.html': 'text/html; charset=utf-8'
};
const assets = new Map();
for (const [name, type] of Object.entries(types)) {
  assets.set('/roost/' + name, { type, bytes: await readFile(new URL('../' + name, import.meta.url)) });
}
const html = assets.get('/roost/index.html').bytes.toString('utf8');
const worker = assets.get('/roost/sw.js').bytes.toString('utf8');
const oldWorker = worker.replace('const CACHE = CACHE_PREFIX + ', 'const CACHE = CACHE_PREFIX + "test-previous-" + ');
assert.notEqual(oldWorker, worker, 'the fixture needs two distinct generations of the production worker');
let release = 'previous';
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  const file = pathname === '/roost/' ? '/roost/index.html' : pathname;
  const asset = assets.get(file);
  if (!asset || req.method !== 'GET') { res.writeHead(404).end(); return; }
  let bytes = asset.bytes;
  if (file === '/roost/index.html') bytes = html.replace('<html ', '<html data-upgrade-fixture="' + release + '" ');
  if (file === '/roost/sw.js' && release === 'previous') bytes = oldWorker;
  res.writeHead(200, { 'Content-Type': asset.type, 'Cache-Control': 'no-store' }).end(bytes);
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const url = 'http://127.0.0.1:' + server.address().port + '/roost/';
let app;
async function waitFor(expression, message) {
  const end = Date.now() + 12000;
  while (Date.now() < end) {
    // A deliberate reload briefly invalidates the previous execution context.
    try { if (await app.evaluate(expression)) return; } catch {}
    await delay(60);
  }
  throw new Error(message);
}
try {
  app = await connectApp({ url });
  await app.send('Network.setBypassServiceWorker', { bypass: false });
  await waitFor('!!navigator.serviceWorker.controller', 'the first release did not control the page');
  assert.equal(await app.evaluate("document.documentElement.dataset.upgradeFixture"), 'previous');
  assert.equal(await app.evaluate("!!document.querySelector('[data-roost-reload]')"), false);

  const before = await app.evaluate(`(() => {
    document.querySelector('#roost-dock-toggle').click();
    document.querySelector('#roost-dock [data-action="workbench"]').click();
    document.querySelector('#wb-title').value = 'Upgrade check';
    const editor = document.querySelector('#wb-text');
    editor.value = 'Saved before release';
    editor.dispatchEvent(new Event('input', {bubbles:true}));
    document.querySelector('#wb-save').click();
    editor.value = 'Draft held across worker activation';
    editor.dispatchEvent(new Event('input', {bubbles:true}));
    window.roostPreviousController = navigator.serviceWorker.controller;
    return JSON.parse(localStorage.getItem('roost_workbench_v1'))[0];
  })()`);
  assert.equal(before.body, 'Saved before release');

  release = 'current';
  await app.evaluate('(async () => { await (await navigator.serviceWorker.ready).update(); return true; })()');
  await waitFor("navigator.serviceWorker.controller !== window.roostPreviousController && !!document.querySelector('[data-roost-reload]')", 'new controller failed to offer reload');
  assert.equal(await app.evaluate("document.documentElement.dataset.upgradeFixture"), 'previous', 'activation must leave the open document intact');
  assert.equal(await app.evaluate("document.querySelector('#wb-text').value"), 'Draft held across worker activation');
  assert.deepEqual(await app.evaluate("JSON.parse(localStorage.getItem('roost_workbench_v1'))[0]"), before);
  assert.equal(await app.evaluate("(async () => (await caches.keys()).some(name => name.includes('test-previous-')))()"), false);

  await app.evaluate(`(() => {
    document.querySelector('#wb-save').click();
    document.querySelector('#roost-modal-x').click();
    setTimeout(() => document.querySelector('[data-roost-reload]').click(), 0);
    return true;
  })()`);
  await waitFor("document.documentElement.dataset.upgradeFixture === 'current' && !!window.roostTestHooks", 'Reload did not open the new app shell');
  assert.equal(await app.evaluate("!!document.querySelector('[data-roost-reload]')"), false);
  await app.send('Network.emulateNetworkConditions', {offline:true, latency:0, downloadThroughput:0, uploadThroughput:0});
  await app.navigate(url + '?upgraded-offline');
  assert.equal(await app.evaluate('document.documentElement.dataset.upgradeFixture'), 'current');
  assert.equal(await app.evaluate('navigator.onLine'), false);
  const after = await app.evaluate("JSON.parse(localStorage.getItem('roost_workbench_v1'))[0]");
  assert.equal(after.id, before.id);
  assert.equal(after.body, 'Draft held across worker activation');
  assert.deepEqual(app.errors, []);
  console.log('PASS real worker takeover, uninterrupted draft, deliberate reload and updated offline home');
} finally {
  try { if (app) await app.close(); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
