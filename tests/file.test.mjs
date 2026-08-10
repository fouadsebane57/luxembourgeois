/* ===================================================================
   FILE DE SÉANCE · GATE 2.5

   Défaut d'origine : `neufs`, `dus`, `enCours`, `leconItems` et
   `solides` se recouvrent. Une concaténation suivie d'un mélange
   produisait A A B C, et « Pause puis Suivant puis Reprendre »
   ramenait la même expression.

   Ce que ces tests vérifient, dans l'ordre :

     1. aucune répétition immédiate ACCIDENTELLE quand elle est évitable
     2. aucune occurrence UTILE perdue au passage
     3. une graine donne toujours exactement la même file
     4. le parcours réel Pause / Suivant / Reprendre change d'expression

   La suite n'utilise plus `Math.random()` : chaque construction reçoit
   une graine. Un défaut ne peut plus apparaître une fois sur deux.
   =================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { creerRng, melanger, resoudreRng } from "../src/core/rng.js";
import {
  candidature, fusionner, enBlocs, espacer, ordonner,
  compterAdjacencesAccidentelles, construireRecyclage, SOURCE, RAISON
} from "../src/core/file.js";
import {
  creerSeance, demarrer, prochain, terminerExercice, sauterExercice, TYPES
} from "../src/core/session.js";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Graines imposées. Aucune ne doit casser un invariant. */
export const GRAINES = [1, 2, 3, 10, 42, 100, 999, 2026];

const MODES = ["smart", "repeat", "review", "sprint", "listen", "numbers", "mistakes"];

const faireItems = (n, { lesson = 0, stage = 1 } = {}) =>
  Array.from({ length: n }, (_, i) => ({
    id: "lx" + String(i).padStart(8, "0"), lb: "mot" + i, fr: "f" + i,
    lesson: typeof lesson === "function" ? lesson(i) : lesson,
    stage: typeof stage === "function" ? stage(i) : stage, syl: 1
  }));

/** Progression rendant les items DUS, donc présents dans plusieurs listes. */
function progressionDue(items) {
  const p = {};
  for (const it of items) {
    p[it.id] = {
      schema: 6,
      dims: {
        comprehension: { n: 2, reussites: 2, echecs: 0, avecIndice: 0, sansIndice: 2, dernier: 1, echeance: 1 },
        rappel: { n: 2, reussites: 2, echecs: 0, avecIndice: 0, sansIndice: 2, dernier: 1, echeance: 1 },
        production: { n: 2, reussites: 2, echecs: 0, avecIndice: 0, sansIndice: 2, dernier: 1, echeance: 1 },
        fluidite: { n: 0, reussites: 0, echecs: 0, avecIndice: 0, sansIndice: 0, dernier: 0, echeance: 0 },
        prononciation: { n: 0, reussites: 0, echecs: 0, avecIndice: 0, sansIndice: 0, dernier: 0, echeance: 0 },
        transfert: { n: 0, reussites: 0, echecs: 0, avecIndice: 0, sansIndice: 0, dernier: 0, echeance: 0 }
      }
    };
  }
  return p;
}

const idsDe = (file) => file.map((e) => e.it?.id || e.dialogue?.id || e.itemId || "");

/** Compte les répétitions immédiates réellement accidentelles. */
function adjacencesAccidentelles(file) {
  return compterAdjacencesAccidentelles(
    file.map((e) => ({ itemId: e.it?.id || e.dialogue?.id || e.itemId || "", adjacenceVoulue: !!e.adjacenceVoulue }))
  );
}

const compter = (ids) => ids.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());

/* ===================================================================
   1 · RNG DÉTERMINISTE
   =================================================================== */

test("RNG · une même graine produit toujours la même suite", () => {
  for (const g of GRAINES) {
    const a = Array.from({ length: 50 }, creerRng(g));
    const b = Array.from({ length: 50 }, creerRng(g));
    assert.deepEqual(a, b, `graine ${g} non reproductible`);
    assert.ok(a.every((x) => x >= 0 && x < 1), "tirage hors de [0,1[");
  }
});

test("RNG · deux graines différentes ne donnent pas la même suite", () => {
  const vues = new Set();
  for (const g of GRAINES) vues.add(Array.from({ length: 12 }, creerRng(g)).join(","));
  assert.equal(vues.size, GRAINES.length, "collision entre graines");
});

