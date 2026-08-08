/* ===================================================================
   PIPELINE VOCAL

   micro -> réveil du contexte audio -> mesure -> détection de parole
        -> enregistrement -> transcription lb-LU -> normalisation
        -> comparaison -> verdict -> retour parlé

   Chaque étape porte une cause d'échec précise. Le diagnostic sait
   donc distinguer une configuration absente, une fonction non
   déployée, un blocage réseau, une authentification refusée, un quota,
   une erreur serveur, un format refusé, un dépassement de délai et une
   transcription vide.

   Le navigateur reste un secours. Il ne connaît pas le luxembourgeois
   et ne peut jamais faire baisser la progression.
   =================================================================== */

import { capturer, blobEnBase64 } from "../audio/recorder.js";
import { liberer, fluxOuvert } from "../audio/mic.js";
import { compare, verdictDe, VERDICT, EFFET } from "./score.js";
import { CAUSE, causeDeReponse, causeDException, texteComplet } from "./erreurs.js";
import { analyser as analyserRythme, phrase as phraseRythme, detail as detailRythme } from "../audio/rythme.js";
import * as Cfg from "../core/config.js";

export const TIMEOUT_CLOUD_MS = 15000;

/** État exact du moteur cloud, avec cause. */
export function etatCloud(connecte) {
  const v = Cfg.verifier();
  if (!v.ok) return { pret: false, cause: v.cause, resume: v.resume, verif: v };
  if (!connecte) return { pret: false, cause: CAUSE.NON_CONNECTE, resume: "Connecte-toi pour activer la reconnaissance luxembourgeoise.", verif: v };
  return { pret: true, cause: CAUSE.OK, resume: "Prête, modèle chirp_3, région eu.", verif: v };
}

export const cloudConfigure = () => Cfg.verifier().ok;
export const navigateurDisponible = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);

/* ---------- Reconnaissance de secours, navigateur ---------- */

/**
 * Le micro doit être libéré avant l'appel : sur iOS, la reconnaissance
 * du navigateur ne peut pas ouvrir le micro tant qu'un flux le retient.
 * C'est la cause du « Temps écoulé » observé sur iPhone en 5.0.0.
 */
export async function reconnaissanceNavigateur(ms = 6000, lang = "de-DE") {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) {
    return { engine: "browser", transcripts: [], cause: CAUSE.MOTEUR_ABSENT,
             error: "Reconnaissance du navigateur indisponible.", latencyMs: 0, lang };
  }
  if (fluxOuvert()) await liberer();

  const t0 = performance.now();
  return new Promise((resolve) => {
    let rec, fini = false;
    const out = [];
    const finir = (cause, error = "") => {
      if (fini) return;
      fini = true;
      try { rec?.stop(); } catch (_) {}
      resolve({
        engine: "browser", transcripts: out,
        cause: out.length ? CAUSE.OK : cause,
        error: out.length ? "" : error,
        latencyMs: Math.round(performance.now() - t0), lang
      });
    };
    try { rec = new Rec(); } catch (e) { return finir(CAUSE.MOTEUR_ABSENT, e.message); }
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.continuous = false;
    rec.onresult = (e) => {
      try {
        const r = e.results[e.results.length - 1];
        for (let i = 0; i < r.length; i++) out.push({ text: r[i].transcript, confidence: r[i].confidence || 0 });
      } catch (_) {}
      finir(CAUSE.OK);
    };
    rec.onerror = (e) => finir(causeNavigateur(e.error), messageNavigateur(e.error));
    rec.onend = () => finir(CAUSE.TRANSCRIPTION_VIDE, "Le navigateur n'a retourné aucun texte.");
    try { rec.start(); }
    catch (e) { return finir(CAUSE.MOTEUR_ABSENT, "Démarrage refusé : " + e.message); }
    setTimeout(() => finir(CAUSE.TIMEOUT, "Le navigateur n'a pas répondu dans le délai."), ms);
  });
}

const causeNavigateur = (c) => ({
  "not-allowed": CAUSE.AUTH, "service-not-allowed": CAUSE.AUTH,
  "network": CAUSE.RESEAU, "no-speech": CAUSE.TRANSCRIPTION_VIDE,
  "audio-capture": CAUSE.MOTEUR_ABSENT
}[c] || CAUSE.MOTEUR_ABSENT);

