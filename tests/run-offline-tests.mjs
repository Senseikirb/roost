import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// Exercise the production worker, including lifecycle promises. No copied SW logic.
const source = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const scope = "https://example.test/roost/";
const stores = new Map();
const listeners = new Map();
let online = true;
let failTool = true;
let body = "shell version one";
let claimed = false;
let skipped = false;
let networkCalls = 0;
const requests = [];
let denyCache = false;
const cacheKey = (request) => typeof request === "string" ? request : request.url;
const caches = {
  async open(name) {
    if (denyCache) throw new Error('Cache storage disabled');
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      async put(request, response) { store.set(cacheKey(request), response.clone()); },
      async match(request) { return store.get(cacheKey(request))?.clone(); },
      async keys() { return [...store.keys()].map((url) => ({ url })); }
    };
  },
  async keys() { return [...stores.keys()]; },
  async delete(key) { return stores.delete(key); }
};
const self = {
  registration: { scope },
  location: new URL(`${scope}sw.js`),
  addEventListener(type, listener) { listeners.set(type, listener); },
  async skipWaiting() { skipped = true; },
  clients: { async claim() { claimed = true; } }
};
vm.runInNewContext(source, {
  self, caches, URL, Set, Promise, Response,
  fetch: async (request) => {
    networkCalls++;
    const url = cacheKey(request);
    requests.push(url);
    if (!online || (failTool && url.endsWith("iq-rfsoc-explorer.html"))) throw new Error("offline");
    return new Response(body, { status: 200 });
  }
});

async function lifecycle(name) {
  const pending = [];
  listeners.get(name)({ waitUntil(promise) { pending.push(promise); } });
  await Promise.all(pending);
}
function dispatch(url, { method = "GET", mode = "navigate", range = false } = {}) {
  const pending = [];
  let response;
  listeners.get("fetch")({
    request: { url, method, mode, headers: { has(name) { return name === "range" && range; } } },
    waitUntil(promise) { pending.push(promise); },
    respondWith(promise) { response = promise; }
  });
  return { response, settled: () => Promise.all(pending), pending };
}

await (await caches.open("other-app-data")).put("https://example.test/other/", new Response("other"));
await (await caches.open(`roost-shell:${scope}:v3`)).put(`${scope}index.html`, new Response("old"));
await (await caches.open("roost-shell-v3")).put("https://example.test/another-roost/index.html", new Response("other Roost"));
await lifecycle("install");
assert.ok(skipped, "optional tool failure must not prevent installation");
await lifecycle("activate");
assert.ok(claimed);
assert.ok(stores.has("other-app-data"), "must preserve unrelated application caches");
assert.ok(stores.has("roost-shell-v3"), "must preserve old caches belonging to another scope");
assert.ok(!stores.has(`roost-shell:${scope}:v3`), "must retire this installation's older cache");

for (const [url, options] of [
  ["https://external.test/index.html", {}],
  ["https://example.test/other/index.html", {}],
  [`${scope}unknown.html`, {}],
  [`${scope}index.html`, { method: "POST" }],
  [`${scope}icon-512.png`, { range: true }]
]) {
  assert.equal(dispatch(url, options).response, undefined, `must not intercept ${options.method || "GET"} ${url}`);
}

online = false;
const home = dispatch(`${scope}index.html?source=installed`);
assert.equal(await (await home.response).text(), "shell version one", "query-string navigation must find offline shell");
await home.settled();
const css = dispatch(scope + "roost-desk.css", { mode: "cors" });
assert.equal((await css.response).status, 200, "the desk stylesheet is available offline");
await css.settled();
const artwork = dispatch(scope + "roost-ridgeline.jpg", { mode: "cors" });
assert.equal((await artwork.response).status, 200, "masthead is cached for offline use");
await artwork.settled();
assert.ok(requests.every(url => !url.includes("?")), "static revalidation strips query parameters");
const tool = dispatch(`${scope}iq-rfsoc-explorer.html`);
assert.equal((await tool.response).status, 503);
assert.match(await (await tool.response).text(), /Back to The Roost/);
await tool.settled();
const cachedTool = dispatch(`${scope}roost-destination-finder.html`);
assert.equal((await cachedTool.response).status, 200, "successfully cached sibling tool works offline");
await cachedTool.settled();

online = true;
body = "shell version two";
const update = dispatch(`${scope}index.html`);
assert.equal(await (await update.response).text(), "shell version one", "cached shell returns immediately");
assert.equal(update.pending.length, 1, "background cache update is bound to worker lifetime");
await update.settled();
online = false;
const updatedHome = dispatch(`${scope}index.html`);
assert.equal(await (await updatedHome.response).text(), "shell version two", "next open uses refreshed shell");
await updatedHome.settled();
const rootHome = dispatch(scope);
assert.equal(await (await rootHome.response).text(), "shell version two", "root and index share updates");
await rootHome.settled();
online = true; denyCache = true;
const noCache = dispatch(scope);
assert.equal(await (await noCache.response).text(), "shell version two", "storage failure still serves the network");
await noCache.settled(); denyCache = false;
assert.ok(networkCalls > 0);

// A root installation must not claim an old cache from a sibling path.
self.registration.scope = "https://example.test/";
vm.runInNewContext(source, { self, caches, URL, Set, Promise, Response, fetch: async () => new Response("root shell") });
await lifecycle("activate");
assert.ok(stores.has("roost-shell-v3"), "root scope must preserve the sibling Roost's legacy cache");
assert.ok(stores.has(`roost-shell:${scope}:v7`), "root scope must preserve the sibling Roost's scoped cache");

console.log("PASS production service worker: scoped lifecycle, optional failure, request boundaries, offline shell/tools, revalidation lifetime");
