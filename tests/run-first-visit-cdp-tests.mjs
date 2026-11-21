import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { connectApp } from './cdp-client.mjs';

const address = new URL(process.env.ROOST_APP_URL || 'http://127.0.0.1:8765/index.html');
address.hostname = 'welcome.localhost';
const seed = `if (!sessionStorage.getItem('started')) {
  localStorage.clear();
  sessionStorage.setItem('started', '1');
}`;
const screenshotDir = process.env.ROOST_SCREENSHOT_DIR;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const htmlHash = sha256(await readFile(new URL('../index.html', import.meta.url)));
const screenshots = [];

async function verifySource(app) {
  const { frameTree } = await app.send('Page.getResourceTree');
  assert.equal(frameTree.frame.url, address.href);
  const { content, base64Encoded } = await app.send('Page.getResourceContent', {frameId:frameTree.frame.id, url:address.href});
  const bytes = Buffer.from(content, base64Encoded ? 'base64' : 'utf8');
  assert.equal(sha256(bytes), htmlHash, 'browser must render the checked-out index.html');
}

async function captureDesk(app, width) {
  await app.evaluate(`(async () => {
    if (document.readyState !== 'complete') await new Promise(resolve => window.addEventListener('load', resolve, {once:true}));
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  })()`);
  const { data } = await app.send('Page.captureScreenshot', {format:'png', fromSurface:true, captureBeyondViewport:false});
  const png = Buffer.from(data, 'base64');
  assert.equal(png.readUInt32BE(16), width);
  assert.equal(png.readUInt32BE(20), 900);
  const name = `desk-${width}.png`;
  await mkdir(screenshotDir, {recursive:true});
  await writeFile(path.join(screenshotDir, name), png);
  screenshots.push({name, width, height:900, sha256:sha256(png)});
}

function completeSetupJourneys() {
  const key = 'roost_onboarding_v1';
  function prepare(name) {
    document.querySelector('.roost-customize-desk').click();
    const input = document.querySelector('[data-setup-field="displayName"]');
    input.value = name;
    input.dispatchEvent(new Event('input', {bubbles:true}));
    const next = document.querySelector('[data-setup-next]');
    for (let step = 0; step < 4; step++) next.click();
    return next;
  }
  const next = prepare('Local visitor');
  const previous = localStorage.getItem(key);
  const setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (item, value) {
    if (item === key) throw new DOMException('Fixture storage full', 'QuotaExceededError');
    return setItem.call(this, item, value);
  };
  try { next.click(); } finally { Storage.prototype.setItem = setItem; }
  const failedSafely = !!document.querySelector('#roost-setup.open') &&
    /could not save/i.test(document.getElementById('roost-setup-copy').textContent) &&
    localStorage.getItem(key) === previous;
  next.click();
  const savedProfile = JSON.parse(localStorage.getItem(key));
  const saved = savedProfile.completed && savedProfile.data.displayName === 'Local visitor' &&
    document.getElementById('greeting-text').textContent.includes('Local visitor');
  const stale = prepare('Stale visitor');
  savedProfile.data.displayName = 'Newer visitor';
  localStorage.setItem(key, JSON.stringify(savedProfile));
  stale.click();
  const keptNewer = !!document.querySelector('#roost-setup.open') &&
    /changed in another tab/i.test(document.getElementById('roost-setup-copy').textContent) &&
    JSON.parse(localStorage.getItem(key)).data.displayName === 'Newer visitor';
  return {failedSafely, saved, keptNewer};
}

for (const width of [320, 390, 1440]) {
  const app = await connectApp({ url:address.href, width, seed });
  try {
    await verifySource(app);
    const desk = await app.evaluate(`({
      fits: document.documentElement.scrollWidth <= innerWidth,
      starter: document.body.dataset.homeSurface === 'desk',
      open: !!document.querySelector('#roost-setup.open'),
      customize: !!document.querySelector('.roost-customize-desk')?.getBoundingClientRect().height,
      stylesLoaded: [...document.styleSheets].some(sheet => sheet.href?.endsWith('/roost-desk.css') && sheet.cssRules.length)
    })`);
    assert.deepEqual(desk, {fits:true, starter:true, open:false, customize:true, stylesLoaded:true});
    if (screenshotDir && width !== 320) await captureDesk(app, width);
    assert.ok(await app.evaluate(`localStorage.getItem('roost_onboarding_v1')`), 'fresh local starter must persist');
    await app.navigate(address.href);
    assert.equal(await app.evaluate(`!!document.querySelector('#roost-setup.open')`), false);
    const started = await app.evaluate(`localStorage.getItem('roost_onboarding_v1')`);
    const heading = await app.evaluate(`(() => {
      const button = document.querySelector('.roost-customize-desk');
      button.focus(); button.click();
      return document.activeElement.id;
    })()`);
    assert.equal(heading, 'roost-setup-title');
    await app.send('Input.dispatchKeyEvent', {type:'keyDown', key:'Tab', code:'Tab', modifiers:8, windowsVirtualKeyCode:9});
    await app.send('Input.dispatchKeyEvent', {type:'keyUp', key:'Tab', code:'Tab', modifiers:8, windowsVirtualKeyCode:9});
    assert.equal(await app.evaluate(`document.activeElement.hasAttribute('data-setup-next')`), true,
      'reverse Tab from the setup heading stays inside the dialog');
    await app.evaluate(`(() => {
      const name = document.querySelector('[data-setup-field="displayName"]');
      name.value = 'Unsaved visitor';
      name.dispatchEvent(new Event('input', {bubbles:true}));
      document.querySelector('[data-setup-next]').click();
    })()`);
    await app.send('Input.dispatchKeyEvent', {type:'keyDown', key:'Escape', code:'Escape', windowsVirtualKeyCode:27});
    await app.send('Input.dispatchKeyEvent', {type:'keyUp', key:'Escape', code:'Escape', windowsVirtualKeyCode:27});
    assert.equal(await app.evaluate(`!!document.querySelector('#roost-setup.open')`), false);
    assert.equal(await app.evaluate(`document.activeElement.matches('.roost-customize-desk')`), true);
    assert.deepEqual(JSON.parse(await app.evaluate(`localStorage.getItem('roost_onboarding_v1')`)), JSON.parse(started));
    if (width === 390) {
      const setup = await app.evaluate(`(${completeSetupJourneys.toString()})()`);
      assert.deepEqual(setup, {failedSafely:true, saved:true, keptNewer:true});
      await app.navigate(address.href);
      assert.equal(await app.evaluate(`document.getElementById('greeting-text').textContent.includes('Newer visitor')`), true);
    }
    const contacted = app.requests.filter(url => /^https?:/.test(url)).map(url => new URL(url).origin);
    assert.deepEqual([...new Set(contacted)].filter(origin => origin !== address.origin), [], 'new desk should contact only the site origin');
    assert.deepEqual(app.errors, []);
    console.log(`PASS checked-out desk, first visit, no external requests, reload and setup at ${width}px`);
  } finally {
    await app.close();
  }
}
if (screenshotDir) {
  const manifest = {commit:process.env.GITHUB_SHA || null, indexSha256:htmlHash, screenshots};
  await writeFile(path.join(screenshotDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}
