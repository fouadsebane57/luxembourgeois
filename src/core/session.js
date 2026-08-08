/* ===================================================================
   MOTEUR DE SÉANCE

   L'ancien moteur construisait un tableau de `durée × 1,5` exercices
   puis les enchaînait sans jamais regarder l'horloge. Une séance de
   30 minutes pouvait durer 12 ou 50 minutes.

   Ici, la séance est un flux, pas une liste. À chaque tour :
     temps restant -> estimation du prochain exercice -> on continue ou on clôt.
   L'estimation s'ajuste sur les durées réellement observées.

   Un exercice commencé n'est jamais coupé. La clôture est annoncée.
   =================================================================== */

import { estDu, niveauGlobal, normaliserEntree, NIVEAU_SOLIDE } from "./scheduler.js";

export const TYPES = { ECOUTE: "listen", ORAL: "speak", NOMBRE: "number", DIALOGUE: "dialogue" };

/** Estimations initiales en millisecondes. Remplacées par le mesuré dès le 2e exercice. */
const ESTIMATION_INITIALE = {
  [TYPES.ECOUTE]: 11000,
  [TYPES.ORAL]: 17000,
  [TYPES.NOMBRE]: 8000,
  [TYPES.DIALOGUE]: 55000
};

const RESERVE_CLOTURE_MS = 20000;

export function creerSeance({ mode, dureeMinutes, items, dialogues, progression, leconCourante, etapeCourante }) {
  const cible = Math.max(1, Number(dureeMinutes) || 10) * 60000;
  const prog = (id) => normaliserEntree(progression?.[id]);

  const dus = items.filter((i) => estDu(prog(i.id)));
  const solides = items.filter((i) => niveauGlobal(prog(i.id)) >= NIVEAU_SOLIDE);
  const enCours = items.filter((i) => { const n = niveauGlobal(prog(i.id)); return n > 0 && n < NIVEAU_SOLIDE; });
  const neufs = items.filter((i) => i.lesson === leconCourante && niveauGlobal(prog(i.id)) === 0);
  const fragiles = items.filter((i) => prog(i.id).errors > 0).sort((a, b) => prog(b.id).errors - prog(a.id).errors);

  return {
    mode,
    cibleMs: cible,
    demarree: false,
    debut: 0,
    index: 0,
    correct: 0,
    tentatives: 0,
    fiables: 0,
    estimations: { ...ESTIMATION_INITIALE },
    historique: [],
    file: construireFile({ mode, dus, solides, enCours, neufs, fragiles, items, dialogues, leconCourante, etapeCourante }),
    // Réserve de rappel. Elle ne doit jamais être vide, sinon une séance
    // longue lancée sur du contenu neuf se termine au bout de deux minutes.
    recyclage: reserveRecyclage({ dus, enCours, solides, items, leconCourante, etapeCourante })
  };
}

function reserveRecyclage({ dus, enCours, solides, items, leconCourante, etapeCourante }) {
  const travailles = [...dus, ...enCours, ...solides];
  if (travailles.length >= 8) return melanger(travailles).slice(0, 80);
  // Contenu déjà vu insuffisant : on complète avec la leçon courante,
  // les leçons déjà atteintes, puis le reste du programme accessible.
  const atteintes = items.filter((i) => i.lesson <= leconCourante || i.stage <= etapeCourante);
  const socle = atteintes.length ? atteintes : items;
  return melanger([...travailles, ...socle]).slice(0, 80);
}

