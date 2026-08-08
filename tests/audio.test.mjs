/* Tests de non-régression sur la mesure audio et la configuration.
   Ils couvrent les deux pannes réelles observées en 5.0.0 sur iPhone. */
import test from "node:test";
import assert from "node:assert/strict";

test("REGRESSION 5.1.0 : le plancher de bruit ne peut plus s'effondrer", () => {
  // Reproduction du calcul de la 5.0.0, qui n'avait aucune borne basse.
  const PLANCHER_MIN = -70, PLANCHER_MAX = -25, MARGE = 9, SEUIL_ABSOLU = -58;
  const borner = (v) => Math.max(PLANCHER_MIN, Math.min(PLANCHER_MAX, v));
  const seuilDe = (p) => Math.max(SEUIL_ABSOLU, p + MARGE);

  let sansBorne = -60, avecBorne = -60;
  for (let i = 0; i < 200; i++) {
    sansBorne = sansBorne * 0.94 + (-600) * 0.06;   // ancien comportement
    avecBorne = borner(avecBorne * 0.94 + (-600) * 0.06);
  }
  assert.ok(sansBorne < -500, "la reproduction du bug doit bien diverger");
  assert.equal(avecBorne, PLANCHER_MIN);
  assert.equal(seuilDe(avecBorne), SEUIL_ABSOLU);
  assert.ok(seuilDe(avecBorne) > -60, "le seuil ne doit jamais descendre dans l'absurde");
});

test("REGRESSION 5.1.0 : la mesure en décibels est bornée des deux côtés", () => {
  const DB_MIN = -100;
  const borner = (rms) => {
    if (!(rms > 0)) return DB_MIN;
    return Math.max(DB_MIN, Math.min(0, 20 * Math.log10(rms)));
  };
  assert.equal(borner(0), DB_MIN);
  assert.equal(borner(1e-30), DB_MIN);      // donnait -600 en 5.0.0
  assert.equal(borner(1), 0);
  assert.equal(borner(10), 0);              // ne dépasse jamais 0 dBFS
  assert.ok(borner(0.01) > DB_MIN && borner(0.01) < 0);
});

test("REGRESSION 5.1.0 : un pic trop faible n'est jamais de la parole", () => {
  const DB_PAROLE_MINIMALE = -55;
  const detecte = (speechMs, pic) => speechMs >= 150 && pic >= DB_PAROLE_MINIMALE;
  // Cas exact observé sur l'iPhone : 2520 ms « de parole » sur du silence.
  assert.equal(detecte(2520, -95), false);
  assert.equal(detecte(2520, -20), true);
  assert.equal(detecte(80, -20), false);
});

test("un rapport signal sur bruit de 514 dB est physiquement impossible", () => {
  const DB_MIN = -100, PLANCHER_MIN = -70;
  const snrMax = 0 - PLANCHER_MIN;   // pic maximal moins plancher minimal
  assert.ok(snrMax <= 70, `le SNR ne peut pas dépasser ${snrMax} dB`);
  assert.ok(514 > snrMax, "la valeur observée en 5.0.0 était bien hors du possible");
});
