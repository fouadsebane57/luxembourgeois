/* Séparation stricte : signaux non probants d'un côté, preuves de l'autre.
   Chaque test correspond à une règle refusée ou validée explicitement. */
import test from "node:test";
import assert from "node:assert/strict";
import * as P from "../src/core/preuve.js";

const preuveVraie = (dim = P.DIM.PRODUCTION, reussi = true, avecIndice = false) =>
  ({ dim, source: P.SOURCE.TRANSCRIPTION, reussi, avecIndice });

test("A · cent écoutes n'écrivent que deux compteurs", () => {
  let e = P.entreeVide();
  for (let i = 0; i < 100; i++) e = P.exposer(e);
  assert.equal(e.signaux.nombreExpositions, 100);
  assert.ok(e.signaux.dateDerniereExposition > 0);
  for (const d of P.DIMENSIONS) assert.equal(P.niveau(e, d), 0, `${d} a monté sur de l'écoute`);
  assert.equal(P.estSolide(e), false);
});

test("B · une auto-évaluation « facile » ne crée AUCUN niveau", () => {
  let e = P.entreeVide();
  for (let i = 0; i < 50; i++) e = P.noterAutoEvaluation(e, "easy");
  for (const d of P.DIMENSIONS) assert.equal(P.niveau(e, d), 0, `${d} a monté sur une déclaration`);
  // Elle est bien enregistrée, mais comme confiance déclarée.
  assert.equal(e.signaux.selfAssessment, "easy");
  assert.ok(e.signaux.confidenceDeclared > 0.5);
  assert.equal(e.signaux.nombreAutoEvaluations, 50);
});

test("B · l'auto-évaluation est refusée comme source de preuve", () => {
  const r = P.enregistrerPreuve(P.entreeVide(),
    { dim: P.DIM.RAPPEL, source: P.SOURCE.AUTO_EVALUATION, reussi: true });
  assert.equal(r.ecrit, false);
  assert.equal(r.raison, "source_non_probante");
});

test("C · le rythme local n'écrit dans aucune des six dimensions", () => {
  let e = P.entreeVide();
  for (let i = 0; i < 30; i++) {
    e = P.noterRythme(e, { attemptDetected: true, speechDurationMs: 800,
      rhythmSimilarity: 1, syllabicGroups: 3, localAudioQuality: 0.9 });
  }
  for (const d of P.DIMENSIONS) assert.equal(P.niveau(e, d), 0, `${d} a monté sur du rythme`);
  assert.equal(e.signaux.syllabicGroups, 3);
  assert.equal(e.signaux.nombreTentatives, 30);
  assert.equal(e.signaux.rhythmSimilarity, 1);
});

test("C · le rythme est refusé comme source de preuve", () => {
  const r = P.enregistrerPreuve(P.entreeVide(),
    { dim: P.DIM.PRODUCTION, source: P.SOURCE.RYTHME_LOCAL, reussi: true });
  assert.equal(r.ecrit, false);
  assert.equal(r.raison, "source_non_probante");
});

test("D · une transcription fiable prouve la production", () => {
  const r = P.enregistrerPreuve(P.entreeVide(), preuveVraie());
  assert.equal(r.ecrit, true);
  assert.ok(P.niveau(r.entree, P.DIM.PRODUCTION) > 0);
});

test("D · REGLE : la prononciation reste NON MESURÉE", () => {
  assert.equal(P.MESURABLE[P.DIM.PRONONCIATION], false);
  const r = P.enregistrerPreuve(P.entreeVide(), preuveVraie(P.DIM.PRONONCIATION));
  assert.equal(r.ecrit, false);
  assert.equal(r.raison, "dimension_non_mesurable");
  assert.equal(P.niveau(r.entree, P.DIM.PRONONCIATION), 0);
  assert.equal(P.etatDimension(P.DIM.PRONONCIATION), P.ETAT_DIM.NON_MESUREE);
});

