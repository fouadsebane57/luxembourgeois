/* ===================================================================
   SYNCHRONISATION

   Règles :
     hors ligne, on met en file et on n'écrase rien,
     à la reconnexion, on tire d'abord, on fusionne, puis on pousse,
     l'arbitrage se fait par expression et par date, pas par maximum global,
     la première connexion propose explicitement le transfert local.
   =================================================================== */

import * as sb from "./supabase.js";
import { state, instantane, fusionnerDistant, sauver, brancherSync } from "../core/state.js";

const CLE_FILE = "letz:v5:queue";
let enCours = false;
let dernierEchec = "";

export const enLigne = () => navigator.onLine !== false;
export const statut = () => ({
  connecte: !!sb.user(),
  enLigne: enLigne(),
  enAttente: !!state().sync.pending,
  dernierPush: state().sync.lastPushed,
  dernierPull: state().sync.lastPulled,
  dernierEchec
});

function fileEnAttente(valeur) {
  try {
    if (valeur === undefined) return JSON.parse(localStorage.getItem(CLE_FILE) || "null");
    if (valeur === null) localStorage.removeItem(CLE_FILE);
    else localStorage.setItem(CLE_FILE, JSON.stringify(valeur));
  } catch (_) {}
  return null;
}

export async function pousser() {
  if (!sb.user()) return { ok: false, raison: "anonyme" };
  const snap = instantane();
  if (!enLigne()) { fileEnAttente(snap); return { ok: false, raison: "hors_ligne" }; }
  if (enCours) return { ok: false, raison: "occupe" };
  enCours = true;
  try {
    const r = await sb.pousserProgression(snap);
    if (r.ok) {
      state().sync.lastPushed = Date.now();
      state().sync.pending = false;
      dernierEchec = "";
      fileEnAttente(null);
      sauver(false);
      return { ok: true };
    }
    dernierEchec = r.message;
    fileEnAttente(snap);
    return { ok: false, raison: r.message };
  } catch (err) {
    dernierEchec = err.message;
    fileEnAttente(snap);
    return { ok: false, raison: err.message };
  } finally { enCours = false; }
}

export async function tirer() {
  if (!sb.user() || !enLigne()) return { ok: false, raison: "indisponible" };
  const ligne = await sb.tirerProgression();
  if (!ligne?.snapshot) return { ok: true, vide: true };
  const r = fusionnerDistant(ligne.snapshot);
  return { ok: true, ...r, distantLe: ligne.updated_at };
}

/**
 * Première connexion sur un appareil portant déjà une progression locale.
 * On ne fusionne jamais sans l'accord explicite de l'utilisateur.
 */
export async function analyserPremiereConnexion() {
  const local = Object.keys(state().progress).length;
  const ligne = await sb.tirerProgression();
  const distant = ligne?.snapshot ? Object.keys(ligne.snapshot.progress || {}).length : 0;
  return {
    local, distant,
    conflit: local > 0 && distant > 0,
    distantLe: ligne?.updated_at || null,
    snapshotDistant: ligne?.snapshot || null
  };
}

export async function appliquerChoixPremiereConnexion(choix, snapshotDistant) {
  if (choix === "fusionner") { fusionnerDistant(snapshotDistant); await pousser(); return "fusionne"; }
  if (choix === "garder_local") { await pousser(); return "local_pousse"; }
  if (choix === "garder_cloud") {
    state().progress = {}; state().validated = {}; state().favorites = {};
    fusionnerDistant(snapshotDistant);
    sauver(false);
    return "cloud_applique";
  }
  return "aucun";
}

export async function reprendreFile() {
  const attente = fileEnAttente();
  if (!attente || !sb.user() || !enLigne()) return false;
  const r = await sb.pousserProgression(attente);
  if (r.ok) { fileEnAttente(null); state().sync.pending = false; sauver(false); return true; }
  return false;
}

export function demarrer() {
  brancherSync(pousser);
  window.addEventListener("online", () => { reprendreFile().catch(() => {}); });
  sb.surChangement(async (u) => {
    if (!u) return;
    await tirer().catch(() => {});
    await reprendreFile().catch(() => {});
  });
}
