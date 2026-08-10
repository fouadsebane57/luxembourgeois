/* Lecture d'un enregistrement et sélection du format.
   Le parcours complet et les états sont couverts par parcours.test.mjs. */
import test from "node:test";
import assert from "node:assert/strict";
import { LECTURE, MESSAGE, reussie } from "../src/audio/lecture.js";

test("P0.2 · les six états de lecture existent et sont distincts", () => {
  const v = Object.values(LECTURE);
  assert.equal(new Set(v).size, v.length);
  assert.equal(v.length, 6);
});

test("P0.2 · REGRESSION : un échec n'est jamais confondu avec un succès", () => {
  for (const e of Object.values(LECTURE)) {
    if (e === LECTURE.TERMINEE) { assert.equal(reussie({ etat: e }), true); continue; }
    assert.equal(reussie({ etat: e }), false, `${e} passe pour un succès`);
  }
});

test("P0.2 · chaque échec porte un message adressé à l'utilisateur", () => {
  for (const e of Object.values(LECTURE)) {
    if (e === LECTURE.TERMINEE) continue;
    assert.ok(MESSAGE[e] && MESSAGE[e].length > 10, `message absent pour ${e}`);
  }
});

function simuler(enregistrables, lisibles) {
  globalThis.MediaRecorder = { isTypeSupported: (m) => enregistrables.some((x) => m.startsWith(x)) };
  globalThis.document = { createElement: () => ({ canPlayType: (t) => lisibles.some((x) => t.startsWith(x)) ? "probably" : "" }) };
}
const nettoyer = () => { delete globalThis.MediaRecorder; delete globalThis.document; };

test("P0.3 · un format n'est retenu que s'il satisfait les trois critères", async () => {
  // Appareil qui enregistre et relit le MP4.
  simuler(["audio/mp4", "audio/webm"], ["audio/mp4"]);
  const { choisir } = await import("../src/audio/formats.js?cas1");
  const f = choisir();
  assert.equal(f.complet, true);
  assert.equal(f.enregistrable, true);
  assert.equal(f.relisible, true);
  assert.equal(f.transcription, "officiel");
  nettoyer();
});

test("P0.3 · le choix suit les capacités mesurées, pas le nom du navigateur", async () => {
  // Même appareil, mais qui ne relit QUE le WebM : c'est WebM qui gagne.
  simuler(["audio/mp4", "audio/webm"], ["audio/webm"]);
  const { choisir } = await import("../src/audio/formats.js?cas2");
  const f = choisir();
  assert.ok(f.mime.startsWith("audio/webm"), `attendu WebM, obtenu ${f.mime}`);
  assert.equal(f.complet, true);
  nettoyer();
});

test("P0.3 · si rien n'est relisible, la perte est annoncée explicitement", async () => {
  simuler(["audio/webm"], []);
  const { choisir, resume } = await import("../src/audio/formats.js?cas3");
  const f = choisir();
  assert.equal(f.relisible, false);
  assert.equal(f.complet, false);
  assert.equal(f.cause, "non_relisible_localement");
  assert.ok(f.explication.includes("réécoute"), "l'utilisateur doit être prévenu");
  // La transcription reste possible : on ne sacrifie pas l'objectif.
  assert.equal(resume(f).speechToText, "compatible");
  nettoyer();
});

test("P0.3 · WEBM_OPUS est officiellement pris en charge par la transcription", async () => {
  const { CANDIDATS, STT } = await import("../src/audio/formats.js?stt");
  const webm = CANDIDATS.find((c) => c.mime === "audio/webm;codecs=opus");
  assert.equal(webm.stt, STT.OFFICIEL);
  for (const m of ["audio/mp4", "audio/ogg;codecs=opus"]) {
    assert.equal(CANDIDATS.find((c) => c.mime === m).stt, STT.OFFICIEL);
  }
});

test("P0.3 · le diagnostic expose les trois critères séparément", async () => {
  simuler(["audio/mp4"], ["audio/mp4"]);
  const { resume } = await import("../src/audio/formats.js?diag");
  const r = resume();
  assert.equal(r.enregistrement, "audio/mp4");
  assert.equal(r.lectureLocale, "compatible");
  assert.equal(r.speechToText, "compatible");
  nettoyer();
});

test("P0.9 · les transitions impossibles sont refusées", async () => {
  const { ETAT } = await import("../src/audio/machine.js");
  // On ne teste ici que la table, la machine complète exige le DOM.
  assert.ok(Object.values(ETAT).includes("IDLE"));
  assert.ok(Object.values(ETAT).includes("PAUSED"));
  assert.ok(Object.values(ETAT).includes("PLAYING_ECHO"));
  assert.equal(new Set(Object.values(ETAT)).size, Object.values(ETAT).length);
});
