/* ===================================================================
   ENREGISTREMENT

   L'enregistrement démarre immédiatement et s'arrête quand la détection
   de parole conclut. La durée est bornée en dur : garde-fou contre les
   coûts cloud et contre un micro resté ouvert.

   Formats réels observés :
     Chrome Android  audio/webm;codecs=opus
     Safari iOS      audio/mp4  (AAC)
   Les deux sont acceptés par Google STT V2 avec AutoDetectDecodingConfig.
   Le type MIME retenu est transmis au serveur et affiché au diagnostic.
   =================================================================== */

import { ouvrir, infosFlux, reveiller } from "./mic.js";
import { ecouter } from "./vad.js";

export const DUREE_MAX_MS = 10000;   // plafond absolu envoyé au cloud
export const TAILLE_MAX_OCTETS = 900 * 1024;

const CANDIDATS_MIME = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  ""
];

export function mimeDisponible() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of CANDIDATS_MIME) {
    if (m === "") return "";
    if (MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return null;
}

export function supporte() {
  return typeof MediaRecorder !== "undefined" && mimeDisponible() !== null;
}

/**
 * Capture une réponse orale.
 * Renvoie toujours un objet, jamais d'exception non typée.
 */
export async function capturer(opt = {}) {
  const t0 = performance.now();
  let flux;
  try {
    flux = await ouvrir();
    // Le contexte audio doit tourner AVANT toute mesure. Sans cette
    // attente, iOS renvoie du silence et la détection part en vrille.
    await reveiller();
  } catch (err) {
    return { ok: false, errorKind: "mic", error: err.message, blob: null, vad: null };
  }
  if (!supporte()) {
    return { ok: false, errorKind: "mic", error: "L'enregistrement audio n'est pas supporté par ce navigateur.", blob: null, vad: null };
  }

  const mime = mimeDisponible();
  let rec;
  try {
    rec = new MediaRecorder(flux, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
  } catch (err) {
    return { ok: false, errorKind: "mic", error: "Enregistreur audio indisponible: " + err.message, blob: null, vad: null };
  }

  const morceaux = [];
  let octets = 0;
  let stoppe = false;

  const finEnregistrement = new Promise((resolve) => {
    rec.ondataavailable = (e) => {
      if (e.data?.size) { morceaux.push(e.data); octets += e.data.size; }
    };
    rec.onstop = () => resolve();
    rec.onerror = () => resolve();
  });

  const arreter = () => {
    if (stoppe) return;
    stoppe = true;
    try { if (rec.state !== "inactive") rec.stop(); } catch (_) {}
  };

  rec.start(250);
  const gardeFou = setTimeout(arreter, DUREE_MAX_MS + 1500);

  const vad = await ecouter(flux, {
    profil: opt.profil || "calme",
    attenteMaxMs: opt.attenteMaxMs ?? 4500,
    paroleMaxMs: Math.min(opt.paroleMaxMs ?? 9000, DUREE_MAX_MS),
    onNiveau: opt.onNiveau,
    annule: opt.annule
  });

  arreter();
  clearTimeout(gardeFou);
  await finEnregistrement;

  const blob = morceaux.length ? new Blob(morceaux, { type: rec.mimeType || mime || "audio/webm" }) : null;
  const trop = blob && blob.size > TAILLE_MAX_OCTETS;

  return {
    ok: !!blob && !trop && vad.speechDetected,
    errorKind: trop ? "service" : "none",
    error: trop ? "Enregistrement trop volumineux, il n'a pas été envoyé."
                : (vad.detail || ""),
    blob: trop ? null : blob,
    mimeType: rec.mimeType || mime || "",
    octets: blob?.size || 0,
    dureeMs: Math.round(performance.now() - t0),
    micro: infosFlux(),
    vad
  };
}

export function blobEnBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
    fr.onerror = () => reject(new Error("Lecture de l'enregistrement impossible."));
    fr.readAsDataURL(blob);
  });
}

export function lireBlob(blob) {
  return new Promise((resolve) => {
    if (!blob) return resolve();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const fin = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onended = fin;
    audio.onerror = fin;
    audio.play().catch(fin);
    setTimeout(fin, DUREE_MAX_MS + 2000);
  });
}