test("RNG · le mélange est reproductible et ne perd aucun élément", () => {
  const src = faireItems(40).map((i) => i.id);
  for (const g of GRAINES) {
    const a = melanger(src, creerRng(g));
    const b = melanger(src, creerRng(g));
    assert.deepEqual(a, b);
    assert.deepEqual([...a].sort(), [...src].sort(), "le mélange a perdu ou ajouté un élément");
  }
});

test("RNG · resoudreRng respecte l'ordre rng, graine, système", () => {
  const faux = () => 0.5;
  assert.equal(resoudreRng({ rng: faux }), faux);
  const a = resoudreRng({ seed: 42 })();
  const b = creerRng(42)();
  assert.equal(a, b);
  assert.equal(typeof resoudreRng({})(), "number");
});

/* ===================================================================
   2 · FUSION ET CONSERVATION DES OCCURRENCES
   =================================================================== */

const oral = (id, source, opt = {}) =>
  candidature({ type: TYPES.ORAL, it: { id }, source, raison: RAISON.RAPPEL, ...opt });

test("FUSION · deux occurrences ACCIDENTELLES du même item sont ramenées à une", () => {
  const c = [oral("A", SOURCE.DU), oral("A", SOURCE.LECON), oral("B", SOURCE.DU), oral("C", SOURCE.LECON)];
  const r = fusionner(c);
  assert.equal(r.fusionnees, 1, "la fusion n'a pas été comptée");
  assert.equal(r.candidatures.length, 3);
  const a = r.candidatures.find((x) => x.itemId === "A");
  assert.equal(a.sourcesFusionnees.length, 1, "la fusion doit rester traçable");
  assert.equal(a.priorite, 1, "la priorité la plus forte doit être conservée");
});

test("CONSERVATION · deux occurrences INTENTIONNELLES du même item survivent", () => {
  const c = [
    oral("A", SOURCE.NOMBRE, { intentionnelle: true, occurrence: 0 }),
    oral("A", SOURCE.NOMBRE, { intentionnelle: true, occurrence: 1 }),
    oral("B", SOURCE.DU), oral("C", SOURCE.DU)
  ];
  const r = ordonner(c);
  const ids = r.file.map((x) => x.itemId);
  assert.equal(r.file.length, 4, "une occurrence utile a disparu");
  assert.equal(ids.filter((x) => x === "A").length, 2, "les deux A doivent rester");
  assert.equal(r.diagnostic.fusionnees, 0, "aucune fusion ne doit avoir lieu ici");
  assert.equal(r.diagnostic.adjacencesAccidentelles, 0);
  // La forme attendue : A B A C, jamais A A B C.
  for (let i = 1; i < ids.length; i++) assert.notEqual(ids[i], ids[i - 1]);
});

test("CONSERVATION · A A B C intentionnel devient A B A C, jamais A B C", () => {
  const c = [
    oral("A", SOURCE.DU, { intentionnelle: true, occurrence: 0 }),
    oral("A", SOURCE.DU, { intentionnelle: true, occurrence: 1 }),
    oral("B", SOURCE.DU), oral("C", SOURCE.DU)
  ];
  const ids = ordonner(c).file.map((x) => x.itemId);
  assert.deepEqual([...compter(ids).entries()].sort(), [["A", 2], ["B", 1], ["C", 1]]);
  assert.deepEqual(ids, ["A", "B", "A", "C"]);
});

test("ESPACEMENT · le cas A B C A A, où prendre le premier différent échoue", () => {
  // Prendre simplement le premier bloc différent donne A B C A puis A,
  // donc A A en fin de file, alors que A B A C A existe.
  const c = ["A", "B", "C", "A", "A"].map((x, k) =>
    oral(x, SOURCE.DU, { intentionnelle: true, occurrence: k }));
  const ids = ordonner(c).file.map((x) => x.itemId);
  assert.equal(ids.length, 5);
  for (let i = 1; i < ids.length; i++) assert.notEqual(ids[i], ids[i - 1], `adjacence à ${i} : ${ids.join(",")}`);
});

