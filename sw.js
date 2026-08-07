/* Lëtzebuergesch am Auto · service worker V2 */
const VERSION = "lux-v2-20260807-1";
const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./cours.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

async function navigation(request) {
  const cache = await caches.open(VERSION);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4500))
    ]);
    if (response && response.ok) cache.put("./index.html", response.clone()).catch(() => {});
    return response;
  } catch (_) {
    return (await cache.match("./index.html", { ignoreSearch: true })) || Response.error();
  }
}

async function staticAsset(request) {
  const cache = await caches.open(VERSION);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3500))
    ]);
    if (response && response.ok && response.type === "basic") cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (_) {
    return (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true })) || Response.error();
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") event.respondWith(navigation(request));
  else event.respondWith(staticAsset(request));
});
