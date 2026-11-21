/* The Roost shell stays instant offline. Only this installation's known
   static assets are cached; feeds and external destinations need a network. */
const SCOPE = self.registration.scope;
const CACHE_PREFIX = "roost-shell:" + SCOPE + ":";
const CACHE = CACHE_PREFIX + "v7";
const HOME = new URL("./index.html", SCOPE).href;
const SHELL_CORE = ["./index.html", "./manifest.json", "./roost-desk.css"];
const SHELL_OPTIONAL = [
  "./icon-180.png", "./icon-192.png", "./icon-512.png", "./favicon-32.png",
  "./iq-rfsoc-explorer.html", "./roost-destination-finder.html", "./roost-ridgeline.jpg"
];
const SHELL_URLS = new Set(SHELL_CORE.concat(SHELL_OPTIONAL).map((path) => new URL(path, SCOPE).href));

SHELL_URLS.add(SCOPE);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    // Bypass the HTTP cache when a changed worker installs a new shell.
    await Promise.all(SHELL_CORE.map(async (path) => {
      const url = new URL(path, SCOPE).href;
      const response = await fetch(url, { cache: "reload", redirect: "error" });
      if (!response.ok) throw new Error("Roost shell unavailable");
      await cache.put(url, response);
    }));
    await Promise.all(SHELL_OPTIONAL.map(async (path) => {
      const url = new URL(path, SCOPE).href;
      try {
        const response = await fetch(url, { cache: "reload", redirect: "error" });
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
    status: 503, headers: {
      "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; base-uri 'none'; form-action 'none'",
      "Referrer-Policy": "no-referrer"
    }
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  if (!SHELL_URLS.has(url.href)) return;

  // The directory and index serve identical content. Revalidation needs only the static path.
  const asset = url.href === SCOPE ? HOME : url.href;
  const cachePromise = caches.open(CACHE).catch(() => null);
  const cachedPromise = cachePromise.then((cache) => cache && cache.match(asset)).catch(() => null);
  const networkPromise = fetch(asset, { redirect: "error", cache: "no-cache" }).then(async (response) => {
    if (response && response.status === 200 && !response.redirected) {
      // Cache failures must not discard a usable network response.
      try { const cache = await cachePromise; if (cache) await cache.put(asset, response.clone()); } catch (_) {}
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
      return offlineToolResponse();
    }
    return Response.error();
  }));
});
