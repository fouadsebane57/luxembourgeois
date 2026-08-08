/* ===================================================================
   MIGRATION DE LA PROGRESSION

   Chaînes prises en charge, dans l'ordre :
     lux:prog / lux:valides / lux:journal / lux:reglages / lux:favoris  (v3)
     letz:v4                                                            (v4)
     letz:v5                                                            (v5)

   Les clés v3 et v4 sont de la forme "indexLeçon-indexItem".
   La table cours.legacy-map.json les traduit en identifiants permanents.

   Deux anciennes clés peuvent pointer vers le même identifiant, car
   sept expressions apparaissaient en double. Elles sont fusionnées.

   La progression d'origine n'est jamais supprimée. Elle est conservée
   sous letz:v4:backup, ce qui permet un retour arrière complet.
   =================================================================== */

import { fusionner, normaliserEntree } from "./scheduler.js";

export const CLE_V5 = "letz:v5";
export const CLE_V4 = "letz:v4";
export const CLE_SAUVEGARDE = "letz:v4:backup";

let TABLE = null;
let TABLE_OK = false;

export const tableChargee = () => TABLE_OK;

/**
 * Charge la table de migration.
 *
 * Ordre : table embarquée dans cours.js, puis fichier séparé en secours.
 * Un échec est signalé, jamais absorbé en silence : une table vide
 * traduirait zéro expression et donnerait l'illusion d'une progression
 * effacée. L'appelant doit vérifier tableChargee() avant de migrer.
 */
export async function chargerTable(url = "cours.legacy-map.json") {
  if (TABLE_OK) return TABLE;

  const embarquee = window.LETZ_LEGACY_MAP;
  if (embarquee && Object.keys(embarquee).length) {
    TABLE = embarquee; TABLE_OK = true; return TABLE;
  }

  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (data.legacy && Object.keys(data.legacy).length) {
      TABLE = data.legacy; TABLE_OK = true; return TABLE;
    }
    throw new Error("table vide");
  } catch (err) {
    console.error("Table de migration indisponible:", err.message);
    TABLE = {}; TABLE_OK = false;
    return TABLE;
  }
}

export function table() { return TABLE || {}; }

/** Traduit un dictionnaire d'anciennes clés en dictionnaire d'identifiants. */
export function traduireProgression(ancien, map = table()) {
  const sortie = {};
  const rapport = { traduites: 0, fusionnees: 0, inconnues: 0, clesInconnues: [] };
  for (const [cle, valeur] of Object.entries(ancien || {})) {
    // Une clé déjà au nouveau format est reprise telle quelle.
    const id = /^lx[0-9a-f]{8}$/.test(cle) ? cle : map[cle];
    if (!id) {
      rapport.inconnues++;
      if (rapport.clesInconnues.length < 20) rapport.clesInconnues.push(cle);
      continue;
    }
    if (sortie[id]) { sortie[id] = fusionner(sortie[id], valeur); rapport.fusionnees++; }
    else { sortie[id] = normaliserEntree(valeur); rapport.traduites++; }
  }
  return { progression: sortie, rapport };
}

/** Traduit les leçons validées, indexées par position, en identifiants de leçon. */
export function traduireValidees(ancien, cours) {
  const sortie = {};
  for (const [cle, v] of Object.entries(ancien || {})) {
    if (!v) continue;
    if (/^ls[0-9a-f]{6}/.test(cle)) { sortie[cle] = true; continue; }
    const idx = Number(cle);
    const lecon = Number.isInteger(idx) ? cours[idx] : null;
    if (lecon?.lid) sortie[lecon.lid] = true;
  }
  return sortie;
}

export function traduireFavoris(ancien, map = table()) {
  const sortie = {};
  for (const [cle, v] of Object.entries(ancien || {})) {
    if (!v) continue;
    const id = /^lx[0-9a-f]{8}$/.test(cle) ? cle : map[cle];
    if (id) sortie[id] = true;
  }
  return sortie;
}

/** Lit les anciennes clés v3 et les remet au format v4. */
export function lireV3() {
  const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (_) { return null; } };
  const prog = lire("lux:prog"), valid = lire("lux:valides"), journal = lire("lux:journal");
  const reg = lire("lux:reglages"), fav = lire("lux:favoris");
  if (!prog && !valid && !journal && !reg && !fav) return null;
  return {
    progress: prog || {},
    validated: valid || {},
    favorites: fav || {},
    journal: journal ? {
      sessions: journal.seances || 0, minutes: journal.minutes || 0,
      last: journal.dernier || null, streak: journal.serie || 0, hist: journal.hist || {}
    } : null,
    settings: reg ? {
      answerSeconds: Math.round((reg.tps || 6000) / 1000),
      voiceRate: reg.vit || 0.85,
      tips: reg.truc !== false,
      echo: reg.echo !== false,
      luxVoice: reg.vDe || "",
      frVoice: reg.vFr || "",
      dailyGoal: reg.obj || 20
    } : null
  };
}

/**
 * Migration complète depuis le stockage local.
 * Idempotente : relancée deux fois, elle ne double rien.
 */
export function migrerLocal(cours) {
  const rapport = { source: "aucune", traduites: 0, fusionnees: 0, inconnues: 0, sauvegarde: false, bloquee: false };

  let brut = null;
  try { brut = JSON.parse(localStorage.getItem(CLE_V4) || "null"); } catch (_) {}
  if (!brut) { const v3 = lireV3(); if (v3) { brut = v3; rapport.source = "v3"; } }
  else rapport.source = "v4";
  if (!brut) return { etat: null, rapport };

  // Garde-fou : une ancienne progression existe mais la table est absente.
  // Migrer produirait un état vide, qui serait ensuite sauvegardé et
  // relu comme définitif. On refuse et on laisse l'ancien état intact.
  if (!TABLE_OK) {
    rapport.bloquee = true;
    return { etat: null, rapport };
  }

  // Sauvegarde avant toute transformation. Base du retour arrière.
  if (!localStorage.getItem(CLE_SAUVEGARDE)) {
    try {
      localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify({ migratedAt: new Date().toISOString(), data: brut }));
      rapport.sauvegarde = true;
    } catch (_) {}
  }

  const t = traduireProgression(brut.progress);
  rapport.traduites = t.rapport.traduites;
  rapport.fusionnees = t.rapport.fusionnees;
  rapport.inconnues = t.rapport.inconnues;

  return {
    etat: {
      schema: 5,
      progress: t.progression,
      validated: traduireValidees(brut.validated, cours),
      favorites: traduireFavoris(brut.favorites),
      journal: brut.journal || null,
      settings: brut.settings || null,
      profile: brut.profile || null
    },
    rapport
  };
}

/** Restaure la progression d'avant migration. Utilisé par la procédure de retour arrière. */
export function restaurerSauvegarde() {
  const s = localStorage.getItem(CLE_SAUVEGARDE);
  if (!s) return false;
  try {
    const { data } = JSON.parse(s);
    localStorage.setItem(CLE_V4, JSON.stringify(data));
    localStorage.removeItem(CLE_V5);
    return true;
  } catch (_) { return false; }
}
