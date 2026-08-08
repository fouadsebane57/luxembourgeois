import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { traduireProgression, traduireValidees } from "../src/core/migrate.js";
import { normaliserEntree, fusionner } from "../src/core/scheduler.js";

const MAP = JSON.parse(readFileSync(new URL("../cours.legacy-map.json", import.meta.url), "utf8")).legacy;

test("la table de migration couvre les 255 expressions", () => {
  assert.equal(Object.keys(MAP).length, 255);
});

test("les identifiants ont le format permanent attendu", () => {
  for (const id of Object.values(MAP)) assert.match(id, /^lx[0-9a-f]{8}$/);
});

test("REGRESSION P0-1 : l'identifiant ne dépend pas de la position", () => {
  // Même expression, deux positions différentes dans cours.js -> même identifiant.
  assert.equal(MAP["0-2"], MAP["6-2"]);   // zwee
  assert.equal(MAP["0-5"], MAP["5-1"]);   // fënnef
  assert.equal(MAP["6-7"], MAP["7-7"]);   // Haus
});

test("une ancienne progression est intégralement traduite", () => {
  const ancien = {};
  Object.keys(MAP).forEach((k, i) => { ancien[k] = { n: (i % 7), seen: 3, due: 0, day: 1000 + i }; });
  const { progression, rapport } = traduireProgression(ancien, MAP);
  assert.equal(rapport.inconnues, 0);
  assert.equal(rapport.traduites + rapport.fusionnees, 255);
  assert.equal(Object.keys(progression).length, 248);
});

test("les doublons sont fusionnés, pas écrasés", () => {
  const ancien = {
    "0-2": { n: 5, seen: 10, day: 2000 },
    "6-2": { n: 1, seen: 2,  day: 1000 }
  };
  const { progression, rapport } = traduireProgression(ancien, MAP);
  assert.equal(rapport.fusionnees, 1);
  // La version la plus récente fait foi, pas le maximum aveugle.
  assert.equal(progression[MAP["0-2"]].production, 5);
});

test("une clé déjà migrée est reprise sans dommage, la migration est idempotente", () => {
  const id = MAP["0-0"];
  const { progression, rapport } = traduireProgression({ [id]: { production: 4, comprehension: 4 } }, MAP);
  assert.equal(rapport.inconnues, 0);
  assert.equal(progression[id].production, 4);
});

test("une clé inconnue est signalée, jamais silencieusement perdue", () => {
  const { rapport } = traduireProgression({ "99-99": { n: 3 } }, MAP);
  assert.equal(rapport.inconnues, 1);
  assert.deepEqual(rapport.clesInconnues, ["99-99"]);
});

test("les leçons validées passent aux identifiants de leçon", () => {
  const cours = [{ lid: "lsaaa111" }, { lid: "lsbbb222" }, { lid: "lsccc333" }];
  const out = traduireValidees({ "0": true, "2": true, "1": false }, cours);
  assert.deepEqual(out, { lsaaa111: true, lsccc333: true });
});

test("REGRESSION P1-3 : la fusion ne repousse plus systématiquement l'échéance", () => {
  const ancien = normaliserEntree({ production: 5, comprehension: 5, lastSeen: 1000, nextDue: Date.now() + 40 * 86400000 });
  const recent = normaliserEntree({ production: 1, comprehension: 1, lastSeen: Date.now() });
  const f = fusionner(ancien, recent);
  // La donnée récente gagne, l'échéance est recalculée depuis le vrai niveau.
  assert.equal(f.production, 1);
  assert.ok(f.nextDue < Date.now() + 3 * 86400000);
});
