/* Démarrage réel de l'application, SANS dépendance externe.
   Remplace l'ancien test qui exigeait jsdom et se retrouvait ignoré. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { installer } from "./helpers/dom.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = (p) => pathToFileURL(join(RACINE, p)).href;
const html = readFileSync(join(RACINE, "index.html"), "utf8");

const env = installer(html, { lisibles: ["audio/mp4"] });

// config.js n'est pas livré dans le ZIP : on charge le modèle.
const ctx = vm.createContext(env.window);
for (const f of ["config.example.js", "cours.js"]) {
  vm.runInContext(readFileSync(join(RACINE, f), "utf8"), ctx, { filename: f });
}

test("le contenu se charge et expose 35 leçons", () => {
  const c = env.window.LULU_CONTENT;
  assert.ok(c, "window.LULU_CONTENT absent");
  assert.equal(c.COURS.length, 35);
  assert.equal(c.contentVersion, "5.1.0");
});

test("toutes les expressions portent un identifiant permanent", () => {
  const ids = env.window.LULU_CONTENT.COURS.flatMap((l) => l.i.map((i) => i.id));
  assert.equal(ids.length, 255);
  assert.ok(ids.every((i) => /^lx[0-9a-f]{8}$/.test(i)));
  assert.equal(new Set(ids).size, 248, "les 7 doublons doivent partager leur identifiant");
});

test("la table de migration est embarquée, aucun appel réseau requis", () => {
  const m = env.window.LULU_LEGACY_MAP;
  assert.ok(m, "table de migration absente de cours.js");
  assert.equal(Object.keys(m).length, 255);
});

test("les modules de contenu s'importent et s'accordent au DOM", async () => {
  const C = await import(url("src/core/content.js"));
  assert.equal(C.COURS().length, 35);
  assert.equal(C.itemsUniques().length, 248);
  assert.equal(C.items().length, 255);
  assert.ok(C.vocabulaireLecon(0).length > 0);
});

test("l'état se charge et adopte le schéma courant", async () => {
  const S = await import(url("src/core/state.js"));
  await S.charger();
  assert.equal(S.state().schema, 6);
  assert.ok(S.state().sync.deviceId);
  assert.equal(S.state().settings.recognition, "auto");
});

test("une ancienne progression est migrée sans promotion en maîtrise", async () => {
  const { CLE_V4, CLE_SAUVEGARDE } = await import(url("src/core/migrate.js"));
  const { CLE_V6 } = await import(url("src/core/migration6.js"));
  const P = await import(url("src/core/preuve.js"));
  const map = env.window.LULU_LEGACY_MAP;

  env.window.localStorage.clear();
  env.window.localStorage.setItem(CLE_V4, JSON.stringify({
    progress: { "0-0": { n: 5, seen: 9, day: 111 }, "0-1": { n: 2, seen: 3, day: 112 } },
    validated: { "0": true }, favorites: { "0-0": true },
    journal: { sessions: 4, minutes: 61, streak: 2, hist: {} }
  }));

  const S = await import(url("src/core/state.js") + "?migration");
  await S.charger();

  const e = S.state().progress[map["0-0"]];
  assert.ok(e, "expression non retrouvée après migration");
  assert.ok(e.legacy, "héritage non conservé");
  assert.equal(P.niveauHistorique(e, P.DIM.RAPPEL), 5, "héritage perdu");
  assert.equal(P.niveau(e, P.DIM.RAPPEL), 0, "héritage promu à tort en maîtrise");
  assert.equal(P.familiariteHistorique(e), 2, "l'héritage doit servir à l'ordonnancement");
  assert.equal(S.state().journal.sessions, 4);
  assert.ok(env.window.localStorage.getItem(CLE_SAUVEGARDE), "sauvegarde absente");
  assert.ok(env.window.localStorage.getItem(CLE_V6), "état courant non écrit");
});

test("le diagnostic répond sans micro et sans réseau", async () => {
  const D = await import(url("src/ui/diagnostic.js"));
  const lignes = await D.controlesRapides();
  assert.ok(lignes.length >= 10, "diagnostic incomplet");
  for (const l of lignes) {
    assert.ok(l.nom, "ligne sans intitulé");
    assert.ok(["ok", "warn", "bad"].includes(l.etat), `état inattendu : ${l.etat}`);
    if (l.etat === "bad") assert.ok(l.detail, `ligne ${l.nom} en défaut sans explication`);
  }
});

test("les huit vues déclarées dans le HTML existent", () => {
  const vues = env.sections.map((s) => s.dataset.view);
  for (const v of ["home", "learn", "courses", "practice", "progress", "voice", "premium", "account"]) {
    assert.ok(vues.includes(v), `vue manquante : ${v}`);
  }
});

test("une seule vue est active, les autres sont masquées aux lecteurs d'écran", () => {
  const actives = env.sections.filter((s) => s.classList.contains("active"));
  assert.equal(actives.length, 1);
  for (const s of env.sections) {
    if (s.classList.contains("active")) continue;
    assert.ok(s.hasAttribute("hidden"), `vue ${s.dataset.view} non masquée`);
    assert.equal(s.getAttribute("aria-hidden"), "true");
  }
});

test("tous les identifiants utilisés par le code existent dans le HTML", () => {
  const js = ["src/app.js", "src/ui/render.js", "src/ui/diagnostic.js"]
    .map((f) => readFileSync(join(RACINE, f), "utf8")).join("\n");
  const utilises = [...new Set([...js.matchAll(/\$\("([A-Za-z][\w-]*)"\)/g)].map((m) => m[1]))];
  const dynamiques = new Set(["replayTestBtn"]);
  const manquants = utilises.filter((u) => !env.ids.includes(u) && !dynamiques.has(u));
  assert.deepEqual(manquants, [], "identifiants absents du HTML");
});

test("aucun attribut data n'est laissé sans traitement", () => {
  const js = ["src/app.js", "src/ui/render.js", "src/ui/diagnostic.js"]
    .map((f) => readFileSync(join(RACINE, f), "utf8")).join("\n");
  const attrs = [...new Set([...html.matchAll(/data-([a-z-]+)=/g)].map((m) => m[1]))];
  const morts = attrs.filter((a) => {
    const camel = a.replace(/-(.)/g, (_, c) => c.toUpperCase());
    return !js.includes("data-" + a) && !js.includes("dataset." + camel);
  });
  assert.deepEqual(morts, [], "boutons morts détectés");
});
