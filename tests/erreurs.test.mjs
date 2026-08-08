/* Chaque échec possible doit produire une cause ET une action. */
import test from "node:test";
import assert from "node:assert/strict";
import { CAUSE, fiche, causeDeReponse, causeDException } from "../src/speech/erreurs.js";

test("chaque cause d'échec porte un titre, un message et une action", () => {
  for (const [nom, code] of Object.entries(CAUSE)) {
    if (code === CAUSE.OK) continue;
    const f = fiche(code);
    assert.ok(f, `aucune fiche pour ${nom}`);
    assert.ok(f.titre && f.message && f.action, `fiche incomplète pour ${nom}`);
  }
});

test("les codes HTTP sont traduits en causes distinctes", () => {
  assert.equal(causeDeReponse(404, {}), CAUSE.FONCTION_INTROUVABLE);
  assert.equal(causeDeReponse(401, {}), CAUSE.AUTH);
  assert.equal(causeDeReponse(429, {}), CAUSE.QUOTA);
  assert.equal(causeDeReponse(413, {}), CAUSE.AUDIO_TROP_LONG);
  assert.equal(causeDeReponse(504, {}), CAUSE.TIMEOUT);
  assert.equal(causeDeReponse(500, {}), CAUSE.SERVEUR);
  assert.equal(causeDeReponse(400, { error: "Format audio non accepté" }), CAUSE.FORMAT_AUDIO);
});

test("un quota renvoyé en 403 n'est pas confondu avec un refus d'authentification", () => {
  assert.equal(causeDeReponse(403, { error: "Quota de reconnaissance atteint" }), CAUSE.QUOTA);
  assert.equal(causeDeReponse(403, { error: "Session expirée" }), CAUSE.AUTH);
});

test("un délai dépassé n'est pas confondu avec une panne réseau", () => {
  assert.equal(causeDException({ name: "AbortError" }), CAUSE.TIMEOUT);
  assert.equal(causeDException(new TypeError("Failed to fetch")), CAUSE.RESEAU);
  assert.equal(causeDException(new TypeError("Load failed")), CAUSE.RESEAU);
});