test("D · une transcription correcte ne vaut pas prononciation juste", () => {
  let e = P.entreeVide();
  for (let i = 0; i < 10; i++) e = P.enregistrerPreuve(e, preuveVraie()).entree;
  assert.ok(P.niveau(e, P.DIM.PRODUCTION) >= P.NIVEAU_SOLIDE);
  assert.equal(P.niveau(e, P.DIM.PRONONCIATION), 0, "la prononciation ne doit jamais suivre");
});

test("une réussite sans indice progresse plus vite qu'avec indice", () => {
  const a = P.enregistrerPreuve(P.entreeVide(), preuveVraie(P.DIM.PRODUCTION, true, false)).entree;
  const b = P.enregistrerPreuve(P.entreeVide(), preuveVraie(P.DIM.PRODUCTION, true, true)).entree;
  assert.ok(P.niveau(a, P.DIM.PRODUCTION) > P.niveau(b, P.DIM.PRODUCTION));
});

test("les dimensions restent indépendantes", () => {
  const e = P.enregistrerPreuve(P.entreeVide(), preuveVraie(P.DIM.PRODUCTION)).entree;
  assert.equal(P.niveau(e, P.DIM.COMPREHENSION), 0);
  assert.equal(P.niveau(e, P.DIM.TRANSFERT), 0);
});

/* ---- Héritage ---- */

test("REGLE 4 · l'héritage n'est JAMAIS promu en maîtrise", () => {
  const e = P.normaliser({ comprehension: 7, production: 7, pronunciation: 7, seen: 90 });
  // Conservé intégralement…
  assert.equal(P.niveauHistorique(e, P.DIM.COMPREHENSION), 7);
  assert.equal(P.niveauGlobalHistorique(e), 7);
  assert.equal(e.legacy.seen, 90);
  // …mais aucune maîtrise vérifiée n'en découle.
  for (const d of P.DIMENSIONS) assert.equal(P.niveau(e, d), 0, `${d} promu depuis l'héritage`);
  assert.equal(P.estSolide(e), false);
});

test("REGRESSION · plus aucun max(legacy, nouveau)", () => {
  let e = P.normaliser({ comprehension: 7, production: 7 });
  e = P.enregistrerPreuve(e, preuveVraie(P.DIM.PRODUCTION)).entree;
  // Le niveau vérifié vaut exactement ce qui a été démontré, pas 7.
  assert.equal(P.niveau(e, P.DIM.PRODUCTION), 2);
  assert.notEqual(P.niveau(e, P.DIM.PRODUCTION), 7);
});

test("l'héritage sert uniquement à l'ordonnancement", () => {
  const jamaisVue = P.entreeVide();
  const dejaVue = P.normaliser({ comprehension: 2, production: 1, seen: 6 });
  const travaillee = P.normaliser({ comprehension: 6, production: 5, seen: 40 });
  assert.equal(P.familiariteHistorique(jamaisVue), 0);
  assert.equal(P.familiariteHistorique(dejaVue), 1);
  assert.equal(P.familiariteHistorique(travaillee), 2);
  // Aucune de ces valeurs n'est un niveau de maîtrise.
  assert.equal(P.niveauGlobal(travaillee), 0);
});

test("la fusion entre appareils ne fait baisser aucun niveau vérifié", () => {
  let a = P.entreeVide(), b = P.entreeVide();
  for (let i = 0; i < 3; i++) a = P.enregistrerPreuve(a, preuveVraie(P.DIM.PRODUCTION)).entree;
  b = P.enregistrerPreuve(b, preuveVraie(P.DIM.RAPPEL)).entree;
  const f = P.fusionner(a, b);
  assert.equal(P.niveau(f, P.DIM.PRODUCTION), P.niveau(a, P.DIM.PRODUCTION));
  assert.equal(P.niveau(f, P.DIM.RAPPEL), P.niveau(b, P.DIM.RAPPEL));
});

test("la fusion conserve les signaux les plus complets", () => {
  const a = P.noterAutoEvaluation(P.exposer(P.entreeVide()), "ok");
  const b = P.noterRythme(P.entreeVide(), { attemptDetected: true, syllabicGroups: 4 });
  const f = P.fusionner(a, b);
  assert.equal(f.signaux.selfAssessment, "ok");
  assert.equal(f.signaux.syllabicGroups, 4);
});
