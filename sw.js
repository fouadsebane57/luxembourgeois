/* ===================================================================
   SERVICE WORKER · LULU TRAJET 5.1.0

   Problème traité ici : sur iPhone, une PWA installée peut continuer à
   servir un ancien config.js ou un ancien fichier JavaScript pendant
   des jours. L'utilisateur corrige sa configuration et ne voit aucun
   changement, ce qui rend tout diagnostic impossible.

   Stratégie retenue, par nature de fichier :

     config.js         RÉSEAU SEUL, jamais de cache.
                       Une configuration périmée est pire qu'une absence.
     cours.js, HTML,
     modules, styles   réseau d'abord, cache de secours si hors ligne
     icônes, client
     Supabase          cache d'abord, ils ne changent qu'avec la version
     backend, tiers    jamais interceptés

   Le nom du cache contient la version. Un changement de version efface
   donc tout l'ancien cache à l'activation.
   =================================================================== */

const VERSION = "5.1.0";
const CACHE = `lulu-v${VERSION}`;

/** Jamais mis en cache. Toujours pris sur le réseau. */
const RESEAU_SEUL = ["/config.js"];

/** Ne change qu'avec la version : cache d'abord. */
const FIGE = [
  "icon-192.png", "icon-512.png", "icon-180.png", "icon-32.png",
  "icon-maskable-192.png", "icon-maskable-512.png", "favicon.png",
  "src/vendor/supabase.esm.js"
];

const COQUILLE = [
  "./", "./index.html", "./styles.css", "./cours.js",
  "./cours.legacy-map.json", "./manifest.webmanifest",
  "./src/app.js",
  "./src/core/config.js", "./src/core/content.js", "./src/core/state.js",
  "./src/core/scheduler.js", "./src/core/session.js", "./src/core/migrate.js",
  "./src/audio/tts.js", "./src/audio/mic.js", "./src/audio/vad.js", "./src/audio/recorder.js",
  "./src/audio/rythme.js",
  "./src/speech/normalize.js", "./src/speech/score.js", "./src/speech/engine.js",
  "./src/speech/erreurs.js",
  "./src/data/supabase.js", "./src/data/sync.js",
  "./src/ui/render.js", "./src/ui/diagnostic.js", "./src/ui/commandes.js",
  "./src/vendor/supabase.esm.js",
  "./icon-192.png", "./icon-512.png", "./icon-180.png", "./favicon.png",
  "./legal.html", "./privacy.html", "./terms.html"
];

const estReseauSeul = (chemin) => RESEAU_SEUL.some((f) => chemin.endsWith(f));
const estFige = (chemin) => FIGE.some((f) => chemin.endsWith("/" + f) || chemin.endsWith(f));

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Chaque ressource est demandée avec la version, pour ne jamais
    // récupérer une copie intermédiaire mise en cache par le navigateur.
    await Promise.allSettled(
      COQUILLE.map((u) => c.add(new Request(`${u}${u.includes("?") ? "&" : "?"}v=${VERSION}`, { cache: "reload" })))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const cles = await caches.keys();
    await Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
    // On prévient les onglets ouverts : ils peuvent proposer un rechargement.
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((c) => c.postMessage({ type: "VERSION_ACTIVE", version: VERSION }));
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // backend et tiers : intacts

  // 1. Configuration : réseau seul. Aucune mise en cache, jamais.
  if (estReseauSeul(url.pathname)) {
    e.respondWith((async () => {
      try {
        return await fetch(new Request(req.url, { cache: "no-store" }));
      } catch (_) {
        return new Response(
          "/* config.js indisponible hors ligne */ window.LULU_CONFIG = window.LULU_CONFIG || null;",
          { headers: { "Content-Type": "application/javascript" } }
        );
      }
    })());
    return;
  }

  // 2. Navigation : réseau d'abord, page en cache si hors ligne.
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const preload = await e.preloadResponse;
        const r = preload || await fetch(req);
        const c = await caches.open(CACHE);
        c.put("./index.html", r.clone());
        return r;
      } catch (_) {
        return (await caches.match("./index.html", { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }

  // 3. Ressources figées : cache d'abord.
  if (estFige(url.pathname)) {
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

  // 4. Le reste : réseau d'abord, cache de secours.
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    } catch (_) {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      return new Response("Ressource indisponible hors ligne.", { status: 503 });
    }
  })());
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING" || e.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (e.data?.type === "VIDER_CACHE") {
    e.waitUntil(caches.keys().then((k) => Promise.all(k.map((x) => caches.delete(x)))));
  }
});
