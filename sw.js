const VERSION = "letz-revolution-4.0.0";
const CORE = [
  "./",
  "./index.html",
  "./styles.css?v=4.0.0",
  "./app.js?v=4.0.0",
  "./config.js?v=4.0.0",
  "./cours.js?v=4.0.0",
  "./manifest.webmanifest?v=4.0.0",
  "./icon-192.png?v=4.0.0",
  "./icon-512.png?v=4.0.0",
  "./legal.html",
  "./privacy.html",
  "./terms.html"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(r => {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy)); return r;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => {
    const network = fetch(event.request).then(r => {
      if (r && r.ok) caches.open(VERSION).then(c => c.put(event.request, r.clone()));
      return r;
    }).catch(() => cached);
    return cached || network;
  }));
});
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
