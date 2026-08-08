import test from "node:test";
import assert from "node:assert/strict";
import { compare, verdictDe, seuilPour, VERDICT, EFFET } from "../src/speech/score.js";

const base = { engine: "cloud", error: "", errorKind: "none", speechDetected: true, speechMs: 1200, snrDb: 22 };
const evalue = (attendu, entendu, alt = [], extra = {}) =>
  verdictDe({ ...base, ...extra, match: compare(attendu, alt, [{ text: entendu, confidence: 0.9 }]) });

test("le seuil dépend de la longueur", () => {
  assert.ok(seuilPour("jo") > seuilPour("wéi geet et haut"));
  assert.equal(seuilPour("jo"), 0.90);
});

test("REGRESSION P1-1 faux positif : une phrase allemande n'est plus validée", () => {
  const r = evalue("Wann ech gelift", "Wann ich geliebt");
  assert.notEqual(r.verdict, VERDICT.CORRECT);
  assert.notEqual(r.effet, EFFET.UP_STRONG);
});

test("REGRESSION P1-1 faux négatif : un mot court bien dit reste accepté", () => {
  assert.equal(evalue("jo", "jo").verdict, VERDICT.CORRECT);
  assert.equal(evalue("Moien", "Moien").verdict, VERDICT.CORRECT);
  assert.equal(evalue("Moien", "moien.").verdict, VERDICT.CORRECT);
});

test("une réponse identique à un accent près est PROCHE, jamais fausse", () => {
  const r = evalue("gär", "gar");
  assert.equal(r.verdict, VERDICT.PROCHE);
  assert.equal(r.effet, EFFET.HOLD);
  assert.equal(r.fiable, true);
});

test("les alternatives validées dans les données sont acceptées", () => {
  const r = evalue("Moien", "Bonjour", ["Bonjour"]);
  assert.equal(r.verdict, VERDICT.CORRECT);
});

test("REGLE ABSOLUE : aucune panne technique ne fait baisser la progression", () => {
  const cas = [
    { errorKind: "mic", attendu: VERDICT.MICRO },
    { speechDetected: false, attendu: VERDICT.AUCUNE_PAROLE },
    { engine: "echo", attendu: VERDICT.SERVICE }
  ];
  for (const c of cas) {
    const r = verdictDe({ ...base, ...c, match: compare("Moien", [], []) });
    assert.equal(r.verdict, c.attendu, JSON.stringify(c));
    assert.equal(r.effet, EFFET.NONE);
  }
  const r2 = verdictDe({ ...base, errorKind: "service", match: null });
  assert.equal(r2.verdict, VERDICT.SERVICE);
  assert.equal(r2.effet, EFFET.NONE);
});

test("le navigateur ne peut jamais sanctionner", () => {
  const r = evalue("Wéi geet et", "voellig anders gesprochen hier", [], { engine: "browser" });
  assert.notEqual(r.effet, EFFET.DOWN);
  assert.equal(r.effet, EFFET.NONE);
});

test("le navigateur plafonne à probablement correct", () => {
  const r = evalue("Moien", "Moien", [], { engine: "browser" });
  assert.equal(r.verdict, VERDICT.PROBABLE);
  assert.equal(r.fiable, false);
});

test("un signal faible ne conclut jamais à une mauvaise prononciation", () => {
  const r = evalue("Wéi geet et", "brrr", [], { snrDb: 4, speechMs: 300 });
  assert.equal(r.verdict, VERDICT.INCERTAIN);
  assert.equal(r.effet, EFFET.NONE);
});

test("une vraie erreur, bien captée, est sanctionnée", () => {
  const r = evalue("Wéi geet et", "completement autre chose ici");
  assert.equal(r.verdict, VERDICT.RETRAVAILLER);
  assert.equal(r.effet, EFFET.DOWN);
});
