/* ===================================================================
   COMMANDES DE SÉANCE

   Pause, Reprendre, Suivant, Répéter, Quitter.

   Ces tests reproduisent le comportement réel de la boucle : ils
   utilisent la machine et les mêmes règles de décision que
   boucleSeance(). Le défaut corrigé ici est qu'un exercice interrompu
   par une pause était compté comme terminé, et que l'index avançait.
   =================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { installer } from "./helpers/dom.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = (p) => pathToFileURL(join(RACINE, p)).href;
installer("", { lisibles: ["audio/mp4"] });

globalThis.window.AudioContext = class {
  constructor() { this.state = "running"; }
  resume() { this.state = "running"; return Promise.resolve(); }
  createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  createAnalyser() { return { fftSize: 0, smoothingTimeConstant: 0, connect() {}, disconnect() {}, getFloatTimeDomainData() {} }; }
};
globalThis.AudioContext = globalThis.window.AudioContext;

const { creer, ETAT, MOTIF } = await import(url("src/audio/machine.js"));
const Micro = await import(url("src/audio/mic.js"));
const Sess = await import(url("src/core/session.js"));

const ISSUE = { TERMINE: "completed", PAUSE: "paused", SAUTE: "skipped", ABANDONNE: "aborted" };

/** Même règle de traduction que issueCourante() dans app.js. */
function issueDe(m) {
  const mo = m.motif();
  if (mo === MOTIF.PAUSE) return ISSUE.PAUSE;
  if (mo === MOTIF.SUIVANT) return ISSUE.SAUTE;
  if (mo === MOTIF.SORTIE || mo === MOTIF.SYSTEME) return ISSUE.ABANDONNE;
  return ISSUE.TERMINE;
}

const banc = () => {
  const lectures = [];
  const paroles = [];
  const m = creer({ lecteur: async (b) => { lectures.push(b); return { etat: "terminee", demarree: true, dureeMs: 300 }; } });
  return { m, lectures, paroles };
};

const items = Array.from({ length: 20 }, (_, i) => ({
  id: "lx" + String(i).padStart(8, "0"), lb: "mot" + i, fr: "m" + i, lesson: 0, stage: 1, syl: 1
}));

/* ---------- 1 · Pause à chaque étape ---------- */

const etapes = [
  ["la consigne", async (m) => { await m.direConsigne("Comment dis-tu : un ?"); }],
  ["l'attente", async (m) => { await m.direConsigne("x"); await m.attendreUtilisateur(0); }],
  ["l'enregistrement", async (m) => { await m.direConsigne("x"); await m.attendreUtilisateur(0); await m.capturerReponse({}); }],
  ["le retour", async (m) => { await m.direConsigne("x"); await m.attendreUtilisateur(0); await m.capturerReponse({}); await m.direRetour("Presque."); }],
  ["l'écho", async (m) => { await m.direConsigne("x"); await m.attendreUtilisateur(0); await m.capturerReponse({}); await m.direRetour("Presque."); await m.rejouerVoix({ size: 10, type: "audio/mp4" }); }],
  ["le modèle", async (m) => { await m.direConsigne("x"); await m.attendreUtilisateur(0); await m.capturerReponse({}); await m.direRetour("Presque."); await m.direModele("eent", "lb"); }]
];

for (const [nom, arriver] of etapes) {
  test(`PAUSE pendant ${nom} · l'exercice n'est pas compté comme terminé`, async () => {
    const { m } = banc();
    await m.demarrer();
    await arriver(m);

    assert.equal(await m.pause(), true);
    assert.equal(m.etat(), ETAT.PAUSE, "la machine doit être en pause");
    assert.equal(m.motif(), MOTIF.PAUSE);
    assert.equal(issueDe(m), ISSUE.PAUSE, "l'issue doit être « paused », pas « completed »");
    assert.equal(Micro.fluxOuvert(), false, "le micro doit être fermé en pause");
    assert.deepEqual(m.transitionsRefusees(), []);
    await m.terminer();
  });
}

/* ---------- 2 · Reprendre rejoue le MÊME exercice ---------- */