test("ESPACEMENT · une seule expression disponible : A A est autorisé et signalé", () => {
  const c = [
    oral("A", SOURCE.DU, { intentionnelle: true, occurrence: 0 }),
    oral("A", SOURCE.DU, { intentionnelle: true, occurrence: 1 })
  ];
  const r = ordonner(c);
  assert.equal(r.file.length, 2, "aucune occurrence ne doit être supprimée");
  assert.equal(r.diagnostic.adjacencesAccidentelles, 0, "cette adjacence n'est pas accidentelle");
  assert.ok(r.diagnostic.adjacencesInevitables >= 1, "l'adjacence subie doit être comptée");
});

test("ESPACEMENT · adjacence inévitable quand une expression domine la file", () => {
  // A×4, B×1 : ceil(5/2) = 3 < 4, aucune disposition sans adjacence.
  const c = ["A", "A", "A", "A", "B"].map((x, k) =>
    oral(x, SOURCE.DU, { intentionnelle: true, occurrence: k }));
  const r = ordonner(c);
  assert.equal(r.file.length, 5, "aucune occurrence perdue");
  assert.ok(r.diagnostic.adjacencesInevitables > 0);
  assert.equal(r.diagnostic.adjacencesAccidentelles, 0);
});

test("ESPACEMENT · une répétition immédiate VOULUE est préservée", () => {
  const it = { id: "A" };
  const c = [
    candidature({ type: TYPES.ECOUTE, it, source: SOURCE.NEUF, raison: RAISON.DECOUVERTE }),
    candidature({ type: TYPES.ORAL, it, source: SOURCE.NEUF, raison: RAISON.ANCRAGE,
                  intentionnelle: true, adjacenceVoulue: true }),
    oral("B", SOURCE.DU), oral("C", SOURCE.DU)
  ];
  const r = ordonner(c);
  const ids = r.file.map((x) => x.itemId);
  const i = ids.indexOf("A");
  assert.equal(ids[i + 1], "A", "l'écoute et la répétition ne doivent pas être séparées");
  assert.equal(r.file[i + 1].adjacenceVoulue, true, "l'adjacence doit rester identifiable");
  assert.equal(r.diagnostic.adjacencesAccidentelles, 0);
});

test("ESPACEMENT · sans conflit, l'ordre pédagogique d'origine est intact", () => {
  const c = ["A", "B", "C", "D", "E"].map((x) => oral(x, SOURCE.DU));
  const r = ordonner(c);
  assert.deepEqual(r.file.map((x) => x.itemId), ["A", "B", "C", "D", "E"]);
  assert.equal(r.diagnostic.deplacements, 0, "aucun déplacement ne doit avoir lieu sans conflit");
});

test("BLOCS · une candidature liée ne peut pas être détachée de sa tête", () => {
  const it = { id: "A" };
  const blocs = enBlocs([
    candidature({ type: TYPES.ECOUTE, it, source: SOURCE.NEUF, raison: RAISON.DECOUVERTE }),
    candidature({ type: TYPES.ORAL, it, source: SOURCE.NEUF, raison: RAISON.ANCRAGE, adjacenceVoulue: true }),
    oral("B", SOURCE.DU)
  ]);
  assert.equal(blocs.length, 2);
  assert.equal(blocs[0].cands.length, 2);
  const { blocs: apres } = espacer(blocs);
  assert.ok(apres.every((b) => b.cands.every((c) => c.itemId === b.cle)));
});

/* ===================================================================
   3 · CONSTRUCTION RÉELLE DE SÉANCE, TOUTES GRAINES
   =================================================================== */

function seanceDe(mode, items, progression, graine, opt = {}) {
  return creerSeance({
    mode, dureeMinutes: 20, items, dialogues: opt.dialogues || [],
    progression, leconCourante: opt.leconCourante ?? 0,
    etapeCourante: opt.etapeCourante ?? 3, seed: graine
  });
}

test("SÉANCE · aucune répétition immédiate accidentelle, tous modes, toutes graines", () => {
  const jeux = {
    "une seule expression": faireItems(1),
    "deux expressions": faireItems(2),
    "file courte": faireItems(5),
    "beaucoup d'expressions": faireItems(120, { lesson: (i) => i % 35, stage: (i) => (i % 6) + 1 })
  };
  for (const [nomJeu, items] of Object.entries(jeux)) {
    for (const progNom of ["toutes neuves", "toutes dues"]) {
      const prog = progNom === "toutes neuves" ? {} : progressionDue(items);
      for (const mode of MODES) {
        for (const g of GRAINES) {
          const s = seanceDe(mode, items, prog, g);
          const n = adjacencesAccidentelles(s.file);
          assert.equal(n, 0,
            `${mode} / ${nomJeu} / ${progNom} / graine ${g} : ${n} répétition(s) immédiate(s) accidentelle(s)\n${idsDe(s.file).join(" ")}`);
          assert.equal(s.diagnosticFile.adjacencesAccidentelles, 0);
        }
      }
    }
  }
});

