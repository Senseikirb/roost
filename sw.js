/* Roost service worker — caches the app shell so the page (and its
   links) work offline. Live headlines still require a network + proxy;
   they degrade gracefully when offline. Bump CACHE to force an update. */
const CACHE = "roost-shell-v2";
const SHELL_CORE = [
  "./",
  "./index.html",
  "./manifest.json"
];
const SHELL_OPTIONAL = [
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./favicon-32.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) =>
        c.addAll(SHELL_CORE).then(() =>
          Promise.all(
            SHELL_OPTIONAL.map((url) =>
              fetch(url)
                .then((res) => (res && res.ok ? c.put(url, res) : null))
                .catch(() => null)
            )
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Never cache cross-origin (feeds/proxies/fonts) — go straight to network.
  if (url.origin !== self.location.origin) return;
  // App shell: cache-first, fall back to network, update cache in background.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
