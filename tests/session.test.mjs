import test from "node:test";
import assert from "node:assert/strict";
import { creerSeance, demarrer, prochain, terminerExercice, bilan, restantMs, TYPES } from "../src/core/session.js";

const items = Array.from({ length: 120 }, (_, i) => ({
  id: "lx" + String(i).padStart(8, "0"), lb: "mot" + i, fr: "mot" + i, lesson: i % 35, stage: (i % 6) + 1
}));

function jouer(dureeMinutes, dureeExerciceMs) {
  const s = creerSeance({ mode: "smart", dureeMinutes, items, dialogues: [], progression: {}, leconCourante: 0, etapeCourante: 3, seed: 7 });
  let t = 1_700_000_000_000;
  demarrer(s, t);
  let tours = 0;
  while (tours < 5000) {
    const ex = prochain(s, t);
    if (!ex) break;
    t += dureeExerciceMs;
    terminerExercice(s, ex, dureeExerciceMs);
    tours++;
  }
  return { s, t, minutes: (t - s.debut) / 60000, tours };
}

for (const d of [10, 20, 30, 45, 60]) {
  test(`REGRESSION P0-6 : une séance de ${d} min dure bien environ ${d} min`, () => {
    const { minutes } = jouer(d, 16000);
    // Tolérance : la durée d'un exercice, puisqu'on ne coupe jamais au milieu.
    assert.ok(minutes <= d, `dépassement: ${minutes.toFixed(1)} min pour une cible de ${d}`);
    assert.ok(minutes >= d - 1.2, `trop court: ${minutes.toFixed(1)} min pour une cible de ${d}`);
  });
}

test("la séance ne s'arrête pas prématurément quand la file est épuisée", () => {
  const petit = items.slice(0, 6);
  const s = creerSeance({ mode: "review", dureeMinutes: 20, items: petit, dialogues: [], progression: {}, leconCourante: 0, etapeCourante: 1, seed: 7 });
  let t = 1_700_000_000_000; demarrer(s, t);
  let tours = 0;
  while (tours < 500) { const ex = prochain(s, t); if (!ex) break; t += 15000; terminerExercice(s, ex, 15000); tours++; }
  assert.ok((t - s.debut) / 60000 >= 18, "la séance s'est arrêtée trop tôt");
});

test("l'estimation s'ajuste aux durées réellement observées", () => {
  const s = creerSeance({ mode: "smart", dureeMinutes: 30, items, dialogues: [], progression: {}, leconCourante: 0, etapeCourante: 3, seed: 7 });
  let t = 1_700_000_000_000; demarrer(s, t);
  const avant = s.estimations[TYPES.ORAL];
  for (let i = 0; i < 6; i++) { const ex = prochain(s, t); if (!ex) break; t += 30000; terminerExercice(s, ex, 30000); }
  assert.ok(s.estimations[TYPES.ORAL] > avant, "l'estimation n'a pas suivi le réel");
});

test("REGRESSION P2 : le mode chiffres filtre par étape, pas par position", () => {
  const melange = items.map((i, k) => ({ ...i, lesson: 99 - (k % 35) }));
  const s = creerSeance({ mode: "numbers", dureeMinutes: 5, items: melange, dialogues: [], progression: {}, leconCourante: 0, etapeCourante: 1, seed: 7 });
  assert.ok(s.file.length > 0, "la file est vide alors que l'étape 1 existe");
  assert.ok(s.file.every((e) => e.it.stage === 1));
});

test("le bilan n'invente pas de pourcentage sans mesure fiable", () => {
  const s = creerSeance({ mode: "smart", dureeMinutes: 10, items, dialogues: [], progression: {}, leconCourante: 0, etapeCourante: 1, seed: 7 });
  demarrer(s);
  assert.equal(bilan(s).precision, null);
  s.fiables = 4; s.correct = 3;
  assert.equal(bilan(s).precision, 75);
});

test("le temps restant ne devient jamais négatif", () => {
  const s = creerSeance({ mode: "smart", dureeMinutes: 10, items, dialogues: [], progression: {}, leconCourante: 0, etapeCourante: 1, seed: 7 });
  demarrer(s, 0);
  assert.equal(restantMs(s, 999_999_999), 0);
});