test("SÉANCE · nouvelles ET dues mélangées, le cas qui produisait le défaut", () => {
  const items = faireItems(30, { lesson: 0 });
  // La moitié est due, l'autre est neuve. Les listes se recouvrent donc
  // exactement comme en production : neufs ⊂ leconItems, dus ∩ enCours.
  const prog = progressionDue(items.slice(0, 15));
  for (const g of GRAINES) {
    for (const mode of ["repeat", "smart", "sprint", "listen", "review"]) {
      const s = seanceDe(mode, items, prog, g);
      assert.equal(adjacencesAccidentelles(s.file), 0,
        `${mode} / graine ${g} : ${idsDe(s.file).join(" ")}`);
    }
  }
});

test("SÉANCE · le mode repeat fusionne bien les recouvrements de listes", () => {
  const items = faireItems(20, { lesson: 0 });
  const prog = progressionDue(items.slice(0, 10));
  const s = seanceDe("repeat", items, prog, 42);
  assert.ok(s.diagnosticFile.fusionnees > 0,
    "aucune fusion détectée alors que neufs, dus, enCours et leconItems se recouvrent");
  // Aucun item ne doit apparaître deux fois : dans ce mode, aucune
  // occurrence supplémentaire n'est intentionnelle.
  const ids = idsDe(s.file);
  assert.equal(new Set(ids).size, ids.length, "occurrence non intentionnelle en double");
});

test("SÉANCE · le mode chiffres conserve ses trois passages voulus", () => {
  const items = faireItems(6, { stage: 1 });
  for (const g of GRAINES) {
    const s = seanceDe("numbers", items, {}, g);
    assert.equal(s.file.length, 18, "les trois passages ne sont pas conservés");
    for (const [, n] of compter(idsDe(s.file))) assert.equal(n, 3);
    assert.equal(adjacencesAccidentelles(s.file), 0, idsDe(s.file).join(" "));
    assert.ok(s.file.every((e) => e.it.stage === 1));
  }
});

test("SÉANCE · le mode voiture garde le couple écoute puis répétition", () => {
  const items = faireItems(10, { lesson: 0 });
  const s = seanceDe("smart", items, {}, 42);
  const ecoutes = s.file.filter((e) => e.type === TYPES.ECOUTE);
  assert.ok(ecoutes.length > 0, "aucune découverte dans le mode voiture");
  for (const e of ecoutes) {
    const i = s.file.indexOf(e);
    assert.equal(s.file[i + 1]?.it?.id, e.it.id, "la répétition doit suivre l'écoute");
    assert.equal(s.file[i + 1].adjacenceVoulue, true);
  }
  assert.equal(adjacencesAccidentelles(s.file), 0);
});

test("SÉANCE · une même graine reconstruit exactement la même file", () => {
  const items = faireItems(60, { lesson: (i) => i % 4, stage: (i) => (i % 6) + 1 });
  const prog = progressionDue(items.slice(0, 25));
  for (const g of GRAINES) {
    for (const mode of MODES) {
      const a = idsDe(seanceDe(mode, items, prog, g).file);
      const b = idsDe(seanceDe(mode, items, prog, g).file);
      assert.deepEqual(a, b, `${mode} / graine ${g} : file non reproductible`);
    }
  }
});

test("SÉANCE · changer de graine change l'ordre, jamais le contenu", () => {
  const items = faireItems(40, { lesson: 0 });
  const prog = progressionDue(items.slice(0, 20));
  const files = GRAINES.map((g) => idsDe(seanceDe("repeat", items, prog, g).file));
  for (const f of files) assert.deepEqual([...f].sort(), [...files[0]].sort(),
    "le contenu de la file dépend de la graine, il ne devrait pas");
  assert.ok(new Set(files.map((f) => f.join(","))).size > 1,
    "toutes les graines donnent le même ordre : l'aléa n'est pas branché");
});

