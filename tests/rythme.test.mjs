/* L'analyse locale doit être utile SANS jamais prétendre juger
   la prononciation. Ces tests fixent les deux limites. */
import test from "node:test";
import assert from "node:assert/strict";
import { compterNoyaux, analyser, RYTHME, MS_PAR_SYLLABE } from "../src/audio/rythme.js";

/** Fabrique une enveloppe d'énergie : n bosses de `dureeSyl` ms. */
function enveloppe(n, dureeSyl = MS_PAR_SYLLABE, plancher = -60, sommet = -25) {
  const pas = 30, out = [];
  let t = 0;
  for (let s = 0; s < n; s++) {
    const pts = Math.round(dureeSyl / pas);
    for (let i = 0; i < pts; i++) {
      // Bosse : montée puis descente, creux marqué entre deux syllabes.
      const phase = i / Math.max(1, pts - 1);
      const forme = Math.sin(Math.PI * phase);
      out.push({ t, db: plancher + (sommet - plancher) * Math.max(0.05, forme) });
      t += pas;
    }
  }
  return out;
}

const seuil = -50;

test("les noyaux syllabiques sont comptés correctement", () => {
  for (const n of [1, 2, 3, 4, 5]) {
    const r = compterNoyaux(enveloppe(n), seuil);
    assert.ok(Math.abs(r.noyaux - n) <= 1,
      `${n} syllabes attendues, ${r.noyaux} comptées`);
  }
});

test("une enveloppe vide ne produit aucun noyau", () => {
  assert.equal(compterNoyaux([], seuil).noyaux, 0);
  assert.equal(compterNoyaux([{ t: 0, db: -90 }], seuil).noyaux, 0);
});

test("une réponse au bon rythme est validée", () => {
  const m = { enveloppe: enveloppe(3), seuilDb: seuil, dureeMs: 3 * MS_PAR_SYLLABE, fiable: true };
  const r = analyser(m, 3);
  assert.equal(r.verdict, RYTHME.BON);
  assert.equal(r.mesurable, true);
});

test("une réponse nettement trop courte est signalée", () => {
  const m = { enveloppe: enveloppe(1, 120), seuilDb: seuil, dureeMs: 120, fiable: true };
  assert.equal(analyser(m, 5).verdict, RYTHME.COURT);
});

test("une réponse nettement trop longue est signalée", () => {
  const m = { enveloppe: enveloppe(9), seuilDb: seuil, dureeMs: 9 * MS_PAR_SYLLABE, fiable: true };
  assert.equal(analyser(m, 2).verdict, RYTHME.LONG);
});

test("un apprenant lent n'est pas pénalisé", () => {
  // Deux fois plus lent que le modèle : tolérance volontaire.
  const m = { enveloppe: enveloppe(3, 480), seuilDb: seuil, dureeMs: 3 * 480, fiable: true };
  assert.equal(analyser(m, 3).verdict, RYTHME.BON);
});

test("REGLE : sans nombre de syllabes connu, rien n'est jugé", () => {
  const m = { enveloppe: enveloppe(3), seuilDb: seuil, dureeMs: 800, fiable: true };
  const r = analyser(m, null);
  assert.equal(r.verdict, RYTHME.INDETERMINE);
  assert.equal(r.mesurable, false);
});

test("REGLE : une mesure non fiable ne juge rien", () => {
  const m = { enveloppe: enveloppe(3), seuilDb: seuil, dureeMs: 800, fiable: false };
  assert.equal(analyser(m, 3).verdict, RYTHME.INDETERMINE);
});

test("LIMITE ASSUMÉE : le rythme ne distingue pas les mots", () => {
  // « fënnef » et « bébé » ont deux syllabes. L'analyse locale les
  // accepte toutes les deux. C'est pourquoi elle n'écrit jamais dans
  // la progression : seule l'auto-évaluation fait avancer.
  const m = { enveloppe: enveloppe(2), seuilDb: seuil, dureeMs: 2 * MS_PAR_SYLLABE, fiable: true };
  assert.equal(analyser(m, 2).verdict, RYTHME.BON);
});
