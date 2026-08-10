/* ===================================================================
   ÉTAT APPLICATIF

   Source de vérité côté client pour l'apprentissage.
   Le statut Premium n'est PAS géré ici : il est lu depuis le serveur.
   Voir data/entitlements.js.
   =================================================================== */

import { migrerLocal, chargerTable, CLE_V5 } from "./migrate.js";
import { migrerLocalV6, CLE_V6, SCHEMA_COURANT, restaurerV5 } from "./migration6.js";
import * as Preuve from "./preuve.js";
import { COURS } from "./content.js";

const lireCle = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const ecrireCle = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
const supprimerCle = (k) => { try { localStorage.removeItem(k); } catch (_) {} };

export const DEFAUTS = {
  schema: SCHEMA_COURANT,
  progress: {},
  validated: {},
  favorites: {},
  journal: { sessions: 0, minutes: 0, last: null, streak: 0, hist: {} },
  settings: {
    duration: 20, dailyGoal: 20,
    recognition: "auto",          // auto | cloud | browser | echo
    profilAudio: "calme",         // calme | voiture
    micDeviceId: "",
    attenteMaxMs: 4500, paroleMaxMs: 9000,
    voiceRate: 0.85, luxVoice: "", frVoice: "",
    tips: true, echo: true, commandesVocales: false, contexte: "trajet"
  },
  profile: { name: "Apprenant", email: "" },

  // Reprise exacte. Sans ça, l'utilisateur recommence au début à chaque
  // ouverture, ce qui est la plainte numéro un sur ce type d'application.
  reprise: {
    mode: "",            // dernier mode lancé
    lecon: 0,            // index de leçon
    lid: "",             // identifiant permanent de la leçon
    itemId: "",          // identifiant permanent de la dernière expression
    position: 0,         // rang dans la file de la séance
    dateMs: 0,           // horodatage
    seanceMinutes: 0,    // durée choisie
    terminee: true       // false si la séance a été interrompue
  },

  sync: { lastPushed: 0, lastPulled: 0, pending: false, deviceId: "" }
};

let etat = structuredClone(DEFAUTS);
let rapportMigration = null;
let minuteurSync = null;
let pousserVersCloud = null;   // injecté par data/sync.js

export const state = () => etat;
export const migration = () => rapportMigration;

export async function charger() {
  await chargerTable();

  // 1. État déjà au format 6.
  let v6 = null;
  try { v6 = JSON.parse(lireCle(CLE_V6) || "null"); } catch (_) {}
  if (v6?.schema === SCHEMA_COURANT) {
    etat = fusionProfonde(structuredClone(DEFAUTS), v6);
    Object.keys(etat.progress).forEach((k) => { etat.progress[k] = Preuve.normaliser(etat.progress[k]); });
    if (!etat.sync.deviceId) etat.sync.deviceId = identifiantAppareil();
    sauver(false);
    return etat;
  }

  // 2. Migration 5 vers 6 : sauvegarde, migration, vérification.
  //    Aucune écriture si un seul niveau a baissé.
  const m6 = migrerLocalV6(lireCle, ecrireCle);
  rapportMigration = m6.rapport;
  if (m6.etat) {
    etat = fusionProfonde(structuredClone(DEFAUTS), m6.etat);
    Object.keys(etat.progress).forEach((k) => { etat.progress[k] = Preuve.normaliser(etat.progress[k]); });
    if (!etat.sync.deviceId) etat.sync.deviceId = identifiantAppareil();
    sauver(false);
    return etat;
  }
  if (m6.rapport.verification && !m6.rapport.verification.ok) {
    console.error("Migration refusée, progression conservée telle quelle :", m6.rapport.verification.problemes.slice(0, 5));
  }

  // 3. Aucun état 6 : on repart de la chaîne v3 et v4.
  let v5 = null;
  try { v5 = JSON.parse(lireCle(CLE_V5) || "null"); } catch (_) {}
  if (v5 && v5.schema === 5) {
    etat = fusionProfonde(structuredClone(DEFAUTS), v5);
    etat.schema = SCHEMA_COURANT;
  } else {
    const { etat: migre, rapport } = migrerLocal(COURS());
    rapportMigration = rapport;
    etat = structuredClone(DEFAUTS);
    if (migre) {
      etat.progress = migre.progress || {};
      etat.validated = migre.validated || {};
      etat.favorites = migre.favorites || {};
      if (migre.journal) etat.journal = fusionProfonde(etat.journal, migre.journal);
      if (migre.settings) etat.settings = fusionProfonde(etat.settings, migre.settings);
      if (migre.profile) etat.profile = fusionProfonde(etat.profile, migre.profile);
    }
  }
  if (!etat.sync.deviceId) etat.sync.deviceId = identifiantAppareil();
  Object.keys(etat.progress).forEach((k) => { etat.progress[k] = Preuve.normaliser(etat.progress[k]); });
  sauver(false);
  return etat;
}