test("SÉANCE · une seule expression disponible, A puis A reste possible", () => {
  const items = faireItems(1);
  for (const g of GRAINES) {
    const s = seanceDe("numbers", items, {}, g);
    assert.equal(s.file.length, 3, "les passages voulus doivent rester");
    assert.equal(adjacencesAccidentelles(s.file), 0, "avec un seul item, aucune adjacence n'est accidentelle");
  }
});

test("SÉANCE · le dialogue ne produit pas deux fois le même échange de suite", () => {
  const dialogues = Array.from({ length: 5 }, (_, i) => ({ id: "d" + i, e: 1, lignes: [] }));
  for (const g of GRAINES) {
    const s = seanceDe("dialogue", faireItems(10), {}, g, { dialogues, etapeCourante: 3 });
    assert.equal(adjacencesAccidentelles(s.file), 0);
    assert.equal(s.file.length, 5);
  }
});

/* ===================================================================
   4 · RECYCLAGE
   =================================================================== */

test("RECYCLAGE · la réserve ne contient aucun doublon issu des listes", () => {
  const items = faireItems(30, { lesson: 0 });
  const prog = progressionDue(items);
  for (const g of GRAINES) {
    const s = seanceDe("review", items, prog, g);
    const ids = s.recyclage.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length,
      "la réserve de recyclage contient encore des doublons de listes");
    for (let i = 1; i < ids.length; i++) assert.notEqual(ids[i], ids[i - 1]);
  }
});

test("RECYCLAGE · la réserve n'est jamais vide sur du contenu neuf", () => {
  const items = faireItems(30, { lesson: 0 });
  for (const g of GRAINES) {
    const s = seanceDe("review", items, {}, g);
    assert.ok(s.recyclage.length > 0, "une séance longue s'arrêterait au bout de deux minutes");
  }
});

test("RECYCLAGE · le passage de la file au recyclage ne répète pas l'expression", () => {
  // Deux items seulement : la file s'épuise vite et le recyclage boucle.
  const items = faireItems(2, { lesson: 0 });
  for (const g of GRAINES) {
    const s = seanceDe("review", items, progressionDue(items), g);
    let t = 0; demarrer(s, t);
    const joues = [];
    for (let k = 0; k < 40; k++) {
      const ex = prochain(s, t);
      if (!ex) break;
      joues.push(ex.it.id);
      t += 15000;
      terminerExercice(s, ex, 15000);
    }
    assert.ok(joues.length > 5, "la séance s'est arrêtée trop tôt");
    for (let i = 1; i < joues.length; i++) {
      assert.notEqual(joues[i], joues[i - 1],
        `graine ${g} : répétition immédiate en bouclage de recyclage\n${joues.join(" ")}`);
    }
  }
});

test("RECYCLAGE · un seul item disponible : la répétition est acceptée", () => {
  const items = faireItems(1, { lesson: 0 });
  const s = seanceDe("review", items, progressionDue(items), 42);
  let t = 0; demarrer(s, t);
  const ex1 = prochain(s, t); terminerExercice(s, ex1, 15000); t += 15000;
  const ex2 = prochain(s, t);
  assert.ok(ex2, "la séance ne doit pas s'arrêter parce qu'il n'y a qu'un item");
  assert.equal(ex2.it.id, ex1.it.id);
});

/* ===================================================================
   5 · PARCOURS RÉEL · PAUSE, SUIVANT, REPRENDRE
   =================================================================== */

/**
 * Reproduction de boucleSeance() de app.js, dans l'ordre exact de ses
 * décisions : le saut en attente est consommé AVANT le test de pause.
 */
