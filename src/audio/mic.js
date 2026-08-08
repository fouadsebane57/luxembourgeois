/* ===================================================================
   MICRO

   Responsabilités :
     autorisation, sélection de l'appareil, mesure du niveau réel,
     détection des kits mains libres Bluetooth, libération propre.

   Le moteur précédent gardait un flux ouvert indéfiniment et ne
   mesurait jamais le niveau. Un micro muet, mal sélectionné ou trop
   éloigné produisait donc un échec silencieux.
   =================================================================== */

let stream = null;
let audioCtx = null;
let deviceId = "";

export const CONTRAINTES = {
  echoCancellation: true,   // indispensable : la voix de synthèse sort du même appareil
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1
};

export function supporte() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

export async function etatPermission() {
  if (!navigator.permissions?.query) return "unknown";
  try {
    const p = await navigator.permissions.query({ name: "microphone" });
    return p.state; // granted | denied | prompt
  } catch (_) {
    return "unknown";
  }
}

export async function ouvrir(prefereId = deviceId) {
  if (!supporte()) {
    const e = new Error("Ce navigateur ne donne pas accès au micro.");
    e.kind = "mic"; throw e;
  }
  if (stream && stream.active && (!prefereId || prefereId === deviceId)) return stream;
  fermer();
  const audio = { ...CONTRAINTES };
  if (prefereId) audio.deviceId = { ideal: prefereId };
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio });
  } catch (err) {
    const e = new Error(messageErreurMicro(err));
    e.kind = "mic"; e.cause = err; throw e;
  }
  deviceId = stream.getAudioTracks()[0]?.getSettings?.().deviceId || prefereId || "";
  return stream;
}

function messageErreurMicro(err) {
  const n = err?.name || "";
  if (n === "NotAllowedError" || n === "SecurityError") return "Autorisation micro refusée. Autorise le micro dans les réglages du navigateur.";
  if (n === "NotFoundError") return "Aucun microphone détecté sur cet appareil.";
  if (n === "NotReadableError") return "Le micro est déjà utilisé par une autre application.";
  if (n === "OverconstrainedError") return "Le micro sélectionné n'est plus disponible.";
  return err?.message || "Micro indisponible.";
}

export function fermer() {
  try { stream?.getTracks().forEach((t) => t.stop()); } catch (_) {}
  stream = null;
}

export async function listerAppareils() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === "audioinput").map((d) => ({ id: d.deviceId, label: d.label || "Micro sans nom" }));
}

export function choisirAppareil(id) { deviceId = id || ""; fermer(); }
export function appareilActuel() { return deviceId; }

/** Informations réelles du flux ouvert. Sert au diagnostic. */
export function infosFlux() {
  const t = stream?.getAudioTracks?.()[0];
  if (!t) return null;
  const s = t.getSettings?.() || {};
  const label = (t.label || "").toLowerCase();
  const bluetooth = /bluetooth|hands-?free|hfp|headset|mains libres/.test(label);
  return {
    label: t.label || "",
    deviceId: s.deviceId || "",
    sampleRate: s.sampleRate || 0,
    channelCount: s.channelCount || 0,
    echoCancellation: s.echoCancellation,
    noiseSuppression: s.noiseSuppression,
    autoGainControl: s.autoGainControl,
    bluetooth,
    // Un profil mains libres Bluetooth descend souvent à 8 ou 16 kHz mono.
    // La transcription se dégrade nettement. On le signale sans bloquer.
    qualiteReduite: bluetooth || (s.sampleRate > 0 && s.sampleRate <= 16000)
  };
}

export function contexte() {
  if (!audioCtx || audioCtx.state === "closed") {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    audioCtx = new C();
  }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

/**
 * Analyseur de niveau. Renvoie un objet avec rms() en dBFS.
 * -100 dB environ = silence numérique. -20 dB = parole nette et proche.
 */
export function analyseur(fluxCible = stream) {
  const ctx = contexte();
  if (!ctx || !fluxCible) return null;
  const source = ctx.createMediaStreamSource(fluxCible);
  const node = ctx.createAnalyser();
  node.fftSize = 1024;
  node.smoothingTimeConstant = 0.2;
  source.connect(node);
  const buf = new Float32Array(node.fftSize);
  return {
    rmsDb() {
      node.getFloatTimeDomainData(buf);
      let somme = 0;
      for (let i = 0; i < buf.length; i++) somme += buf[i] * buf[i];
      const rms = Math.sqrt(somme / buf.length);
      return rms > 0 ? 20 * Math.log10(rms) : -100;
    },
    detruire() { try { source.disconnect(); node.disconnect(); } catch (_) {} }
  };
}

/** Mesure du niveau pendant N ms. Utilisé par le diagnostic. */
export async function mesurerNiveau(ms = 1500) {
  await ouvrir();
  const a = analyseur();
  if (!a) return { moyenDb: -100, picDb: -100, ok: false };
  let pic = -100, somme = 0, n = 0;
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    const db = a.rmsDb();
    if (db > pic) pic = db;
    somme += db; n++;
    await new Promise((r) => setTimeout(r, 40));
  }
  a.detruire();
  return { moyenDb: n ? somme / n : -100, picDb: pic, ok: pic > -55 };
}
