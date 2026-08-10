/* ===================================================================
   MIGRATION 5 VERS 6 · MODÈLE DE PREUVES

   Constat établi avant toute écriture :

   `exposer()` en 5.1.0 écrivait dans `n.comprehension`, exactement le
   champ que `appliquer()` écrivait via `n[d]`. Aucun champ de
   provenance n'existait. Il est donc IMPOSSIBLE de distinguer
   rétroactivement un niveau obtenu par écoute passive d'un niveau
   obtenu par réussite réelle.

   STRATÉGIE RETENUE, en quatre points.

   1. CONSERVATION INTÉGRALE
      L'état 5 est copié tel quel dans `legacy`. Aucun champ n'est
      modifié, aucun n'est supprimé, aucun n'est décrémenté.

   2. AUCUNE PROMOTION
      L'héritage n'alimente AUCUNE dimension du nouveau modèle. Un
      niveau ancien a pu être gonflé par de l'écoute passive, et cette
      contamination est indétectable après coup. Le reprendre comme
      preuve prolongerait l'illusion indéfiniment.

   3. AFFICHAGE SÉPARÉ
      Deux indicateurs coexistent pendant la transition :
        « Maîtrise vérifiée »      dimensions du modèle 6, part de zéro
        « Progression historique »  héritage, intact et visible
      Rien ne disparaît de l'écran, mais rien n'est confondu.

   4. RECALIBRATION PROGRESSIVE
      L'héritage sert uniquement à l'ORDONNANCEMENT : une expression
      déjà travaillée n'est pas présentée comme une découverte. C'est
      une information de file d'attente, pas une affirmation de
      compétence. À chaque séance, les preuves réelles remplacent
      progressivement cette approximation.
   =================================================================== */

import { normaliser, DIMENSIONS } from "./preuve.js";

export const CLE_V6 = "lulu:v6";
export const CLE_V5 = "lulu:v5";
export const CLE_V5_ANCIENNE = "letz:v5";
export const CLE_SAUVEGARDE_V5 = "lulu:v5:backup";

export const SCHEMA_COURANT = 6;

/**
 * Migre un dictionnaire de progression 5 vers 6.
 * Pure : aucune écriture disque, entièrement testable.
 */
export function migrerProgression(progression5) {
  const sortie = {};
  const rapport = {
    entrees: 0, avecHeritage: 0, dejaV6: 0, vides: 0,
    heritageConserve: 0, heritagePerdu: 0,
    dimensionsPromues: 0        // doit rester à zéro
  };

  for (const [id, valeur] of Object.entries(progression5 || {})) {
    rapport.entrees += 1;
    if (valeur?.schema === 6) { sortie[id] = normaliser(valeur); rapport.dejaV6 += 1; continue; }

    const avant = {
      comprehension: Number(valeur?.comprehension ?? valeur?.n ?? 0),
      production: Number(valeur?.production ?? valeur?.n ?? 0),
      pronunciation: Number(valeur?.pronunciation ?? 0)
    };
    const e = normaliser(valeur);          // range l'ancien état dans legacy
    sortie[id] = e;

    if (e.legacy) rapport.avecHeritage += 1; else rapport.vides += 1;

    // Contrôle 1 : l'héritage est-il conservé à l'identique ?
    const apres = {
      comprehension: e.legacy?.comprehension ?? 0,
      production: e.legacy?.production ?? 0,
      pronunciation: e.legacy?.pronunciation ?? 0
    };
    for (const k of Object.keys(avant)) {
      if (apres[k] === avant[k]) rapport.heritageConserve += 1;
      else rapport.heritagePerdu += 1;
    }

    // Contrôle 2 : aucune dimension du nouveau modèle ne doit avoir été
    // remplie par la migration. Elles se remplissent par des preuves.
    for (const d of DIMENSIONS) {
      if ((e.dims[d]?.n || 0) > 0) rapport.dimensionsPromues += 1;
    }
  }
  return { progression: sortie, rapport };
}

