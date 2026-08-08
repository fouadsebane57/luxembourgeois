/* ===================================================================
   PIPELINE VOCAL

   micro -> niveau -> détection de parole -> enregistrement
        -> STT luxembourgeois (cloud) -> normalisation
        -> comparaison -> verdict pédagogique -> retour

   Chaque étape est tracée. La trace alimente le diagnostic et permet
   de savoir si un échec vient du micro, du bruit, du transport,
   du moteur de transcription ou de l'algorithme de comparaison.

   Le navigateur n'est qu'un secours. Il ne connaît pas le luxembourgeois
   et ne peut donc jamais faire baisser la progression.
   =================================================================== */

import { capturer, blobEnBase64 } from "../audio/recorder.js";
import { compare, verdictDe, VERDICT, EFFET } from "./score.js";

const CFG = () => window.LETZ_CONFIG || {};

export function cloudConfigure() {
  const c = CFG();
  return !!(c.functionsBaseUrl && c.supabaseUrl && c.supabaseAnonKey);
}

export function navigateurDisponible() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/** Reconnaissance de secours. Langue de repli explicite, jamais présentée comme du lb. */
export function reconnaissanceNavigateur(ms = 6000, lang = "de-DE") {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) return Promise.resolve({ engine: "browser", transcripts: [], error: "Reconnaissance navigateur indisponible.", latencyMs: 0 });
  return new Promise((resolve) => {
    const t0 = performance.now();
    let rec, fini = false;
    const out = [];
    const finir = (error = "") => {
      if (fini) return;
      fini = true;
      try { rec?.stop(); } catch (_) {}
      resolve({ engine: "browser", transcripts: out, error: out.length ? "" : error, latencyMs: Math.round(performance.now() - t0), lang });
    };
    try { rec = new Rec(); } catch (e) { return finir(e.message); }
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.continuous = false;
    rec.onresult = (e) => {
      try {
        const r = e.results[e.results.length - 1];
        for (let i = 0; i < r.length; i++) out.push({ text: r[i].transcript, confidence: r[i].confidence || 0 });
      } catch (_) {}
      finir();
    };
    rec.onerror = (e) => finir(traduireErreurNavigateur(e.error));
    rec.onend = () => finir("Aucune transcription retournée.");
    try { rec.start(); } catch (e) { return finir(e.message); }
    setTimeout(() => finir("Temps écoulé."), ms);
  });
}

function traduireErreurNavigateur(code) {
  const m = {
    "no-speech": "Aucune parole détectée par le navigateur.",
    "audio-capture": "Le navigateur n'a pas pu capter le micro.",
    "not-allowed": "Autorisation micro refusée.",
    "service-not-allowed": "Service de reconnaissance refusé par le navigateur.",
    "network": "Le service de reconnaissance du navigateur est injoignable.",
    "aborted": "Reconnaissance interrompue."
  };
  return m[code] || ("Erreur de reconnaissance: " + code);
}

/** Appel de l'Edge Function. Les secrets Google restent côté serveur. */
export async function reconnaissanceCloud({ blob, mimeType, expected, accepted, contexte, jeton }) {
  const c = CFG();
  const t0 = performance.now();
  if (!cloudConfigure()) {
    return { engine: "cloud", transcripts: [], error: "Moteur cloud non configuré.", errorKind: "service", latencyMs: 0 };
  }
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), 12000);
  try {
    const audioBase64 = await blobEnBase64(blob);
    const res = await fetch(`${String(c.functionsBaseUrl).replace(/\/$/, "")}/speech-transcribe`, {
      method: "POST",
      signal: controleur.signal,
      headers: {
        "Content-Type": "application/json",
        "apikey": c.supabaseAnonKey,
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {})
      },
      body: JSON.stringify({
        audioBase64,
        mimeType: mimeType || "audio/webm",
        expected: expected || "",
        // Le biasing est alimenté par les réponses validées et le vocabulaire
        // de la leçon en cours. C'est le principal levier de qualité.
        hints: [expected, ...(accepted || []), ...(contexte || [])].filter(Boolean).slice(0, 60)
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        engine: "cloud", transcripts: [],
        error: data.error || `Erreur cloud ${res.status}`,
        errorKind: res.status === 429 ? "quota" : "service",
        quota: data.quota || null,
        latencyMs: Math.round(performance.now() - t0)
      };
    }
    return {
      engine: "cloud",
      transcripts: data.transcripts || [],
      model: data.model || "",
      lang: data.lang || "lb-LU",
      error: "",
      errorKind: "none",
      usage: data.usage || null,
      serverMs: data.serverMs || 0,
      latencyMs: Math.round(performance.now() - t0)
    };
  } catch (err) {
    return {
      engine: "cloud", transcripts: [],
      error: err.name === "AbortError" ? "Le service vocal n'a pas répondu à temps." : err.message,
      errorKind: "service",
      latencyMs: Math.round(performance.now() - t0)
    };
  } finally {
    clearTimeout(minuteur);
  }
}