const messageNavigateur = (c) => ({
  "no-speech": "Le navigateur n'a entendu aucune parole.",
  "audio-capture": "Le navigateur n'a pas pu accéder au micro. Une autre fonction le retient peut-être.",
  "not-allowed": "Autorisation refusée pour la reconnaissance du navigateur.",
  "service-not-allowed": "Le navigateur refuse d'utiliser son service de reconnaissance.",
  "network": "Le service de reconnaissance du navigateur est injoignable.",
  "aborted": "Reconnaissance interrompue."
}[c] || ("Erreur de reconnaissance : " + c));

/* ---------- Reconnaissance cloud ---------- */

export async function reconnaissanceCloud({ blob, mimeType, expected, accepted, contexte, jeton }) {
  const t0 = performance.now();
  const echec = (cause, error, extra = {}) => ({
    engine: "cloud", transcripts: [], cause, error,
    detail: texteComplet(cause, error),
    latencyMs: Math.round(performance.now() - t0), ...extra
  });

  const v = Cfg.verifier();
  if (!v.ok) return echec(v.cause, v.resume);
  if (!jeton) return echec(CAUSE.NON_CONNECTE, "Aucune session active.");
  if (!blob) return echec(CAUSE.TRANSCRIPTION_VIDE, "Aucun enregistrement à envoyer.");

  const url = `${Cfg.functionsBaseUrl()}/speech-transcribe`;
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), TIMEOUT_CLOUD_MS);

  try {
    const audioBase64 = await blobEnBase64(blob);
    const res = await fetch(url, {
      method: "POST",
      signal: controleur.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: Cfg.supabaseAnonKey(),
        Authorization: `Bearer ${jeton}`
      },
      body: JSON.stringify({
        audioBase64,
        mimeType: mimeType || "audio/webm",
        expected: expected || "",
        // Le guidage par le vocabulaire attendu est le principal levier
        // de qualité sur une langue peu dotée comme le luxembourgeois.
        hints: [expected, ...(accepted || []), ...(contexte || [])].filter(Boolean).slice(0, 60)
      })
    });

    let data = {};
    const texte = await res.text();
    try { data = texte ? JSON.parse(texte) : {}; }
    catch (_) {
      // Réponse non JSON : presque toujours une page d'erreur de la
      // plateforme, donc une fonction absente ou une mauvaise adresse.
      return echec(CAUSE.FONCTION_INTROUVABLE,
        `Réponse inattendue (${res.status}) à l'adresse ${url}`, { httpStatus: res.status });
    }

    if (!res.ok) {
      const cause = causeDeReponse(res.status, data);
      return echec(cause, data.error || `Erreur HTTP ${res.status}`,
        { httpStatus: res.status, quota: data.quota || null });
    }

    const transcripts = data.transcripts || [];
    if (!transcripts.length) {
      return echec(CAUSE.TRANSCRIPTION_VIDE, "Le service a répondu sans reconnaître de mot.",
        { httpStatus: 200, usage: data.usage || null, model: data.model, lang: data.lang });
    }

    return {
      engine: "cloud", transcripts,
      cause: CAUSE.OK, error: "", detail: "",
      model: data.model || "", lang: data.lang || "lb-LU", region: data.region || "",
      usage: data.usage || null, serverMs: data.serverMs || 0, httpStatus: 200,
      latencyMs: Math.round(performance.now() - t0)
    };
  } catch (err) {
    const cause = causeDException(err);
    const detailReseau = cause === CAUSE.RESEAU
      ? `Appel vers ${url} sans réponse. Trois causes possibles : adresse fausse, projet Supabase en pause, ou requête bloquée par le navigateur faute d'autorisation d'origine.`
      : err.message;
    return echec(cause, detailReseau);
  } finally {
    clearTimeout(minuteur);
  }
}

/* ---------- Pipeline complet ---------- */