function boucle(s) {
  const etat = { exerciceCourant: null, sautEnAttente: false, enPause: false, joues: [], t: 0 };
  return {
    etat,
    tour() {
      etat.t += 100;
      if (etat.sautEnAttente && etat.exerciceCourant) {
        sauterExercice(s, etat.exerciceCourant);
        etat.exerciceCourant = null;
        etat.sautEnAttente = false;
        return "saut_consomme";
      }
      if (etat.enPause) return "attente_pause";
      const ex = etat.exerciceCourant || prochain(s, etat.t);
      if (!ex) return "fin";
      etat.exerciceCourant = ex;
      etat.joues.push(ex.it?.id || ex.dialogue?.id);
      return "joue";
    },
    consommer() {
      if (!etat.exerciceCourant) return;
      terminerExercice(s, etat.exerciceCourant, 15000);
      etat.exerciceCourant = null;
    },
    courant: () => etat.exerciceCourant?.it?.id || null,
    pause() { etat.enPause = true; },
    reprendre() { etat.enPause = false; },
    suivant() { if (etat.sautEnAttente) return false; etat.sautEnAttente = true; return true; }
  };
}

test("PARCOURS · Pause, Suivant, Reprendre donne une AUTRE expression, toutes graines", () => {
  const items = faireItems(20, { lesson: 0 });
  const prog = progressionDue(items.slice(0, 8));
  for (const g of GRAINES) {
    for (const mode of ["repeat", "smart", "review", "sprint", "numbers"]) {
      const s = seanceDe(mode, items, prog, g);
      demarrer(s, 0);
      const b = boucle(s);
      b.tour();
      const avant = b.courant();
      assert.ok(avant, `${mode} / graine ${g} : aucun exercice au premier tour`);

      b.pause();
      assert.equal(b.tour(), "attente_pause");
      assert.equal(b.suivant(), true);
      assert.equal(b.tour(), "saut_consomme");
      assert.equal(s.sautes, 1, "exactement une expression sautée");
      // Une découverte porte deux occurrences soudées, écoute puis
      // répétition. Sauter l'expression saute le couple, pas la moitié.
      const attendu = 1 + (s.file[1]?.adjacenceVoulue ? 1 : 0);
      assert.equal(s.index, attendu, "l'index doit avancer d'exactement une expression");
      assert.equal(b.tour(), "attente_pause", "aucun exercice ne démarre pendant la pause");

      b.reprendre();
      assert.equal(b.tour(), "joue");
      assert.notEqual(b.courant(), avant,
        `${mode} / graine ${g} : la même expression est revenue après Suivant`);
    }
  }
});

test("PARCOURS · Suivant sur une découverte saute le couple entier", () => {
  const items = faireItems(10, { lesson: 0 });
  const s = seanceDe("smart", items, {}, 42);
  demarrer(s, 0);
  assert.equal(s.file[0].type, TYPES.ECOUTE, "le mode voiture doit commencer par une écoute");
  assert.equal(s.file[1].adjacenceVoulue, true, "la répétition doit être soudée à l'écoute");
  const b = boucle(s);
  b.tour();
  const avant = b.courant();
  assert.equal(b.suivant(), true);
  b.tour();
  assert.equal(s.sautes, 1, "une seule EXPRESSION sautée");
  assert.equal(s.index, 2, "les deux occurrences soudées doivent être écartées ensemble");
  b.tour();
  assert.notEqual(b.courant(), avant, "l'expression sautée est revenue par sa répétition liée");
  // Les deux occurrences sont tracées, aucune n'a disparu en silence.
  const sautes = s.historique.filter((h) => h.saute && h.id === avant);
  assert.equal(sautes.length, 2);
  assert.equal(sautes[1].lie, true);
});

test("PARCOURS · Pause seule fait rejouer la MÊME expression", () => {
  const items = faireItems(12, { lesson: 0 });
  for (const g of GRAINES) {
    const s = seanceDe("repeat", items, {}, g);
    demarrer(s, 0);
    const b = boucle(s);
    b.tour();
    const avant = b.courant();
    b.pause(); b.tour();
    assert.equal(s.index, 0, "l'index ne doit pas bouger sur une pause seule");
    b.reprendre(); b.tour();
    assert.equal(b.courant(), avant);
    assert.equal(s.sautes, 0);
  }
});

test("PARCOURS · deux Suivant successifs sautent deux expressions distinctes", () => {
  const items = faireItems(12, { lesson: 0 });
  for (const g of GRAINES) {
    const s = seanceDe("repeat", items, {}, g);
    demarrer(s, 0);
    const b = boucle(s);
    b.tour();
    const id1 = b.courant();
    assert.equal(b.suivant(), true);
    b.tour();
    b.tour();
    const id2 = b.courant();
    assert.notEqual(id2, id1);
    assert.equal(b.suivant(), true);
    b.tour();
    assert.equal(s.sautes, 2);
    assert.equal(s.index, 2);
    b.tour();
    assert.notEqual(b.courant(), id2);
  }
});

