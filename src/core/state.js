/* ===================================================================
   ÉTAT APPLICATIF

   Source de vérité côté client pour l'apprentissage.
   Le statut Premium n'est PAS géré ici : il est lu depuis le serveur.
   Voir data/entitlements.js.
   =================================================================== */

import { migrerLocal, chargerTable, CLE_V5 } from "./migrate.js";
import { normaliserEntree, appliquer, exposer, fusionner } from "./scheduler.js";
import { COURS } from "./content.js";

export const DEFAUTS = {
  schema: 5,
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
    tips: true, echo: true
  },
  profile: { name: "Apprenant", email: "" },
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
  let v5 = null;
  try { v5 = JSON.parse(localStorage.getItem(CLE_V5) || "null"); } catch (_) {}

  if (v5 && v5.schema === 5) {
    etat = fusionProfonde(structuredClone(DEFAUTS), v5);
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
  Object.keys(etat.progress).forEach((k) => { etat.progress[k] = normaliserEntree(etat.progress[k]); });
  sauver(false);
  return etat;
}

function identifiantAppareil() {
  try {
    const c = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    return c;
  } catch (_) { return "dev-" + Date.now(); }
}

export function sauver(synchroniser = true) {
  try { localStorage.setItem(CLE_V5, JSON.stringify(etat)); }
  catch (e) { console.warn("Sauvegarde locale impossible", e); }
  if (synchroniser && pousserVersCloud) {
    etat.sync.pending = true;
    clearTimeout(minuteurSync);
    minuteurSync = setTimeout(() => pousserVersCloud().catch(() => {}), 2000);
  }
}

export function brancherSync(fn) { pousserVersCloud = fn; }

export const progressionDe = (id) => normaliserEntree(etat.progress[id]);

/** Écrit un résultat. Un effet `none` ne touche à rien. */
export function enregistrerResultat(id, effet, dimension, meta) {
  const avant = progressionDe(id);
  const apres = appliquer(avant, effet, dimension, meta);
  if (JSON.stringify(avant) === JSON.stringify(apres)) return apres;
  etat.progress[id] = apres;
  sauver();
  return apres;
}

export function enregistrerExposition(id) {
  etat.progress[id] = exposer(progressionDe(id));
  sauver();
  return etat.progress[id];
}

export function instantane() {
  return {
    schema: 5,
    contentVersion: (window.LETZ_CONTENT || {}).contentVersion || "",
    appVersion: (window.LETZ_CONFIG || {}).appVersion || "",
    updatedAt: new Date().toISOString(),
    deviceId: etat.sync.deviceId,
    progress: etat.progress,
    validated: etat.validated,
    favorites: etat.favorites,
    journal: etat.journal,
    settings: etat.settings,
    profile: etat.profile
  };
}

/** Fusion d'un instantané distant. Conflit arbitré par lastSeen, pas par maximum. */
export function fusionnerDistant(distant) {
  if (!distant || typeof distant !== "object") return { fusionnees: 0, ajoutees: 0 };
  let fusionnees = 0, ajoutees = 0;
  for (const [id, valeur] of Object.entries(distant.progress || {})) {
    if (etat.progress[id]) { etat.progress[id] = fusionner(etat.progress[id], valeur); fusionnees++; }
    else { etat.progress[id] = normaliserEntree(valeur); ajoutees++; }
  }
  etat.validated = { ...(distant.validated || {}), ...etat.validated };
  etat.favorites = { ...(distant.favorites || {}), ...etat.favorites };
  const j = distant.journal || {};
  etat.journal.sessions = Math.max(etat.journal.sessions || 0, j.sessions || 0);
  etat.journal.minutes = Math.max(etat.journal.minutes || 0, j.minutes || 0);
  etat.journal.streak = Math.max(etat.journal.streak || 0, j.streak || 0);
  etat.journal.hist = { ...(j.hist || {}), ...(etat.journal.hist || {}) };
  etat.sync.lastPulled = Date.now();
  sauver(false);
  return { fusionnees, ajoutees };
}

export function reinitialiserProgression() {
  etat.progress = {}; etat.validated = {}; etat.favorites = {};
  etat.journal = structuredClone(DEFAUTS.journal);
  sauver();
}

function fusionProfonde(cible, source) {
  for (const [k, v] of Object.entries(source || {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && cible[k] && typeof cible[k] === "object") fusionProfonde(cible[k], v);
    else if (v !== undefined) cible[k] = v;
  }
  return cible;
}
