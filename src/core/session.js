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

import { estDu, niveauGlobal, normaliser as normaliserEntree, echeance, NIVEAU_SOLIDE } from "./preuve.js";
import { resoudreRng } from "./rng.js";
import { construireFile, construireRecyclage } from "./file.js";

export const TYPES = { ECOUTE: "listen", ORAL: "speak", NOMBRE: "number", DIALOGUE: "dialogue" };

/** Estimations initiales en millisecondes. Remplacées par le mesuré dès le 2e exercice. */
const ESTIMATION_INITIALE = {
  [TYPES.ECOUTE]: 11000,
  [TYPES.ORAL]: 17000,
  [TYPES.NOMBRE]: 8000,
  [TYPES.DIALOGUE]: 55000
};

const RESERVE_CLOTURE_MS = 20000;

export function creerSeance({ mode, dureeMinutes, items, dialogues, progression,
                              leconCourante, etapeCourante, rng, seed }) {
  const cible = Math.max(1, Number(dureeMinutes) || 10) * 60000;
  const prog = (id) => normaliserEntree(progression?.[id]);
  // Aléa injectable. En production, aléa normal. En test, graine
  // reproductible : la même graine redonne exactement la même file.
  const tirage = resoudreRng({ rng, seed });

  const dus = items.filter((i) => estDu(prog(i.id)));
  const solides = items.filter((i) => niveauGlobal(prog(i.id)) >= NIVEAU_SOLIDE);
  const enCours = items.filter((i) => { const n = niveauGlobal(prog(i.id)); return n > 0 && n < NIVEAU_SOLIDE; });
  const neufs = items.filter((i) => i.lesson === leconCourante && niveauGlobal(prog(i.id)) === 0);
  const fragiles = items
    .filter((i) => (prog(i.id).dims.rappel.echecs > 0 || (prog(i.id).legacy?.errors || 0) > 0))
    .sort((a, b) => (prog(b.id).dims.rappel.echecs || 0) - (prog(a.id).dims.rappel.echecs || 0));

  const contexte = { mode, dus, solides, enCours, neufs, fragiles, items, dialogues,
                     leconCourante, etapeCourante, rng: tirage,
                     echeanceDe: (it) => echeance(prog(it.id)) };

  const construite = construireFile(contexte);

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
    sautes: 0,
    rng: tirage,
    file: construite.file,
    // Traçabilité de la construction : occurrences fusionnées,
    // déplacements, adjacences subies. Aucune fusion silencieuse.
    diagnosticFile: construite.diagnostic,
    // Dernier itemId réellement consommé. Sert de garde-fou au moment
    // du recyclage, là où la file ne peut plus rien garantir.
    dernierId: "",
    // Réserve de rappel. Elle ne doit jamais être vide, sinon une séance
    // longue lancée sur du contenu neuf se termine au bout de deux minutes.
    recyclage: construireRecyclage({ dus, enCours, solides, items, leconCourante, etapeCourante, rng: tirage })
  };
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

  // Filet de sécurité à la lecture. La file est déjà espacée à la
  // construction, mais un remplacement de fin de séance peut retirer
  // l'expression qui séparait deux occurrences. On déplace alors le
  // bloc suivant devant, sans jamais rien supprimer.
  eviterRepetitionImmediate(s);

  let candidat = s.file[s.index];
  if (!candidat) {
    // La file est épuisée avant la fin du temps. On recycle des révisions
    // plutôt que d'arrêter la séance trop tôt.
    if (!s.recyclage.length) return null;
    const n = s.recyclage.length;
    let k = s.index % n;
    // Garde-fou de bord : au passage de la file au recyclage, puis à
    // chaque bouclage, l'expression suivante ne doit pas être celle qui
    // vient d'être consommée. La file, elle, est déjà espacée.
    if (n > 1 && s.recyclage[k] && s.recyclage[k].id === s.dernierId) k = (k + 1) % n;
    candidat = { type: TYPES.ORAL, it: s.recyclage[k], recycle: true,
                 source: "recyclage", raison: "recyclage", intentionnelle: true, itemId: s.recyclage[k]?.id || "" };
  }

  const estime = s.estimations[candidat.type] || 15000;
  // Un exercice trop long pour le temps restant est remplacé par un plus court.
  if (estime > restant) {
    const courts = s.file.slice(s.index).filter((e) => (s.estimations[e.type] || 15000) <= restant);
    if (!courts.length) return null;
    // Le remplacement ne doit pas réintroduire une répétition immédiate.
    return courts.find((e) => idDe(e) !== s.dernierId) || courts[0];
  }
  return candidat;
}