/**
 * Vérifie qu'aucun niveau n'a baissé entre l'avant et l'après.
 * Appelée systématiquement après migration. En cas d'échec, on
 * n'écrit rien et on garde l'état 5.
 */
/**
 * Deux contrôles, tous deux bloquants.
 *   1. l'héritage est copié à l'identique, aucune valeur perdue
 *   2. aucune dimension du modèle 6 n'a été préremplie par la migration
 */
export function verifierMigration(avant, apres) {
  const problemes = [];
  for (const [id, a] of Object.entries(avant || {})) {
    if (a?.schema === 6) continue;
    const b = apres?.[id];
    if (!b) { problemes.push({ id, cause: "entrée disparue" }); continue; }

    const paires = [
      ["comprehension", Number(a.comprehension ?? a.n ?? 0), b.legacy?.comprehension ?? 0],
      ["production", Number(a.production ?? a.n ?? 0), b.legacy?.production ?? 0],
      ["pronunciation", Number(a.pronunciation ?? 0), b.legacy?.pronunciation ?? 0],
      ["seen", Number(a.seen ?? 0), b.legacy?.seen ?? 0],
      ["errors", Number(a.errors ?? 0), b.legacy?.errors ?? 0]
    ];
    for (const [champ, av, ap] of paires) {
      if (ap !== av) problemes.push({ id, cause: "héritage altéré", champ, avant: av, apres: ap });
    }

    for (const d of DIMENSIONS) {
      if ((b.dims?.[d]?.n || 0) > 0) {
        problemes.push({ id, cause: "dimension préremplie par la migration", champ: d });
      }
    }
  }
  return { ok: problemes.length === 0, problemes };
}

/**
 * Migration complète depuis le stockage local, avec sauvegarde et
 * contrôle. N'écrit l'état 6 que si la vérification passe.
 */
export function migrerLocalV6(lireCle, ecrireCle) {
  const rapport = { effectuee: false, source: "", sauvegarde: false, verification: null, detail: null };

  let v6 = null;
  try { v6 = JSON.parse(lireCle(CLE_V6) || "null"); } catch (_) {}
  if (v6?.schema === SCHEMA_COURANT) { rapport.source = "v6"; return { etat: v6, rapport }; }

  let v5 = null;
  for (const cle of [CLE_V5, CLE_V5_ANCIENNE]) {
    try { const x = JSON.parse(lireCle(cle) || "null"); if (x?.schema === 5) { v5 = x; rapport.source = cle; break; } } catch (_) {}
  }
  if (!v5) return { etat: null, rapport };

  // 1. Sauvegarde AVANT toute transformation. Base du retour arrière.
  if (!lireCle(CLE_SAUVEGARDE_V5)) {
    try {
      ecrireCle(CLE_SAUVEGARDE_V5, JSON.stringify({ migratedAt: new Date().toISOString(), schema: 5, data: v5 }));
      rapport.sauvegarde = true;
    } catch (_) { /* stockage saturé : on continue, l'état 5 reste en place */ }
  } else {
    rapport.sauvegarde = true;
  }

  // 2. Migration
  const { progression, rapport: detail } = migrerProgression(v5.progress);
  rapport.detail = detail;

  // 3. Vérification. Aucune écriture si un seul niveau a baissé.
  const verif = verifierMigration(v5.progress, progression);
  rapport.verification = verif;
  if (!verif.ok) return { etat: null, rapport };

  const etat = { ...v5, schema: SCHEMA_COURANT, progress: progression };
  rapport.effectuee = true;
  return { etat, rapport };
}

/** Retour arrière complet vers l'état 5 conservé. */
export function restaurerV5(lireCle, ecrireCle, supprimerCle) {
  const s = lireCle(CLE_SAUVEGARDE_V5);
  if (!s) return { ok: false, message: "Aucune sauvegarde de l'état précédent." };
  try {
    const { data } = JSON.parse(s);
    ecrireCle(CLE_V5, JSON.stringify(data));
    supprimerCle(CLE_V6);
    return { ok: true, message: "Progression précédente restaurée." };
  } catch (e) {
    return { ok: false, message: "Sauvegarde illisible : " + e.message };
  }
}
