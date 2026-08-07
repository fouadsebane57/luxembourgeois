/* Service worker : rend l'application utilisable hors ligne.
   Change le numero de version quand tu modifies un fichier. */
const VERSION = "lux-v1";
const FICHIERS = [
  "./",
  "./index.html",
  "./cours.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(k => Promise.all(k.filter(x => x !== VERSION).map(x => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(rep => {
      if (rep) return rep;
      return fetch(e.request).then(net => {
        const copie = net.clone();
        caches.open(VERSION).then(c => c.put(e.request, copie)).catch(() => {});
        return net;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
