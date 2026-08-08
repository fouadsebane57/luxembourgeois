/* ===================================================================
   TEST DE DÉMARRAGE

   Les autres tests couvrent la logique pure. Celui-ci vérifie que
   l'application démarre réellement : index.html chargé, cours.js
   évalué, modules ES importés, événements branchés, vues rendues.

   Sans lui, une erreur au chargement produirait une page blanche que
   seuls les tests terrain auraient détectée, après déploiement.

   Nécessite jsdom : npm install --no-save jsdom
   =================================================================== */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

let JSDOM;
try { ({ JSDOM } = await import("jsdom")); }
catch (_) {
  test("démarrage de l'application", { skip: "jsdom absent, lancer: npm install --no-save jsdom" }, () => {});
}

if (JSDOM) {
  const erreurs = [];
  const dom = await preparerDom();

  async function preparerDom() {
    const html = readFileSync(join(RACINE, "index.html"), "utf8");
    const d = new JSDOM(html, {
      url: "https://exemple.test/luxembourgeois/",
      pretendToBeVisual: true,
      runScripts: "outside-only"
    });
    const w = d.window;

    // Environnement navigateur absent de jsdom. On fournit le minimum,
    // volontairement inerte : aucun test ici ne touche au micro ni au réseau.
    w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    w.scrollTo = () => {};
    w.alert = () => {};
    w.confirm = () => false;
    w.fetch = async () => { throw new Error("réseau désactivé pendant le test"); };
    w.speechSynthesis = { getVoices: () => [], cancel() {}, speak() {}, speaking: false, pending: false };
    w.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    w.navigator.mediaDevices = undefined;
    w.MediaRecorder = undefined;
    Object.defineProperty(w.navigator, "onLine", { value: true, configurable: true });
    w.onerror = (msg) => erreurs.push(String(msg));
    w.addEventListener("unhandledrejection", (e) => erreurs.push(String(e.reason)));
    w.console.error = (...a) => erreurs.push(a.join(" "));

    // config.js et cours.js sont des scripts classiques, pas des modules.
    const ctx = vm.createContext(w);
    for (const f of ["config.example.js", "cours.js"]) {
      vm.runInContext(readFileSync(join(RACINE, f), "utf8"), ctx, { filename: f });
    }

    // Les modules ES sont importés par Node, puis raccordés au DOM simulé.
    // navigator et location sont en lecture seule sur globalThis dans Node.
    // On les redéfinit explicitement plutôt que par affectation.
    const poser = (nom, valeur) =>
      Object.defineProperty(globalThis, nom, { value: valeur, configurable: true, writable: true });
    for (const [nom, valeur] of Object.entries({
      window: w, document: w.document, navigator: w.navigator, location: w.location,
      localStorage: w.localStorage, fetch: w.fetch,
      SpeechSynthesisUtterance: w.SpeechSynthesisUtterance,
      speechSynthesis: w.speechSynthesis, MediaMetadata: class {}
    })) poser(nom, valeur);

    return d;
  }

  const url = (p) => pathToFileURL(join(RACINE, p)).href;

  test("le contenu se charge et expose 35 leçons", () => {
    const c = dom.window.LULU_CONTENT;
    assert.ok(c, "window.LULU_CONTENT absent");
    assert.equal(c.COURS.length, 35);
    assert.equal(c.contentVersion, "5.1.0");
  });

  test("toutes les expressions portent un identifiant permanent", () => {
    const ids = dom.window.LULU_CONTENT.COURS.flatMap((l) => l.i.map((i) => i.id));
    assert.equal(ids.length, 255);
    assert.ok(ids.every((i) => /^lx[0-9a-f]{8}$/.test(i)), "identifiant au mauvais format");
    assert.equal(new Set(ids).size, 248, "les 7 doublons doivent partager leur identifiant");
  });

  test("chaque leçon porte un identifiant unique", () => {
    const lids = dom.window.LULU_CONTENT.COURS.map((l) => l.lid);
    assert.equal(new Set(lids).size, 35);
  });

  test("les modules de contenu et d'état s'importent et s'accordent au DOM", async () => {
    const C = await import(url("src/core/content.js"));
    assert.equal(C.COURS().length, 35);
    assert.equal(C.itemsUniques().length, 248);
    assert.equal(C.items().length, 255);
    // Le vocabulaire de leçon alimente le biasing de la reconnaissance.
    assert.ok(C.vocabulaireLecon(0).length > 0);
  });

  test("l'état se charge sans progression préexistante", async () => {
    const S = await import(url("src/core/state.js"));
    await S.charger();
    assert.equal(S.state().schema, 5);
    assert.ok(S.state().sync.deviceId, "identifiant d'appareil non généré");
    assert.equal(S.state().settings.recognition, "auto");
  });

  test("une ancienne progression v4 est migrée au démarrage", async () => {
    const { CLE_V4, CLE_V5, CLE_SAUVEGARDE } = await import(url("src/core/migrate.js"));
    const map = JSON.parse(readFileSync(join(RACINE, "cours.legacy-map.json"), "utf8")).legacy;
    dom.window.localStorage.clear();
    dom.window.localStorage.setItem(CLE_V4, JSON.stringify({
      progress: { "0-0": { n: 5, seen: 9, day: 111 }, "0-1": { n: 2, seen: 3, day: 112 } },
      validated: { "0": true }, favorites: { "0-0": true },
      journal: { sessions: 4, minutes: 61, streak: 2, hist: {} }
    }));
    globalThis.localStorage = dom.window.localStorage;

    const S = await import(url("src/core/state.js") + "?migration");
    await S.charger();

    const r = S.migration();
    assert.equal(r.bloquee, false, "migration bloquée alors que la table est embarquée");
    assert.equal(r.source, "v4");
    assert.equal(r.traduites, 2);
    assert.equal(r.inconnues, 0);
    assert.ok(S.state().progress[map["0-0"]], "expression non retrouvée après migration");
    assert.equal(S.state().progress[map["0-0"]].production, 5);
    assert.equal(S.state().journal.sessions, 4);
    // La sauvegarde d'origine doit rester intacte, base du retour arrière.
    assert.ok(dom.window.localStorage.getItem(CLE_SAUVEGARDE), "sauvegarde v4 absente");
    assert.ok(dom.window.localStorage.getItem(CLE_V5), "état v5 non écrit");
  });

  test("REGRESSION : sans table de migration, l'ancienne progression n'est pas détruite", async () => {
    const { migrerLocal, CLE_V4 } = await import(url("src/core/migrate.js") + "?sansTable");
    const sauve = dom.window.LULU_LEGACY_MAP;
    delete dom.window.LULU_LEGACY_MAP;
    dom.window.localStorage.setItem(CLE_V4, JSON.stringify({ progress: { "0-0": { n: 5 } } }));

    const { etat, rapport } = migrerLocal(dom.window.LULU_CONTENT.COURS);
    // Aucune migration ne doit avoir lieu, et surtout aucun état vide écrit.
    assert.equal(rapport.bloquee, true, "la migration aurait dû être bloquée");
    assert.equal(etat, null);
    assert.ok(dom.window.localStorage.getItem(CLE_V4), "l'ancienne progression a été perdue");

    dom.window.LULU_LEGACY_MAP = sauve;
  });

  test("le pipeline vocal se dégrade proprement sans micro ni réseau", async () => {
    const M = await import(url("src/speech/engine.js"));
    const { VERDICT, EFFET } = await import(url("src/speech/score.js"));
    const item = { id: "lx00000001", lb: "Moien", fr: "bonjour", alt: [] };
    const r = await M.evaluerReponse(item, { moteur: "auto" });
    // Aucun micro disponible : l'application doit le dire, pas planter,
    // et surtout ne rien écrire dans la progression.
    assert.equal(r.verdict, VERDICT.MICRO);
    assert.equal(r.effet, EFFET.NONE);
    assert.ok(r.trace.length > 0, "aucune trace produite pour le diagnostic");
  });

  test("le diagnostic répond sans micro et sans réseau", async () => {
    const D = await import(url("src/ui/diagnostic.js"));
    const lignes = await D.controlesRapides();
    assert.ok(lignes.length >= 10, "diagnostic incomplet");
    for (const l of lignes) {
      assert.ok(l.nom, "ligne de diagnostic sans intitulé");
      assert.ok(["ok", "warn", "bad"].includes(l.etat), `état inattendu: ${l.etat}`);
      // Toute ligne en défaut doit dire quoi faire. C'est la règle
      // qui remplace les « À régler » muets de la 5.0.0.
      if (l.etat === "bad") assert.ok(l.detail, `ligne ${l.nom} en défaut sans explication`);
    }
  });

  test("les huit vues déclarées dans le HTML existent bien", () => {
    const vues = [...dom.window.document.querySelectorAll("[data-view]")].map((v) => v.dataset.view);
    for (const v of ["home", "learn", "courses", "practice", "progress", "voice", "premium", "account"]) {
      assert.ok(vues.includes(v), `vue manquante: ${v}`);
    }
  });

  test("aucune vue inactive n'est laissée visible aux lecteurs d'écran", () => {
    const vues = [...dom.window.document.querySelectorAll("section[data-view]")];
    const actives = vues.filter((v) => v.classList.contains("active"));
    assert.equal(actives.length, 1, "il doit y avoir exactement une vue active au chargement");
    for (const v of vues) {
      if (v.classList.contains("active")) continue;
      assert.ok(v.hasAttribute("hidden"), `vue ${v.dataset.view} non masquée`);
      assert.equal(v.getAttribute("aria-hidden"), "true");
    }
  });

  test("aucune erreur n'a été levée pendant tout le parcours", () => {
    const vraies = erreurs.filter((e) => !/réseau désactivé|Supabase|Not implemented/i.test(e));
    assert.deepEqual(vraies, [], "erreurs inattendues au démarrage");
  });
}