/**
 * Consomme une position de file.
 *
 * Défaut corrigé au GATE 2.5 : quand la fin de séance imposait un
 * exercice plus court pris plus loin dans la file, l'index sautait
 * jusqu'à lui. Toutes les occurrences intermédiaires étaient perdues
 * sans trace. On retire désormais l'occurrence retenue à sa place et
 * l'index ne bouge pas : rien n'est sauté silencieusement.
 */
function consommerPosition(s, exercice) {
  const pos = s.file.indexOf(exercice);
  if (pos < 0) { s.index += 1; return pos; }          // exercice recyclé
  if (pos === s.index) { s.index = pos + 1; return pos; }
  s.file.splice(pos, 1);                              // remplacement de fin de séance
  return pos;
}

/** Identifiant de l'expression portée par un exercice, quel que soit son type. */
const idDe = (e) => e?.it?.id || e?.dialogue?.id || e?.itemId || "";

/**
 * Déplace le prochain bloc d'une AUTRE expression devant la position
 * courante lorsque celle-ci répéterait immédiatement la précédente.
 *
 * Trois garanties :
 *   aucune occurrence n'est supprimée, seulement déplacée ;
 *   une adjacence explicitement voulue n'est jamais défaite ;
 *   si aucune autre expression n'est disponible, on ne force rien.
 */
function eviterRepetitionImmediate(s) {
  const courant = s.file[s.index];
  if (!courant || !s.dernierId) return;
  if (courant.adjacenceVoulue) return;
  if (idDe(courant) !== s.dernierId) return;

  let j = s.index + 1;
  while (j < s.file.length && (idDe(s.file[j]) === s.dernierId || s.file[j].adjacenceVoulue)) j++;
  if (j >= s.file.length) return;              // adjacence inévitable, assumée

  let fin = j + 1;
  while (fin < s.file.length && s.file[fin].adjacenceVoulue && idDe(s.file[fin]) === idDe(s.file[j])) fin++;
  s.file.splice(s.index, 0, ...s.file.splice(j, fin - j));
}

/**
 * Passe un exercice sans le compter comme fait.
 *
 * L'index avance d'exactement un cran, mais la durée n'alimente PAS
 * l'estimation : un exercice sauté dure une seconde et fausserait la
 * moyenne mobile, donc le minutage de toute la séance.
 */
export function sauterExercice(s, exercice) {
  s.historique.push({ type: exercice.type, dureeMs: 0, saute: true,
                      id: exercice.it?.id || exercice.dialogue?.id || "" });
  const id = idDe(exercice);
  const pos = consommerPosition(s, exercice);

  // Une occurrence LIÉE porte la même expression et n'existe que pour
  // suivre celle qu'on vient de sauter : la répétition qui suit une
  // écoute de découverte. La laisser en place ferait revenir aussitôt
  // l'expression que l'utilisateur vient d'écarter. Une seule EXPRESSION
  // est sautée, même si elle portait deux occurrences soudées.
  if (pos >= 0) {
    while (s.file[s.index] && s.file[s.index].adjacenceVoulue && idDe(s.file[s.index]) === id) {
      s.historique.push({ type: s.file[s.index].type, dureeMs: 0, saute: true, id, lie: true });
      s.index += 1;
    }
  }

  s.sautes = (s.sautes || 0) + 1;
  s.dernierId = id;
  return s;
}

/** Enregistre la durée réelle et fait avancer l'index. */
export function terminerExercice(s, exercice, dureeMs) {
  const t = exercice.type;
  const prec = s.estimations[t] || ESTIMATION_INITIALE[t] || 15000;
  // Moyenne mobile. L'estimation colle vite au comportement réel de l'appareil.
  s.estimations[t] = Math.round(prec * 0.65 + dureeMs * 0.35);
  s.historique.push({ type: t, dureeMs, id: exercice.it?.id || exercice.dialogue?.id || "" });
  consommerPosition(s, exercice);
  s.dernierId = idDe(exercice);
  return s;
}

export function bilan(s, maintenant = Date.now()) {
  const minutes = Math.round(ecouleMs(s, maintenant) / 60000);
  const precision = s.fiables ? Math.round((s.correct / s.fiables) * 100) : null;
  return {
    minutes,
    minutesCible: Math.round(s.cibleMs / 60000),
    exercices: s.historique.filter((h) => !h.saute).length,
    sautes: s.sautes || 0,
    tentatives: s.tentatives,
    fiables: s.fiables,
    correct: s.correct,
    // Aucune précision affichée si aucune mesure fiable. On n'invente pas de chiffre.
    precision
  };
}
