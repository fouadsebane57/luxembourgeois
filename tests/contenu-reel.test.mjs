/* ===================================================================
   INVARIANTS SUR LE CONTENU RÉEL

   Les tests de `file.test.mjs` utilisent des jeux fabriqués. Ils
   cadrent les cas limites, mais ne prouvent rien sur le contenu
   réellement livré.

   Ici, la file est construite à partir de `cours.js` tel qu'il est
   embarqué dans l'application, avec la même mise à plat que
   `content.js` : une entrée PAR OCCURRENCE, l'identifiant pouvant être
   partagé entre deux leçons. C'est précisément ce partage qui produit
   des doublons invisibles dans un jeu de test fabriqué.
   =================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { creerSeance, demarrer, prochain, terminerExercice, sauterExercice } from "../src/core/session.js";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- Chargement du contenu livré ---------- */

const bac = {};
new Function("window", readFileSync(join(RACINE, "cours.js"), "utf8"))(bac);
const CONTENU = bac.LULU_CONTENT || bac.LETZ_CONTENT;

/** Même mise à plat que content.js : une entrée par occurrence. */
const ITEMS = [];
CONTENU.COURS.forEach((lecon, li) => {
  lecon.i.forEach((it, ii) => ITEMS.push({ ...it, lesson: li, lid: lecon.lid, stage: lecon.e, pos: ii }));
});
const DIALOGUES = CONTENU.DIALOGUES;

const GRAINES = [1, 2, 3, 10, 42, 100, 999, 2026];
const MODES = ["smart", "repeat", "review", "sprint", "listen", "numbers", "mistakes", "dialogue"];

const idDe = (e) => e.it?.id || e.dialogue?.id || e.itemId || "";

/** Progression rendant une part du contenu déjà travaillée, donc due. */
function progression(part) {
  const p = {};
  const d = (n) => ({ n, reussites: n, echecs: 0, avecIndice: 0, sansIndice: n, dernier: 1, echeance: 1 });
  ITEMS.forEach((it, k) => {
    if (k % part !== 0) return;
    p[it.id] = {
      schema: 6,
      dims: {
        comprehension: d(2), rappel: d(k % 8 === 0 ? 5 : 2), production: d(k % 8 === 0 ? 5 : 2),
        fluidite: d(0), prononciation: d(0), transfert: d(0)
      }
    };
  });
  return p;
}

const seance = (mode, prog, graine, minutes = 20) => creerSeance({
  mode, dureeMinutes: minutes, items: ITEMS, dialogues: DIALOGUES,
  progression: prog, leconCourante: 3, etapeCourante: 3, seed: graine
});

/* ---------- Le contenu contient bien des identifiants partagés ---------- */

test("CONTENU RÉEL · des identifiants sont partagés entre plusieurs leçons", () => {
  const compte = new Map();
  for (const it of ITEMS) compte.set(it.id, (compte.get(it.id) || 0) + 1);
  const partages = [...compte.values()].filter((n) => n > 1).length;
  assert.ok(ITEMS.length > 0, "contenu vide");
  assert.ok(partages > 0,
    "aucun identifiant partagé : ce test ne protège plus de rien, vérifier cours.js");
});

/* ---------- Construction ---------- */

test("CONTENU RÉEL · aucune répétition immédiate accidentelle dans la file", () => {
  for (const prog of [{}, progression(3), progression(2)]) {
    for (const mode of MODES) {
      for (const g of GRAINES) {
        const s = seance(mode, prog, g);
        assert.equal(s.diagnosticFile.adjacencesAccidentelles, 0,
          `${mode} / graine ${g} : le diagnostic signale une adjacence accidentelle`);

        const ids = s.file.map(idDe);
        const distincts = new Set(ids).size;
        if (distincts < 2) continue;
        for (let i = 1; i < ids.length; i++) {
          if (ids[i] !== ids[i - 1]) continue;
          assert.equal(s.file[i].adjacenceVoulue, true,
            `${mode} / graine ${g} : répétition immédiate non voulue au rang ${i}`);
        }
      }
    }
  }
});

test("CONTENU RÉEL · les recouvrements de listes sont bien fusionnés", () => {
  const s = seance("repeat", progression(3), 42);
  assert.ok(s.diagnosticFile.fusionnees > 0,
    "aucune fusion alors que neufs, dus, enCours et leconItems se recouvrent");
  const ids = s.file.map(idDe);
  assert.equal(new Set(ids).size, ids.length,
    "une occurrence non intentionnelle apparaît deux fois dans la file");
});

test("CONTENU RÉEL · le mode chiffres garde exactement trois passages par nombre", () => {
  for (const g of GRAINES) {
    const s = seance("numbers", progression(3), g);
    const compte = new Map();
    for (const e of s.file) compte.set(e.it.id, (compte.get(e.it.id) || 0) + 1);
    assert.ok(compte.size > 1, "pool de chiffres trop petit pour être significatif");
    for (const [id, n] of compte) {
      assert.equal(n, 3, `graine ${g} : ${id} apparaît ${n} fois au lieu de trois`);
    }
    assert.ok(s.file.every((e) => e.it.stage === 1));
  }
});