/**
 * Exécution complète du pipeline pour une expression attendue.
 * Renvoie toujours une structure exploitable, y compris en cas de panne.
 */
export async function evaluerReponse(item, opt = {}) {
  const trace = [];
  const marque = (etape, detail) => trace.push({ etape, ms: Math.round(performance.now() - depart), ...detail });
  const depart = performance.now();

  const preference = opt.moteur || "auto";
  const attendu = item.lb;
  const acceptees = Array.isArray(item.alt) ? item.alt : [];

  // 1. Capture
  const capture = await capturer({
    profil: opt.profil || "calme",
    attenteMaxMs: opt.attenteMaxMs,
    paroleMaxMs: opt.paroleMaxMs,
    onNiveau: opt.onNiveau,
    annule: opt.annule
  });
  marque("capture", {
    ok: capture.ok, mime: capture.mimeType, octets: capture.octets,
    parole: capture.vad?.speechDetected, paroleMs: capture.vad?.speechMs,
    plancherDb: Math.round(capture.vad?.noiseFloorDb ?? -100),
    picDb: Math.round(capture.vad?.peakDb ?? -100),
    snrDb: Math.round(capture.vad?.snrDb ?? 0)
  });

  const base = {
    engine: "none", error: capture.error || "", errorKind: capture.errorKind || "none",
    speechDetected: !!capture.vad?.speechDetected,
    speechMs: capture.vad?.speechMs || 0,
    snrDb: capture.vad?.snrDb || 0,
    blob: capture.blob, mimeType: capture.mimeType, micro: capture.micro,
    transcripts: [], match: null, trace
  };

  if (capture.errorKind === "mic") return finaliser(base);
  if (!base.speechDetected) return finaliser(base);

  // 2. Transcription
  let stt = null;
  const veutCloud = preference === "cloud" || (preference === "auto" && cloudConfigure());

  if (veutCloud && capture.blob) {
    stt = await reconnaissanceCloud({
      blob: capture.blob, mimeType: capture.mimeType,
      expected: attendu, accepted: acceptees, contexte: opt.contexte, jeton: opt.jeton
    });
    marque("stt_cloud", { erreur: stt.error, n: stt.transcripts.length, latenceMs: stt.latencyMs, serveurMs: stt.serverMs });
  }

  const cloudMuet = !stt || !stt.transcripts.length;
  if (cloudMuet && preference !== "cloud" && navigateurDisponible() && preference !== "echo") {
    const nav = await reconnaissanceNavigateur(Math.min(6000, opt.paroleMaxMs || 6000));
    marque("stt_navigateur", { erreur: nav.error, n: nav.transcripts.length, latenceMs: nav.latencyMs });
    if (nav.transcripts.length) stt = nav;
    else if (!stt) stt = nav;
  }

  if (!stt) stt = { engine: "echo", transcripts: [], error: "Aucun moteur de transcription disponible.", errorKind: "service", latencyMs: 0 };

  base.engine = stt.transcripts.length ? stt.engine : (stt.engine === "cloud" ? "cloud" : stt.engine);
  base.transcripts = stt.transcripts;
  base.error = stt.error || base.error;
  base.errorKind = stt.errorKind || base.errorKind;
  base.model = stt.model || "";
  base.lang = stt.lang || "";
  base.latencyMs = stt.latencyMs || 0;
  base.usage = stt.usage || null;
  if (!stt.transcripts.length && stt.engine !== "cloud") base.engine = "echo";

  // 3. Comparaison
  base.match = compare(attendu, acceptees, stt.transcripts);
  marque("comparaison", {
    entendu: base.match.texte, cible: base.match.cible,
    score: Number(base.match.score.toFixed(3)),
    exact: base.match.exact, accentSeul: base.match.diacritiqueSeul
  });

  return finaliser(base);
}

function finaliser(r) {
  const v = verdictDe(r);
  r.verdict = v.verdict;
  r.effet = v.effet;
  r.fiable = v.fiable;
  r.totalMs = r.trace.length ? r.trace[r.trace.length - 1].ms : 0;
  return r;
}

export { VERDICT, EFFET };