function construireFile({ mode, dus, solides, enCours, neufs, fragiles, items, dialogues, leconCourante, etapeCourante }) {
  const leconItems = items.filter((i) => i.lesson === leconCourante);
  const ex = (type, it) => ({ type, it });

  if (mode === "listen") {
    return melanger([...dus, ...leconItems, ...solides]).map((i) => ex(TYPES.ECOUTE, i));
  }
  if (mode === "numbers") {
    // Sélection par étape, pas par position. L'ancien code filtrait sur lesson<=4,
    // ce qui cassait au moindre réordonnancement de cours.js.
    const nombres = items.filter((i) => i.stage === 1);
    return melanger([...nombres, ...nombres, ...nombres]).map((i) => ex(TYPES.NOMBRE, i));
  }
  if (mode === "dialogue") {
    return melanger(dialogues.filter((d) => d.e <= etapeCourante)).map((d) => ({ type: TYPES.DIALOGUE, dialogue: d }));
  }
  if (mode === "mistakes") {
    const pool = fragiles.length ? fragiles : [...dus, ...enCours];
    return melanger(pool).map((i) => ex(TYPES.ORAL, i));
  }
  if (mode === "repeat") {
    // Séance de répétition pure. Elle ne dépend d'aucun service :
    // modèle, enregistrement, comparaison à l'oreille.
    const socle = [...neufs, ...dus, ...enCours, ...leconItems];
    return melanger(socle.length ? socle : items).map((i) => ex(TYPES.ORAL, i));
  }
  if (mode === "review") {
    return melanger([...dus, ...enCours]).map((i) => ex(TYPES.ORAL, i));
  }
  if (mode === "sprint") {
    return melanger([...dus, ...solides, ...leconItems]).map((i) => ex(TYPES.ORAL, i));
  }
  // smart : découverte, rappel, consolidation, alternés.
  const decouverte = neufs.slice(0, 12);
  const plan = [];
  const rappel = melanger(dus);
  const conso = melanger([...enCours, ...solides]);
  let a = 0, b = 0, c = 0;
  // Une écoute pour trois oraux. La découverte commence par une écoute.
  while (a < decouverte.length || b < rappel.length || c < conso.length) {
    if (a < decouverte.length) { plan.push(ex(TYPES.ECOUTE, decouverte[a])); plan.push(ex(TYPES.ORAL, decouverte[a])); a++; }
    if (b < rappel.length) plan.push(ex(TYPES.ORAL, rappel[b++]));
    if (b < rappel.length) plan.push(ex(TYPES.ORAL, rappel[b++]));
    if (c < conso.length) plan.push(ex(TYPES.ORAL, conso[c++]));
  }
  if (!plan.length) melanger(leconItems).forEach((i) => plan.push(ex(TYPES.ORAL, i)));
  return plan;
}

/** Démarre le chronomètre. Appelé au premier exercice, pas à la construction. */
export function demarrer(s, maintenant = Date.now()) { s.debut = maintenant; s.demarree = true; return s; }

export const ecouleMs = (s, maintenant = Date.now()) => (s.demarree ? Math.max(0, maintenant - s.debut) : 0);
export const restantMs = (s, maintenant = Date.now()) => Math.max(0, s.cibleMs - ecouleMs(s, maintenant));

export function progressionTemps(s, maintenant = Date.now()) {
  return Math.min(1, ecouleMs(s, maintenant) / s.cibleMs);
}

/**
 * Renvoie le prochain exercice, ou null si la séance doit se clore.
 * Décision fondée sur le temps restant, jamais sur un compteur d'items.
 */
export function prochain(s, maintenant = Date.now()) {
  const restant = restantMs(s, maintenant) - RESERVE_CLOTURE_MS;
  if (restant <= 0) return null;

  let candidat = s.file[s.index];
  if (!candidat) {
    // La file est épuisée avant la fin du temps. On recycle des révisions
    // plutôt que d'arrêter la séance trop tôt.
    if (!s.recyclage.length) return null;
    const it = s.recyclage[s.index % s.recyclage.length];
    candidat = { type: TYPES.ORAL, it, recycle: true };
  }

  const estime = s.estimations[candidat.type] || 15000;
  // Un exercice trop long pour le temps restant est remplacé par un plus court.
  if (estime > restant) {
    const court = s.file.slice(s.index).find((e) => (s.estimations[e.type] || 15000) <= restant);
    if (!court) return null;
    return court;
  }
  return candidat;
}

/** Enregistre la durée réelle et fait avancer l'index. */
export function terminerExercice(s, exercice, dureeMs) {
  const t = exercice.type;
  const prec = s.estimations[t] || ESTIMATION_INITIALE[t] || 15000;
  // Moyenne mobile. L'estimation colle vite au comportement réel de l'appareil.
  s.estimations[t] = Math.round(prec * 0.65 + dureeMs * 0.35);
  s.historique.push({ type: t, dureeMs, id: exercice.it?.id || exercice.dialogue?.id || "" });
  const pos = s.file.indexOf(exercice);
  s.index = pos >= 0 ? pos + 1 : s.index + 1;
  return s;
}

export function bilan(s, maintenant = Date.now()) {
  const minutes = Math.round(ecouleMs(s, maintenant) / 60000);
  const precision = s.fiables ? Math.round((s.correct / s.fiables) * 100) : null;
  return {
    minutes,
    minutesCible: Math.round(s.cibleMs / 60000),
    exercices: s.historique.length,
    tentatives: s.tentatives,
    fiables: s.fiables,
    correct: s.correct,
    // Aucune précision affichée si aucune mesure fiable. On n'invente pas de chiffre.
    precision
  };
}

function melanger(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}