test("CONTENU RÉEL · le mode voiture garde le couple écoute puis répétition", () => {
  const s = seance("smart", {}, 42);
  const ecoutes = s.file.filter((e) => e.type === "listen");
  assert.ok(ecoutes.length > 0, "aucune découverte");
  for (const e of ecoutes) {
    const i = s.file.indexOf(e);
    assert.equal(s.file[i + 1]?.it?.id, e.it.id, "la répétition doit suivre l'écoute");
    assert.equal(s.file[i + 1].adjacenceVoulue, true);
  }
});

test("CONTENU RÉEL · une même graine reconstruit exactement la même file", () => {
  const prog = progression(3);
  for (const mode of MODES) {
    for (const g of GRAINES) {
      assert.deepEqual(seance(mode, prog, g).file.map(idDe),
                       seance(mode, prog, g).file.map(idDe),
                       `${mode} / graine ${g} : file non reproductible`);
    }
  }
});

test("CONTENU RÉEL · la réserve de recyclage ne contient aucun doublon", () => {
  for (const prog of [{}, progression(3)]) {
    for (const g of GRAINES) {
      const s = seance("review", prog, g);
      const ids = s.recyclage.map((i) => i.id);
      assert.ok(ids.length > 0, "réserve vide : une séance longue s'arrêterait trop tôt");
      assert.equal(new Set(ids).size, ids.length, `graine ${g} : doublon dans la réserve`);
    }
  }
});

/* ---------- Parcours complet ---------- */

test("CONTENU RÉEL · une séance entière ne répète jamais deux fois de suite", () => {
  for (const mode of MODES) {
    for (const g of GRAINES) {
      const s = seance(mode, progression(3), g, 45);
      const distinctsFile = new Set(s.file.map(idDe)).size;
      const distinctsRecyclage = new Set(s.recyclage.map((i) => i.id)).size;

      let t = 0; demarrer(s, t);
      const joues = [];
      for (let k = 0; k < 400; k++) {
        const ex = prochain(s, t);
        if (!ex) break;
        joues.push({ id: idDe(ex), voulue: !!ex.adjacenceVoulue, recycle: !!ex.recycle });
        const d = 12000;
        t += d;
        terminerExercice(s, ex, d);
      }
      assert.ok(joues.length > 5, `${mode} / graine ${g} : séance vide`);

      for (let i = 1; i < joues.length; i++) {
        if (joues[i].id !== joues[i - 1].id || joues[i].voulue) continue;
        // Une adjacence n'est accidentelle que si la source qui a servi
        // l'exercice disposait réellement d'une autre expression.
        const dispo = (joues[i].recycle || joues[i - 1].recycle) ? distinctsRecyclage : distinctsFile;
        assert.ok(dispo < 2,
          `${mode} / graine ${g} : répétition immédiate évitable au rang ${i}`);
      }
    }
  }
});

test("CONTENU RÉEL · Pause, Suivant, Reprendre donne une autre expression", () => {
  for (const mode of ["smart", "repeat", "review", "sprint", "numbers", "listen"]) {
    for (const g of GRAINES) {
      const s = seance(mode, progression(3), g);
      demarrer(s, 0);
      const avant = prochain(s, 100);
      assert.ok(avant, `${mode} / graine ${g} : aucun exercice`);
      const idAvant = idDe(avant);

      // Suivant pendant la pause : l'index avance, rien n'est joué.
      sauterExercice(s, avant);
      assert.equal(s.sautes, 1, "exactement une expression sautée");
      assert.equal(s.correct, 0);
      assert.equal(s.tentatives, 0);
      assert.equal(s.historique.at(-1).dureeMs, 0, "un saut ne doit pas fausser le minutage");

      const apres = prochain(s, 200);
      assert.ok(apres, `${mode} / graine ${g} : plus rien après le saut`);
      assert.notEqual(idDe(apres), idAvant,
        `${mode} / graine ${g} : la même expression est revenue après Suivant`);
    }
  }
});

test("CONTENU RÉEL · sauter une découverte écarte aussi sa répétition liée", () => {
  const s = seance("smart", {}, 42);
  demarrer(s, 0);
  const ex = prochain(s, 100);
  assert.equal(ex.type, "listen", "le mode voiture doit commencer par une écoute");
  const id = idDe(ex);
  sauterExercice(s, ex);
  assert.equal(s.sautes, 1, "une seule EXPRESSION sautée");
  const apres = prochain(s, 200);
  assert.notEqual(idDe(apres), id, "l'expression écartée est revenue par sa répétition liée");
  const traces = s.historique.filter((h) => h.saute && h.id === id);
  assert.equal(traces.length, 2, "les deux occurrences doivent être tracées");
  assert.equal(traces[1].lie, true);
});

test("CONTENU RÉEL · le dialogue ne rejoue jamais le même échange de suite", () => {
  for (const g of GRAINES) {
    const s = seance("dialogue", progression(3), g);
    const ids = s.file.map(idDe);
    assert.ok(ids.length > 1, "pas assez de dialogues accessibles");
    for (let i = 1; i < ids.length; i++) assert.notEqual(ids[i], ids[i - 1]);
  }
});