export async function evaluerReponse(item, opt = {}) {
  const depart = performance.now();
  const trace = [];
  const marque = (etape, detail) => trace.push({ etape, ms: Math.round(performance.now() - depart), ...detail });

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
    snrDb: Math.round(capture.vad?.snrDb ?? 0),
    mesureFiable: capture.vad?.mesureFiable
  });

  const base = {
    engine: "none", cause: CAUSE.OK, error: capture.error || "", detail: capture.vad?.detail || "",
    errorKind: capture.errorKind || "none",
    speechDetected: !!capture.vad?.speechDetected,
    speechMs: capture.vad?.speechMs || 0,
    snrDb: capture.vad?.snrDb || 0,
    blob: capture.blob, mimeType: capture.mimeType, micro: capture.micro,
    vad: capture.vad, transcripts: [], match: null, trace
  };

  if (capture.errorKind === "mic") { base.cause = CAUSE.MOTEUR_ABSENT; return finaliser(base); }
  if (!base.speechDetected) return finaliser(base);

  // 2. Transcription
  let stt = null;
  const veutCloud = preference === "cloud" || (preference === "auto" && cloudConfigure());

  if (veutCloud) {
    stt = await reconnaissanceCloud({
      blob: capture.blob, mimeType: capture.mimeType,
      expected: attendu, accepted: acceptees, contexte: opt.contexte, jeton: opt.jeton
    });
    marque("stt_cloud", { cause: stt.cause, http: stt.httpStatus, n: stt.transcripts.length, latenceMs: stt.latencyMs });
  } else if (preference === "auto") {
    const e = etatCloud(!!opt.jeton);
    stt = { engine: "cloud", transcripts: [], cause: e.cause, error: e.resume, detail: e.resume, latencyMs: 0 };
    marque("stt_cloud", { cause: e.cause, ignore: true });
  }

  const cloudMuet = !stt || !stt.transcripts.length;
  if (cloudMuet && preference !== "cloud" && preference !== "echo" && navigateurDisponible()) {
    const nav = await reconnaissanceNavigateur(Math.min(6000, opt.paroleMaxMs || 6000));
    marque("stt_navigateur", { cause: nav.cause, n: nav.transcripts.length, latenceMs: nav.latencyMs });
    if (nav.transcripts.length) stt = nav;
    else if (!stt) stt = nav;
    else base.detailSecours = nav.error;
  }

  if (!stt) {
    stt = { engine: "echo", transcripts: [], cause: CAUSE.MOTEUR_ABSENT,
            error: "Aucun moteur de transcription disponible.", latencyMs: 0 };
  }

  // MODE AUTONOME.
  // Aucun moteur n'a pu transcrire. Plutôt que de s'arrêter là, on
  // analyse localement ce qui a été capté : durée et découpage en
  // syllabes. L'application reste donc utilisable sans serveur, sans
  // compte et sans configuration. Elle ne prétend rien juger de plus.
  if (!stt.transcripts.length) {
    base.rythme = analyserRythme({
      enveloppe: capture.vad.enveloppe,
      seuilDb: capture.vad.seuilDb,
      dureeMs: capture.vad.speechMs,
      fiable: capture.vad.mesureFiable
    }, item.syl ?? null);
    marque("rythme_local", {
      verdict: base.rythme.verdict, noyaux: base.rythme.noyaux,
      attendu: base.rythme.attendu, ratio: base.rythme.ratio
    });
    base.engine = "local";
    base.causeTranscription = stt.cause;      // conservée pour le diagnostic
    base.detailTranscription = stt.detail || stt.error || "";
    base.messageRythme = phraseRythme(base.rythme);
    base.detailRythme = detailRythme(base.rythme);
    base.transcripts = [];
    base.match = null;
    base.errorKind = "none";
    base.cause = CAUSE.OK;
    base.error = "";
    base.detail = "";
    return finaliser(base);
  }

  base.transcripts = stt.transcripts;
  base.cause = stt.cause;
  base.error = stt.error || base.error;
  base.detail = stt.detail || texteComplet(stt.cause, stt.error);
  base.model = stt.model || "";
  base.lang = stt.lang || "";
  base.httpStatus = stt.httpStatus;
  base.latencyMs = stt.latencyMs || 0;
  base.usage = stt.usage || null;
  base.engine = stt.transcripts.length ? stt.engine : "echo";
  base.errorKind = stt.transcripts.length ? "none" : "service";

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

export { VERDICT, EFFET, CAUSE };