test("REPRENDRE · le même exercice recommence, l'index n'a pas bougé", async () => {
  const { m } = banc();
  const s = Sess.creerSeance({ mode: "repeat", dureeMinutes: 20, items, dialogues: [],
    progression: {}, leconCourante: 0, etapeCourante: 1, seed: 7 });
  Sess.demarrer(s, 0);

  const exA = Sess.prochain(s, 0);
  const idA = exA.it.id;
  await m.demarrer();
  await m.direConsigne("Comment dis-tu : " + exA.it.fr + " ?");

  // Pause pendant la consigne.
  await m.pause();
  const issue = issueDe(m);
  assert.equal(issue, ISSUE.PAUSE);

  // La boucle ne consomme PAS l'exercice sur une pause.
  const indexAvant = s.index;
  if (issue === ISSUE.TERMINE) Sess.terminerExercice(s, exA, 1000);
  assert.equal(s.index, indexAvant, "l'index a avancé malgré la pause");

  // Reprise : le même exercice est resservi.
  m.reprendre();
  m.reinitialiserMotif();
  const exB = Sess.prochain(s, 1000);
  assert.equal(exB.it.id, idA, "la reprise doit rejouer le MÊME exercice");
  assert.equal(issueDe(m), ISSUE.TERMINE, "le motif doit être remis à zéro");
  await m.terminer();
});

/* ---------- 3 · Suivant ---------- */

test("SUIVANT pendant la consigne · un seul exercice sauté, aucune preuve écrite", async () => {
  const { m } = banc();
  const s = Sess.creerSeance({ mode: "repeat", dureeMinutes: 20, items, dialogues: [],
    progression: {}, leconCourante: 0, etapeCourante: 1, seed: 7 });
  Sess.demarrer(s, 0);
  const ex = Sess.prochain(s, 0);
  const idSaute = ex.it.id;

  await m.demarrer();
  await m.direConsigne("x");
  assert.equal(await m.sauter(), true);
  assert.equal(issueDe(m), ISSUE.SAUTE);
  assert.equal(Micro.fluxOuvert(), false, "le micro doit être libéré");

  Sess.sauterExercice(s, ex);
  assert.equal(s.sautes, 1, "exactement un exercice sauté");
  const suivant = Sess.prochain(s, 1000);
  assert.notEqual(suivant.it.id, idSaute, "l'exercice suivant doit être différent");
  // Aucune durée n'a pollué l'estimation.
  assert.ok(s.historique.at(-1).saute === true);
  assert.equal(s.historique.at(-1).dureeMs, 0);
  await m.terminer();
});

test("SUIVANT pendant l'enregistrement · la capture est annulée, pas laissée en fond", async () => {
  const { m } = banc();
  await m.demarrer();
  await m.direConsigne("x");
  await m.attendreUtilisateur(0);
  const capture = m.capturerReponse({ attenteMaxMs: 3000 });
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(await m.sauter(), true);
  await capture;
  assert.equal(issueDe(m), ISSUE.SAUTE);
  assert.equal(Micro.fluxOuvert(), false, "aucune capture ne doit continuer derrière");
  await m.terminer();
});

test("DOUBLE APPUI SUIVANT · jamais deux exercices sautés", async () => {
  const { m } = banc();
  const s = Sess.creerSeance({ mode: "repeat", dureeMinutes: 20, items, dialogues: [],
    progression: {}, leconCourante: 0, etapeCourante: 1, seed: 7 });
  Sess.demarrer(s, 0);
  const ex = Sess.prochain(s, 0);

  await m.demarrer();
  await m.direConsigne("x");
  // Deux appels rapprochés : le motif reste « suivant », un seul saut.
  await Promise.all([m.sauter(), m.sauter()]);
  assert.equal(issueDe(m), ISSUE.SAUTE);
  // La boucle ne saute qu'une fois par tour, quel que soit le nombre d'appels.
  Sess.sauterExercice(s, ex);
  assert.equal(s.sautes, 1, `${s.sautes} sauts au lieu d'un`);
  await m.terminer();
});

/* ---------- 4 · Répéter ---------- */

test("RÉPÉTER pendant le modèle · autorisé", async () => {
  const { m } = banc();
  await m.demarrer();
  await m.direModele("eent", "lb");
  const r = await m.repeter();
  assert.equal(r.ok, true);
  assert.equal(m.etat(), ETAT.MODELE, "l'état ne doit pas changer");
  await m.terminer();
});

