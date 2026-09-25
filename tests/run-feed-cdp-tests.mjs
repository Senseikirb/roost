import assert from "node:assert/strict";
import { connectApp } from "./cdp-client.mjs";

const url = process.env.ROOST_FEED_APP_URL || "http://roost.localhost:8765/index.html";
const profile = {
  version: 1, profile: "runtime-test", completed: true, layoutApplied: true,
  data: { modules: { wire: true, today: true, workbench: true }, news: false, density: "comfort", visualMode: "default", starterSections: ["quick-access"] }
};
const seed = `if (!sessionStorage.getItem('feed-suite-seeded')) {
  localStorage.clear();
  localStorage.setItem('roost_onboarding_v1', ${JSON.stringify(JSON.stringify(profile))});
  localStorage.setItem('roost_settings_v1', JSON.stringify({headlines:false, newsMode:'all'}));
  sessionStorage.setItem('feed-suite-seeded','1');
}`;
const app = await connectApp({ url, seed });
const results = {};
try {
  // This dedicated test origin may have a shell from a previous development run.
  // Install the current worker normally before testing its actual offline cache.
  const scope = new URL("./", url).href;
  await app.evaluate(`(async () => {
    const scope = ${JSON.stringify(scope)};
    await Promise.all((await navigator.serviceWorker.getRegistrations()).filter(reg => reg.scope === scope).map(reg => reg.unregister()));
    await Promise.all((await caches.keys()).filter(key => key.startsWith('roost-shell:' + scope + ':')).map(key => caches.delete(key)));
  })()`);
  await app.send("Network.setBypassServiceWorker", { bypass: true });
  await app.navigate(url + "?validation-source=1");
  await app.send("Network.setBypassServiceWorker", { bypass: false });
  results.disabled = await app.evaluate(`(async () => {
    window.__originalFetch = window.fetch;
    window.__feedRequests = [];
    window.fetch = async function(url, opts) {
      window.__feedRequests.push(String(url));
      return new Response('<rss><channel><item><title>Fixture headline</title><link>https://example.test/story</link><pubDate>' + new Date().toUTCString() + '</pubDate></item></channel></rss>');
    };
    await roostTestHooks.fetchSection({label:'Off', feeds:['https://example.test/off.xml']}, {force:true});
    document.getElementById('news').scrollIntoView();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return window.__feedRequests.length === 0;
  })()`);
  assert.ok(results.disabled, "disabled headlines must not fetch through direct or lazy paths");

  results.sharedRequest = await app.evaluate(`(async () => {
    document.querySelector('[data-action="toggle-heads"]').click();
    await new Promise(resolve => setTimeout(resolve, 80));
    window.__feedRequests = [];
    window.fetch = async function(url) {
      window.__feedRequests.push(String(url));
      await new Promise(resolve => setTimeout(resolve, 30));
      return new Response('<rss><channel><item><title>Shared fixture</title><link>https://example.test/shared</link></item></channel></rss>');
    };
    const cfg = {label:'Shared', feeds:['https://example.test/shared.xml']};
    const lists = await Promise.all([roostTestHooks.fetchSection(cfg, {force:true}), roostTestHooks.fetchSection(cfg, {force:true})]);
    return window.__feedRequests.filter(url => url.includes(encodeURIComponent(cfg.feeds[0]))).length === 1 && lists.every(list => list.length === 1 && list[0]._feedLive);
  })()`);
  assert.ok(results.sharedRequest, "concurrent surfaces must share one source request");

  results.freshness = await app.evaluate(`(async () => {
    const urls = ['https://example.test/old-cache.xml','https://example.test/new-cache.xml'];
    urls.forEach((url,index) => localStorage.setItem(roostTestHooks.cacheKey(url), JSON.stringify({t:Date.now()-(index?1000:7200000),items:[{title:'Cache '+index, link:'https://example.test/cache-'+index}]})));
    // Fail refresh without discarding the valid old cache.
    window.fetch = async () => { throw new Error('fixture offline'); };
    const items = await roostTestHooks.fetchSection({label:'Mixed',feeds:urls},{preferCache:true});
    const old = items.find(item => item.title === 'Cache 0');
    const fresh = items.find(item => item.title === 'Cache 1');
    return /Stale/.test(roostTestHooks.feedFreshnessHtml(urls,old)) && /Cached/.test(roostTestHooks.feedFreshnessHtml(urls,fresh)) && roostTestHooks.feedCacheMeta(urls).stale;
  })()`);
  assert.ok(results.freshness, "one fresh source must not disguise an older source");

  results.parser = await app.evaluate(`(() => {
    const atom = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Safe &amp; clear</title><link rel="self" href="https://example.test/feed-entry.xml"/><link rel="alternate" href="https://example.test/article"/><summary>&lt;img src="https://untrusted.test/beacon" onerror="window.feedInjection=true"&gt;plain text</summary></entry><entry><title>Unsafe</title><link href="javascript:alert(1)"/></entry></feed>';
    const items = roostTestHooks.parseFeed(atom,'Fixture');
    return items.length === 1 && items[0].link === 'https://example.test/article' && items[0].desc === 'plain text' && !window.feedInjection && roostTestHooks.parseFeed('<broken>','bad').length === 0;
  })()`);
  assert.ok(results.parser, "untrusted Atom/RSS must select navigable links and inert plain text");

  results.corruptCache = await app.evaluate(`(async () => {
    const url = 'https://example.test/corrupt.xml';
    localStorage.setItem(roostTestHooks.cacheKey(url), JSON.stringify({t:Date.now(),items:{length:5}}));
    window.fetch = async () => { throw new Error('fixture offline'); };
    const items = await roostTestHooks.fetchSection({label:'Corrupt',feeds:[url]});
    return Array.isArray(items) && items.length === 0;
  })()`);
  assert.ok(results.corruptCache, "corrupt cache must fail locally without exceptions");

  results.wire = await app.evaluate(`(async () => {
    const buckets = roostTestHooks.effectiveWireFeeds();
    buckets.forEach((bucket,bucketIndex) => bucket.feeds.forEach((url,index) => localStorage.setItem(roostTestHooks.cacheKey(url), JSON.stringify({t:Date.now(),items:[
      {title:'Very old Wire fixture '+bucketIndex+' '+index,link:'https://example.test/old-'+bucketIndex+'-'+index,date:new Date(Date.now()-40*86400000).toISOString()},
      {title:'Future Wire fixture '+bucketIndex+' '+index,link:'https://example.test/future-'+bucketIndex+'-'+index,date:'2999-01-01'},
      {title:'Current Wire fixture '+bucketIndex+' '+index,link:'https://example.test/new-'+bucketIndex+'-'+index,date:new Date().toISOString()}
    ]}))));
    await roostTestHooks.loadWire({preferCache:true});
    const text = document.getElementById('roost-wire-grid').textContent;
    const recent = /Current Wire fixture/.test(text) && !/Very old Wire fixture|Future Wire fixture/.test(text);
    buckets.forEach(bucket => bucket.feeds.forEach(url => localStorage.removeItem(roostTestHooks.cacheKey(url))));
    window.fetch = async () => { throw new Error('unavailable'); };
    await roostTestHooks.loadWire({force:true});
    return recent && /Unavailable/.test(document.getElementById('roost-wire-grid').textContent) && !document.querySelector('.roost-wire').classList.contains('roost-hidden') && !!document.getElementById('roost-wire-refresh');
  })()`);
  assert.ok(results.wire, "Wire must filter old/future stories and retain a retry path when unavailable");

  results.cancel = await app.evaluate(`(async () => {
    let calls = 0, aborted = false;
    window.fetch = (url, opts) => {
      calls++;
      return Promise.resolve({ok:true, text:() => new Promise((resolve,reject) => {
        opts.signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted','AbortError')); });
      })});
    };
    const pending = roostTestHooks.fetchSection({label:'Pending',feeds:['https://example.test/pending.xml']},{force:true});
    await new Promise(resolve => setTimeout(resolve,0));
    document.querySelector('[data-action="toggle-heads"]').click();
    await pending;
    document.getElementById('security').scrollIntoView();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await roostTestHooks.loadSectionHeads(document.getElementById('news'),{force:true});
    window.fetch = window.__originalFetch;
    return calls === 1 && aborted;
  })()`);
  assert.ok(results.cancel, "turning headlines off must abort inflight work and prevent fallbacks");
  console.log("PASS feed fixtures: disabled, shared requests, freshness, Atom safety, corrupt cache, cancellation");

  results.serviceWorker = await app.evaluate(`(async () => {
    const registration = await Promise.race([navigator.serviceWorker.ready, new Promise((_,reject) => setTimeout(() => reject(new Error('SW readiness timeout')),10000))]);
    await new Promise(resolve => setTimeout(resolve,100));
    localStorage.setItem('roost_workbench_v1', JSON.stringify([{id:'offline-sentinel',title:'Preserved offline',body:'Local notes survive',method:'brainstorm'}]));
    return !!registration.active && !!navigator.serviceWorker.controller;
  })()`);
  assert.ok(results.serviceWorker, "real HTTP localhost registration must control the page");
  console.log("PASS real service worker registration");
  const expectedCards = await app.evaluate(`document.querySelectorAll('main .section:not(#pinned):not(#recent) .link-card').length`);
  await app.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await app.navigate(url + "?offline-test=1");
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await app.evaluate(`location.search === '?offline-test=1' && document.readyState === 'complete' && !!window.roostTestHooks`)) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  results.offlineReload = await app.evaluate(`({ cards:document.querySelectorAll('main .section:not(#pinned):not(#recent) .link-card').length, notePreserved:/offline-sentinel/.test(localStorage.getItem('roost_workbench_v1')), status:document.getElementById('roost-offline-status').textContent, online:navigator.onLine })`);
  assert.ok(results.offlineReload.cards === expectedCards && results.offlineReload.notePreserved && /External sites need a connection/.test(results.offlineReload.status), "offline reload must preserve shell and local notes: " + JSON.stringify(results.offlineReload));
  console.log("PASS offline reload and local data preservation");
  await app.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await app.evaluate(`navigator.serviceWorker.dispatchEvent(new Event('controllerchange'))`);
  results.updateNotice = await app.evaluate(`!!document.querySelector('[data-roost-reload]') && /newer app/.test(document.getElementById('roost-offline-status').textContent)`);
  assert.ok(results.updateNotice, "new worker activation must offer a deliberate reload");
  assert.deepEqual(app.errors, [], "no uncaught runtime errors");
  console.log(JSON.stringify({ results, runtimeErrors: app.errors }, null, 2));
} finally {
  await app.close();
}
