/* The Roost shell stays instant offline. Only this installation's known
   static assets are cached; feeds and external destinations need a network. */
const SCOPE = self.registration.scope;
const CACHE_PREFIX = "roost-shell:" + SCOPE + ":";
const CACHE = CACHE_PREFIX + "v4";
const SHELL_CORE = ["./", "./index.html", "./manifest.json"];
const SHELL_OPTIONAL = [
  "./icon-180.png", "./icon-192.png", "./icon-512.png", "./favicon-32.png",
  "./iq-rfsoc-explorer.html", "./roost-destination-finder.html"
];
const SHELL_URLS = new Set(SHELL_CORE.concat(SHELL_OPTIONAL).map((path) => new URL(path, SCOPE).href));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    // Bypass the HTTP cache when a changed worker installs a new shell.
    await Promise.all(SHELL_CORE.map(async (path) => {
      const url = new URL(path, SCOPE).href;
      const response = await fetch(url, { cache: "reload" });
      if (!response.ok) throw new Error("Roost shell unavailable");
      await cache.put(url, response);
    }));
    await Promise.all(SHELL_OPTIONAL.map(async (path) => {
      const url = new URL(path, SCOPE).href;
      try {
        const response = await fetch(url, { cache: "reload" });
        if (response.ok) await cache.put(url, response);
      } catch (_) { /* Optional tools must never prevent shell installation. */ }
    }));
    await self.skipWaiting();
  }));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then(async (keys) => {
    await Promise.all(keys.map(async (key) => {
      if (key === CACHE) return;
      if (key.startsWith(CACHE_PREFIX)) return caches.delete(key);
      // The old unscoped cache may belong to another Roost on this origin.
      if (/^roost-shell-v\d+$/.test(key)) {
        const requests = await (await caches.open(key)).keys();
        if (requests.length && requests.every((request) => SHELL_URLS.has(request.url.split("?")[0]))) {
          return caches.delete(key);
        }
      }
    }));
    await self.clients.claim();
  }));
});

function offlineToolResponse() {
  return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Roost: tool unavailable offline</title><h1>This tool is not saved offline yet</h1><p>Open it once online, then try again.</p><p><a href="./index.html">Back to The Roost</a></p></html>', {
    status: 503, headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  if (!SHELL_URLS.has(url.href)) return;

  const cachePromise = caches.open(CACHE);
  const cachedPromise = cachePromise.then((cache) => cache.match(url.href));
  const networkPromise = fetch(request).then(async (response) => {
    if (response && response.status === 200) {
      // Cache failures must not discard a usable network response.
      try { await (await cachePromise).put(url.href, response.clone()); } catch (_) {}
    }
    return response;
  }).catch(() => null);
  // Keep background revalidation alive after returning a cached response.
  event.waitUntil(networkPromise.then(() => undefined));
  event.respondWith(cachedPromise.then(async (cached) => {
    if (cached) return cached;
    const response = await networkPromise;
    if (response) return response;
    if (request.mode === "navigate") {
      if (url.href === SCOPE || url.href === new URL("index.html", SCOPE).href) {
        const cache = await cachePromise;
        const home = await cache.match(new URL("index.html", SCOPE).href) || await cache.match(SCOPE);
        if (home) return home;
      }
      return offlineToolResponse();
    }
    return Response.error();
  }));
});