test("PARCOURS · un saut n'écrit aucune réussite ni aucun échec", () => {
  const items = faireItems(12, { lesson: 0 });
  const s = seanceDe("repeat", items, {}, 42);
  demarrer(s, 0);
  const b = boucle(s);
  b.tour(); b.suivant(); b.tour();
  const h = s.historique.at(-1);
  assert.equal(h.saute, true);
  assert.equal(h.dureeMs, 0, "un saut ne doit pas polluer l'estimation de minutage");
  assert.equal(s.correct, 0);
  assert.equal(s.tentatives, 0);
  assert.equal(s.fiables, 0);
});

test("PARCOURS · une séance entière ne répète jamais deux fois de suite", () => {
  const items = faireItems(25, { lesson: (i) => i % 3, stage: (i) => (i % 6) + 1 });
  const prog = progressionDue(items.slice(0, 12));
  for (const g of GRAINES) {
    for (const mode of MODES) {
      const s = seanceDe(mode, items, prog, g);
      let t = 0; demarrer(s, t);
      const joues = [];
      for (let k = 0; k < 200; k++) {
        const ex = prochain(s, t);
        if (!ex) break;
        joues.push({ id: ex.it?.id || ex.dialogue?.id || "", voulue: !!ex.adjacenceVoulue });
        t += 12000;
        terminerExercice(s, ex, 12000);
      }
      const distincts = new Set(joues.map((x) => x.id)).size;
      if (distincts < 2) continue;
      for (let i = 1; i < joues.length; i++) {
        if (joues[i].id !== joues[i - 1].id) continue;
        assert.ok(joues[i].voulue,
          `${mode} / graine ${g} : répétition immédiate non voulue au rang ${i}`);
      }
    }
  }
});

test("PARCOURS · reprise de séance en fin de file, aucune répétition au bord", () => {
  const items = faireItems(4, { lesson: 0 });
  for (const g of GRAINES) {
    const s = seanceDe("repeat", items, progressionDue(items), g);
    let t = 0; demarrer(s, t);
    // On consomme toute la file, puis on continue sur le recyclage.
    const joues = [];
    for (let k = 0; k < 30; k++) {
      const ex = prochain(s, t);
      if (!ex) break;
      joues.push(ex.it.id);
      t += 15000;
      terminerExercice(s, ex, 15000);
    }
    assert.ok(joues.length > s.file.length, "le recyclage n'a jamais pris le relais");
    for (let i = 1; i < joues.length; i++) {
      assert.notEqual(joues[i], joues[i - 1], `graine ${g} : ${joues.join(" ")}`);
    }
  }
});

test("PARCOURS · le filet de lecture déplace une répétition résiduelle", () => {
  const items = faireItems(6, { lesson: 0 });
  const s = seanceDe("repeat", items, {}, 42);
  // On force la situation que le remplacement de fin de séance peut créer.
  const a = s.file[0], b = s.file[1];
  s.file = [a, a, b];
  s.dernierId = a.itemId || a.it.id;
  s.index = 0;
  demarrer(s, 0);
  const ex = prochain(s, 0);
  assert.equal(ex.it.id, b.it.id, "la répétition immédiate n'a pas été évitée");
  assert.equal(s.file.length, 3, "aucune occurrence ne doit être supprimée");
});

test("PARCOURS · une seule expression restante : le filet ne force rien", () => {
  const items = faireItems(4, { lesson: 0 });
  const s = seanceDe("repeat", items, {}, 42);
  const a = s.file[0];
  s.file = [a, a];
  s.dernierId = a.it.id;
  s.index = 0;
  demarrer(s, 0);
  const ex = prochain(s, 0);
  assert.equal(ex.it.id, a.it.id, "avec une seule expression, la répétition est acceptée");
  assert.equal(s.file.length, 2);
});