test("RÉPÉTER pendant l'enregistrement · REFUSÉ, jamais de voix sur le micro", async () => {
  const { m } = banc();
  await m.demarrer();
  await m.direConsigne("x");
  await m.attendreUtilisateur(0);
  const capture = m.capturerReponse({ attenteMaxMs: 2000 });
  await new Promise((r) => setTimeout(r, 60));

  const r = await m.repeter();
  assert.equal(r.ok, false, "la répétition doit être refusée pendant la capture");
  assert.equal(r.cause, "operation_en_cours");
  assert.ok([ETAT.ECOUTE, ETAT.ENREGISTREMENT].includes(r.etat));
  assert.ok(m.journal().some((l) => l.evt === "repetition_ignoree"),
    "le refus doit être tracé");
  await capture;
  await m.terminer();
});

test("RÉPÉTER pendant le traitement · refusé, un résultat est imminent", async () => {
  const { m } = banc();
  await m.demarrer();
  await m.direConsigne("x");
  await m.attendreUtilisateur(0);
  await m.capturerReponse({});
  assert.equal(m.etat(), ETAT.TRAITEMENT);
  const r = await m.repeter();
  assert.equal(r.ok, false);
  await m.terminer();
});

/* ---------- 5 · Enchaînements ---------- */

test("PAUSE puis QUITTER · tout est libéré, aucune activité résiduelle", async () => {
  const { m } = banc();
  const dep = await m.demarrer();
  await m.direConsigne("x");
  await m.pause();
  assert.equal(m.etat(), ETAT.PAUSE);

  await m.terminer("sortie");
  assert.equal(m.etat(), ETAT.REPOS);
  assert.equal(m.occupe(), false);
  assert.equal(m.vivant(dep.jeton), false);
  assert.equal(Micro.fluxOuvert(), false);
  assert.ok(m.journal().some((l) => l.evt === "liberation_complete"));
});

test("PAUSE, REPRENDRE, PAUSE à nouveau · aucun état incohérent", async () => {
  const { m } = banc();
  await m.demarrer();
  await m.direConsigne("x");

  assert.equal(await m.pause(), true);
  assert.equal(m.motif(), MOTIF.PAUSE);

  assert.equal(m.reprendre(), true);
  assert.equal(m.etat(), ETAT.ATTENTE);
  assert.equal(m.motif(), MOTIF.AUCUN, "le motif doit être effacé à la reprise");

  assert.equal(await m.pause(), true);
  assert.equal(m.etat(), ETAT.PAUSE);
  assert.equal(issueDe(m), ISSUE.PAUSE);
  assert.equal(Micro.fluxOuvert(), false);
  assert.deepEqual(m.transitionsRefusees(), []);
  await m.terminer();
});

test("REPRENDRE puis capture · le parcours reste valide après une pause", async () => {
  const { m } = banc();
  await m.demarrer();
  await m.direConsigne("x");
  await m.pause();
  m.reprendre();
  m.reinitialiserMotif();

  await m.capturerReponse({});
  assert.equal(m.etat(), ETAT.TRAITEMENT);
  await m.direRetour("Presque.");
  await m.rejouerVoix({ size: 10, type: "audio/mp4" });
  await m.direModele("eent", "lb", 0.85);
  assert.equal(m.etat(), ETAT.MODELE);
  assert.deepEqual(m.transitionsRefusees(), [], "aucune transition refusée après une pause");
  await m.terminer();
});

/* ---------- 6 · Assertions transversales ---------- */

test("un exercice sauté ne crée aucune preuve pédagogique", async () => {
  const P = await import(url("src/core/preuve.js"));
  // Un saut ne passe par aucune fonction d'écriture : l'entrée reste vierge.
  const e = P.entreeVide();
  for (const d of P.DIMENSIONS) assert.equal(P.niveau(e, d), 0);
  assert.equal(e.signaux.nombreExpositions, 0);
  assert.equal(P.estSolide(e), false);
});

test("aucune commande ne laisse deux séances actives", async () => {
  const { m } = banc();
  await m.demarrer();
  await m.direConsigne("x");
  await m.pause();
  const refus = await m.demarrer();
  assert.equal(refus.ok, false);
  assert.equal(refus.cause, "session_deja_active");
  await m.terminer();
});