/** Retour arrière vers la progression d'avant migration. */
export function restaurerProgressionPrecedente() {
  return restaurerV5(lireCle, ecrireCle, supprimerCle);
}

function identifiantAppareil() {
  try {
    const c = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    return c;
  } catch (_) { return "dev-" + Date.now(); }
}

export function sauver(synchroniser = true) {
  try { localStorage.setItem(CLE_V6, JSON.stringify(etat)); }
  catch (e) { console.warn("Sauvegarde locale impossible", e); }
  if (synchroniser && pousserVersCloud) {
    etat.sync.pending = true;
    clearTimeout(minuteurSync);
    minuteurSync = setTimeout(() => pousserVersCloud().catch(() => {}), 2000);
  }
}

export function brancherSync(fn) { pousserVersCloud = fn; }

export const progressionDe = (id) => Preuve.normaliser(etat.progress[id]);
export const niveauDe = (id, dim) => Preuve.niveau(etat.progress[id], dim);

/**
 * Écrit une PREUVE. Seule la transcription fiable est acceptée.
 * Renvoie aussi la raison d'un éventuel refus, pour le journal.
 */
export function enregistrerPreuve(id, p) {
  const avant = progressionDe(id);
  const { entree, ecrit, raison } = Preuve.enregistrerPreuve(avant, p);
  if (!ecrit) return { entree: avant, ecrit: false, raison };
  etat.progress[id] = entree;
  sauver();
  return { entree, ecrit: true, raison: "" };
}

/** Écrit un SIGNAL. N'entre dans aucune dimension de maîtrise. */
export function enregistrerAutoEvaluation(id, valeur) {
  etat.progress[id] = Preuve.noterAutoEvaluation(progressionDe(id), valeur);
  sauver();
  return etat.progress[id];
}

export function enregistrerRythme(id, mesures) {
  etat.progress[id] = Preuve.noterRythme(progressionDe(id), mesures);
  sauver();
  return etat.progress[id];
}

/**
 * Enregistre une écoute. Ne fait monter AUCUNE dimension.
 * C'est la correction P0.1 : en 5.1.0, deux écoutes suffisaient à
 * faire monter le niveau de compréhension sans aucune preuve.
 */
export function enregistrerExposition(id) {
  etat.progress[id] = Preuve.exposer(progressionDe(id));
  sauver();
  return etat.progress[id];
}

/**
 * Résultat d'un exercice oral.
 *
 * Une transcription correspondant à l'attendu prouve la PRODUCTION
 * LEXICALE : l'utilisateur a bien dit ce mot, et il était assez
 * intelligible pour le moteur. Elle ne prouve PAS la prononciation :
 * un moteur reconnaît souvent le bon mot malgré un accent marqué.
 * La dimension prononciation reste donc non mesurée.
 *
 * Tout ce qui n'est pas une transcription fiable est refusé ici et
 * doit passer par les fonctions de signaux.
 */
