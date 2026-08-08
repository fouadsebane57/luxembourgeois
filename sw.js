/* ===================================================================
   SERVICE WORKER v5.0.0

   Stratégies différenciées, contrairement à la v4 qui appliquait la
   même règle à tout et pouvait servir du contenu périmé indéfiniment.

     coquille et code   : réseau d'abord, cache de secours
     ressources figées  : cache d'abord (icônes, client vendorisé)
     navigation         : réseau d'abord, index.html de secours
     tout le reste      : ignoré, y compris les appels réseau du backend
   =================================================================== */
const VERSION = "5.0.0";
const CACHE = `letz-v${VERSION}`;

const COQUILLE = [
  "./", "./index.html", "./styles.css", "./config.js", "./cours.js",
  "./cours.legacy-map.json", "./manifest.webmanifest",
  "./src/app.js",
  "./src/core/content.js", "./src/core/state.js", "./src/core/scheduler.js",
  "./src/core/session.js", "./src/core/migrate.js",
  "./src/audio/tts.js", "./src/audio/mic.js", "./src/audio/vad.js", "./src/audio/recorder.js",
  "./src/speech/normalize.js", "./src/speech/score.js", "./src/speech/engine.js",
  "./src/data/supabase.js", "./src/data/sync.js",
  "./src/ui/render.js", "./src/ui/diagnostic.js",
  "./src/vendor/supabase.esm.js",
  "./legal.html", "./privacy.html", "./terms.html"
];
const FIGE = ["./icon-192.png", "./icon-512.png", "./src/vendor/supabase.esm.js"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // addAll échoue en bloc si une seule ressource manque. On tolère les absences.
    await Promise.allSettled([...COQUILLE, ...FIGE].map((u) => c.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const cles = await caches.keys();
    await Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // backend et tiers : jamais interceptés

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        const c = await caches.open(CACHE);
        c.put("./index.html", r.clone());
        return r;
      } catch (_) {
        return (await caches.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  const chemin = url.pathname;
  const figee = FIGE.some((f) => chemin.endsWith(f.replace("./", "")));

  if (figee) {                                   // cache d'abord
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    })());
    return;
  }

  // réseau d'abord, cache de secours
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    } catch (_) {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      throw new Error("Ressource indisponible hors ligne.");
    }
  })());
});

self.addEventListener("message", (e) => { if (e.data === "SKIP_WAITING") self.skipWaiting(); });