test("PARCOURS · le remplacement de fin de séance ne perd aucune occurrence", () => {
  const items = faireItems(8, { lesson: 0, stage: 1 });
  const s = creerSeance({ mode: "smart", dureeMinutes: 2, items, dialogues: [],
    progression: {}, leconCourante: 0, etapeCourante: 1, seed: 42 });
  s.recyclage = [];
  const avant = idsDe(s.file).sort();
  let t = 0; demarrer(s, t);
  const joues = [];
  for (let k = 0; k < 100; k++) {
    const ex = prochain(s, t);
    if (!ex) break;
    joues.push(ex.it?.id || "");
    // Les écoutes sont courtes, les oraux longs : le remplacement se déclenche.
    t += ex.type === TYPES.ECOUTE ? 4000 : 25000;
    terminerExercice(s, ex, ex.type === TYPES.ECOUTE ? 4000 : 25000);
  }
  const restantes = idsDe(s.file.slice(s.index));
  const total = [...joues, ...restantes].sort();
  assert.deepEqual(total, avant,
    "des occurrences ont disparu de la file lors d'un remplacement de fin de séance");
});

test("PARCOURS · fin de file, la séance se clôt sans exercice fantôme", () => {
  const items = faireItems(3, { lesson: 0 });
  const s = seanceDe("repeat", items, {}, 42);
  s.recyclage = [];                       // aucune réserve : la file doit finir
  let t = 0; demarrer(s, t);
  let n = 0;
  while (n < 50) { const ex = prochain(s, t); if (!ex) break; t += 15000; terminerExercice(s, ex, 15000); n++; }
  assert.equal(n, s.file.length);
  assert.equal(prochain(s, t), null);
});

/* ===================================================================
   6 · ARCHITECTURE
   =================================================================== */

function fichiersCore() {
  return readdirSync(join(RACINE, "src/core")).filter((f) => f.endsWith(".js")).map((f) => "src/core/" + f);
}

test("ARCHITECTURE · seul rng.js appelle Math.random dans le moteur de séance", () => {
  const autorises = new Set(["src/core/rng.js", "src/core/state.js"]);
  const fautifs = fichiersCore()
    .filter((f) => !autorises.has(f))
    .filter((f) => /Math\.random\s*\(/.test(readFileSync(join(RACINE, f), "utf8")));
  assert.deepEqual(fautifs, [],
    "un module de séance tire un aléa non injectable : les tests redeviendraient non déterministes");
});

test("ARCHITECTURE · la file n'est pas construite par une simple concaténation mélangée", () => {
  const src = readFileSync(join(RACINE, "src/core/session.js"), "utf8");
  assert.ok(src.includes("construireFile("), "session.js doit déléguer la construction de la file");
  assert.ok(!/melanger\s*\(\s*\[\s*\.\.\./.test(src),
    "session.js mélange encore une concaténation brute de listes");
});

test("ARCHITECTURE · aucune déduplication aveugle de la file", () => {
  const src = readFileSync(join(RACINE, "src/core/file.js"), "utf8");
  assert.ok(!/new Set\([^)]*\)\s*\]/.test(src.replace(/compterAdjacences[\s\S]*?\n}/g, "")) ||
            src.includes("intentionnelle"),
    "la file doit distinguer les occurrences voulues, pas les supprimer en bloc");
  assert.ok(src.includes("intentionnelle"), "le modèle de candidature doit exister");
});

test("ARCHITECTURE · aucun test ne construit une séance sans graine", () => {
  const fautifs = [];
  for (const f of readdirSync(join(RACINE, "tests")).filter((x) => x.endsWith(".test.mjs"))) {
    const src = readFileSync(join(RACINE, "tests", f), "utf8");
    for (const m of src.matchAll(/creerSeance\s*\(\s*\{([\s\S]{0,400}?)\}\s*\)/g)) {
      if (!/\bseed\s*:|\brng\s*:/.test(m[1])) fautifs.push(f);
    }
  }
  assert.deepEqual([...new Set(fautifs)], [],
    "une séance de test dépend encore de Math.random : la suite redeviendrait non déterministe");
});

test("ARCHITECTURE · la séance expose le diagnostic de construction", () => {
  const s = seanceDe("repeat", faireItems(15, { lesson: 0 }), {}, 42);
  for (const k of ["brutes", "fusionnees", "occurrences", "deplacements",
                   "adjacencesInevitables", "adjacencesAccidentelles"]) {
    assert.equal(typeof s.diagnosticFile[k], "number", `diagnostic incomplet : ${k}`);
  }
  assert.ok(s.diagnosticFile.occurrences === s.file.length);
});