export function enregistrerResultat(id, { fiable, reussi, avecIndice, latenceMs } = {}) {
  if (!fiable) return { entree: progressionDe(id), ecrit: false, raison: "source_non_probante" };
  const r = enregistrerPreuve(id, {
    dim: Preuve.DIM.PRODUCTION, source: Preuve.SOURCE.TRANSCRIPTION,
    reussi: !!reussi, avecIndice: !!avecIndice, latenceMs
  });
  // Produire à voix haute depuis le français démontre aussi le rappel.
  if (r.ecrit && reussi && !avecIndice) {
    enregistrerPreuve(id, {
      dim: Preuve.DIM.RAPPEL, source: Preuve.SOURCE.TRANSCRIPTION,
      reussi: true, avecIndice: false, latenceMs
    });
  }
  return r;
}

/** Mémorise où l'utilisateur en est. Appelé après chaque exercice. */
export function noterPosition({ mode, lecon, lid, itemId, position, seanceMinutes, terminee }) {
  const r = etat.reprise;
  if (mode !== undefined) r.mode = mode;
  if (lecon !== undefined) r.lecon = lecon;
  if (lid !== undefined) r.lid = lid;
  if (itemId !== undefined) r.itemId = itemId;
  if (position !== undefined) r.position = position;
  if (seanceMinutes !== undefined) r.seanceMinutes = seanceMinutes;
  if (terminee !== undefined) r.terminee = terminee;
  r.dateMs = Date.now();
  sauver();
  return r;
}

export const reprise = () => etat.reprise;

/** Y a-t-il quelque chose à reprendre ? */
export function aReprendre() {
  const r = etat.reprise;
  return !!(r.dateMs && r.mode);
}

export function instantane() {
  return {
    schema: SCHEMA_COURANT,
    contentVersion: (window.LULU_CONTENT || window.LETZ_CONTENT || {}).contentVersion || "",
    appVersion: (window.LULU_CONFIG || window.LETZ_CONFIG || {}).appVersion || "",
    updatedAt: new Date().toISOString(),
    deviceId: etat.sync.deviceId,
    progress: etat.progress,
    validated: etat.validated,
    favorites: etat.favorites,
    journal: etat.journal,
    settings: etat.settings,
    profile: etat.profile,
    reprise: etat.reprise
  };
}

/** Fusion d'un instantané distant. Conflit arbitré par lastSeen, pas par maximum. */
export function fusionnerDistant(distant) {
  if (!distant || typeof distant !== "object") return { fusionnees: 0, ajoutees: 0 };
  let fusionnees = 0, ajoutees = 0;
  for (const [id, valeur] of Object.entries(distant.progress || {})) {
    if (etat.progress[id]) { etat.progress[id] = Preuve.fusionner(etat.progress[id], valeur); fusionnees++; }
    else { etat.progress[id] = Preuve.normaliser(valeur); ajoutees++; }
  }
  etat.validated = { ...(distant.validated || {}), ...etat.validated };
  etat.favorites = { ...(distant.favorites || {}), ...etat.favorites };
  const j = distant.journal || {};
  etat.journal.sessions = Math.max(etat.journal.sessions || 0, j.sessions || 0);
  etat.journal.minutes = Math.max(etat.journal.minutes || 0, j.minutes || 0);
  etat.journal.streak = Math.max(etat.journal.streak || 0, j.streak || 0);
  etat.journal.hist = { ...(j.hist || {}), ...(etat.journal.hist || {}) };
  // La position de reprise la plus récente fait foi, quel que soit l'appareil.
  const rd = distant.reprise;
  if (rd?.dateMs && rd.dateMs > (etat.reprise.dateMs || 0)) etat.reprise = { ...etat.reprise, ...rd };
  etat.sync.lastPulled = Date.now();
  sauver(false);
  return { fusionnees, ajoutees };
}

export function reinitialiserProgression() {
  etat.progress = {}; etat.validated = {}; etat.favorites = {};
  etat.journal = structuredClone(DEFAUTS.journal);
  etat.reprise = structuredClone(DEFAUTS.reprise);
  sauver();
}

function fusionProfonde(cible, source) {
  for (const [k, v] of Object.entries(source || {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && cible[k] && typeof cible[k] === "object") fusionProfonde(cible[k], v);
    else if (v !== undefined) cible[k] = v;
  }
  return cible;
}
