/* ===================================================================
   DIAGNOSTIC VOCAL

   Chaque maillon est testable séparément. Objectif : savoir en une
   minute si un échec vient du micro, du bruit, du format audio,
   du transport, du moteur de transcription ou de la comparaison.
   =================================================================== */

import * as Micro from "../audio/mic.js";
import * as Rec from "../audio/recorder.js";
import * as Moteur from "../speech/engine.js";
import * as Voix from "../audio/tts.js";
import { compare, verdictDe, LIBELLE, VERDICT, EFFET, seuilPour } from "../speech/score.js";
import * as SB from "../data/supabase.js";
import { $, echapper, toast } from "./render.js";

const MOT_TEST = "Moien";
let dernier = null;
export const dernierTest = () => dernier;

const ligne = (nom, etat, detail) =>
  `<div class="diag-row" data-etat="${etat}">
     <span><b>${echapper(nom)}</b><small>${echapper(detail || "")}</small></span>
     <b class="${etat === "ok" ? "ok-text" : etat === "warn" ? "warn-text" : "bad-text"}">${
       etat === "ok" ? "OK" : etat === "warn" ? "À surveiller" : "À régler"}</b>
   </div>`;

/** Contrôles instantanés, sans micro ni réseau. */
export async function controlesRapides() {
  const perm = await Micro.etatPermission();
  const mime = Rec.mimeDisponible();
  const voixLb = Voix.voixLuxembourgeoiseReelle();
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return [
    ["Connexion sécurisée", location.protocol === "https:" || location.hostname === "localhost" ? "ok" : "bad",
     location.protocol === "https:" ? "HTTPS actif" : "Le micro exige HTTPS"],
    ["API micro", Micro.supporte() ? "ok" : "bad", Micro.supporte() ? "getUserMedia disponible" : "Non supportée par ce navigateur"],
    ["Autorisation micro", perm === "granted" ? "ok" : perm === "denied" ? "bad" : "warn",
     perm === "granted" ? "Accordée" : perm === "denied" ? "Refusée, à réactiver dans les réglages du navigateur" : "Sera demandée au premier test"],
    ["Enregistrement audio", mime !== null ? "ok" : "bad", mime !== null ? `Format ${mime || "par défaut"}` : "MediaRecorder indisponible"],
    ["Synthèse vocale", Voix.dispo() ? (voixLb ? "ok" : "warn") : "bad",
     !Voix.dispo() ? "Indisponible" : voixLb ? "Voix luxembourgeoise détectée" : "Aucune voix lb-LU, approximation allemande utilisée"],
    ["Reconnaissance cloud lb-LU", Moteur.cloudConfigure() ? (SB.user() ? "ok" : "warn") : "bad",
     !Moteur.cloudConfigure() ? "Non configurée dans config.js" : SB.user() ? "Prête, modèle chirp_3 région eu" : "Connecte-toi pour l'activer"],
    ["Reconnaissance de secours", Moteur.navigateurDisponible() ? "warn" : "bad",
     Moteur.navigateurDisponible() ? "Disponible, ne connaît pas le luxembourgeois, ne peut jamais te pénaliser" : "Indisponible"],
    ["Service worker", "serviceWorker" in navigator ? "ok" : "warn", "serviceWorker" in navigator ? "Hors ligne opérationnel" : "Hors ligne limité"],
    ["Plateforme", ios ? "warn" : "ok",
     ios ? "iOS : la synthèse s'arrête écran verrouillé, garde l'écran allumé" : navigator.userAgent.slice(0, 60)]
  ];
}

export async function rendreDiagnostic() {
  const el = $("diagnosticList");
  if (!el) return;
  const data = await controlesRapides();
  el.innerHTML = data.map(([n, e, d]) => ligne(n, e, d)).join("");
  const sel = $("micSelect");
  if (sel) {
    const list = await Micro.listerAppareils();
    sel.innerHTML = list.length
      ? `<option value="">Micro par défaut de l'appareil</option>` + list.map((d) => `<option value="${echapper(d.id)}">${echapper(d.label)}</option>`).join("")
      : `<option value="">Autorise le micro pour voir la liste</option>`;
    sel.value = Micro.appareilActuel() || "";
  }
}

/**
 * Test complet, maillon par maillon.
 * L'application dit « Dis Moien », écoute, puis affiche exactement
 * ce qu'elle a entendu, par quel moteur, en combien de temps.
 */
export async function lancerTestMicro() {
  const btn = $("voiceTestBtn");
  const box = $("voiceTestResult");
  if (btn) btn.disabled = true;
  const etapes = [];
  const pousse = (n, e, d) => { etapes.push([n, e, d]); if (box) box.innerHTML = etapes.map(([a, b, c]) => ligne(a, b, c)).join(""); };

  try {
    if (box) box.innerHTML = `<p class="muted">Autorise le micro, puis dis « Moien » une seule fois.</p>`;

    // 1. Autorisation et ouverture
    try { await Micro.ouvrir(); pousse("Autorisation micro", "ok", "Accordée"); }
    catch (e) { pousse("Autorisation micro", "bad", e.message); return finir(); }

    // 2. Appareil réellement utilisé
    const info = Micro.infosFlux();
    pousse("Microphone utilisé", info?.qualiteReduite ? "warn" : "ok",
      `${info?.label || "micro par défaut"} · ${info?.sampleRate || "?"} Hz${info?.bluetooth ? " · Bluetooth mains libres, qualité réduite" : ""}`);

    // 3. Niveau au repos, sert de plancher de bruit
    const repos = await Micro.mesurerNiveau(900);
    pousse("Bruit ambiant", repos.moyenDb < -45 ? "ok" : repos.moyenDb < -32 ? "warn" : "bad",
      `${Math.round(repos.moyenDb)} dB${repos.moyenDb >= -32 ? " · environnement très bruyant, active le profil voiture" : ""}`);

    // 4. Consigne puis capture
    await Voix.dire("Dis Moien maintenant.", "fr");
    const t0 = performance.now();
    const capture = await Rec.capturer({ profil: repos.moyenDb >= -40 ? "voiture" : "calme", attenteMaxMs: 5000 });
    const captureMs = Math.round(performance.now() - t0);

    pousse("Détection de parole", capture.vad?.speechDetected ? "ok" : "bad",
      capture.vad?.speechDetected
        ? `${capture.vad.speechMs} ms de parole · seuil ${Math.round(capture.vad.seuilDb)} dB · signal sur bruit ${Math.round(capture.vad.snrDb)} dB`
        : `Rien détecté en ${captureMs} ms. Rapproche le téléphone ou parle plus fort.`);

    if (!capture.blob) { pousse("Enregistrement", "bad", capture.error || "Aucun audio produit."); return finir(); }
    pousse("Enregistrement", "ok", `${capture.mimeType} · ${Math.round(capture.octets / 1024)} Ko · ${capture.vad.totalMs} ms`);
    dernier = { blob: capture.blob, attendu: MOT_TEST };

    if (!capture.vad.speechDetected) return finir();

    // 5. Transcription
    const jeton = await SB.jetonAcces();
    let stt = null;
    if (Moteur.cloudConfigure()) {
      stt = await Moteur.reconnaissanceCloud({
        blob: capture.blob, mimeType: capture.mimeType,
        expected: MOT_TEST, accepted: [], contexte: [], jeton
      });
      pousse("Transcription cloud", stt.transcripts.length ? "ok" : "bad",
        stt.transcripts.length
          ? `${stt.model} · ${stt.lang} · région ${stt.region} · ${stt.latencyMs} ms aller-retour, dont ${stt.serverMs} ms serveur`
          : stt.error);
      if (stt.usage) pousse("Quota du mois", stt.usage.used < stt.usage.limit * 0.8 ? "ok" : "warn",
        `${stt.usage.used} sur ${stt.usage.limit} pour ${stt.usage.period}`);
    } else {
      pousse("Transcription cloud", "bad", "Non configurée. Renseigne functionsBaseUrl dans config.js.");
    }

    if (!stt?.transcripts.length && Moteur.navigateurDisponible()) {
      const nav = await Moteur.reconnaissanceNavigateur(6000);
      pousse("Transcription de secours", nav.transcripts.length ? "warn" : "bad",
        nav.transcripts.length ? `Navigateur en ${nav.lang}, ${nav.latencyMs} ms. Ne connaît pas le luxembourgeois.` : nav.error);
      if (nav.transcripts.length) stt = nav;
    }

    if (!stt?.transcripts.length) { pousse("Comparaison", "bad", "Aucune transcription à comparer."); return finir(); }

    // 6. Comparaison et verdict
    const m = compare(MOT_TEST, [], stt.transcripts);
    const v = verdictDe({
      engine: stt.engine, error: stt.error, errorKind: stt.errorKind || "none",
      speechDetected: true, speechMs: capture.vad.speechMs, snrDb: capture.vad.snrDb, match: m
    });
    pousse("Comparaison", v.verdict === VERDICT.CORRECT || v.verdict === VERDICT.PROBABLE ? "ok" : "warn",
      `score ${m.score.toFixed(2)} · seuil requis ${seuilPour(m.cible).toFixed(2)}${m.diacritiqueSeul ? " · différence d'accent uniquement" : ""}`);

    if (box) {
      box.innerHTML += `
      <div class="test-card">
        <div><span>Attendu</span><b>${echapper(MOT_TEST)}</b></div>
        <div><span>Entendu</span><b>${echapper(stt.transcripts.map((t) => t.text).join(" / ") || "rien")}</b></div>
        <div><span>Moteur</span><b>${stt.engine === "cloud" ? `Google STT ${stt.lang}` : "Navigateur, secours"}</b></div>
        <div><span>Temps</span><b>${stt.latencyMs} ms</b></div>
        <div><span>Résultat</span><b data-verdict="${v.verdict}">${LIBELLE[v.verdict]}</b></div>
        <div><span>Effet sur la progression</span><b>${v.effet === EFFET.NONE ? "aucun, test seulement" : v.effet}</b></div>
      </div>
      <button class="ghost full" id="replayTestBtn">Réécouter mon enregistrement</button>
      <p class="muted small">Si tu t'entends bien mais que le texte est faux, le problème vient du moteur de transcription, pas de ta prononciation. Ce test ne modifie jamais ta progression.</p>`;
      const rb = $("replayTestBtn");
      if (rb) rb.onclick = () => Rec.lireBlob(dernier?.blob);
    }
  } catch (e) {
    pousse("Test", "bad", e.message || "Test interrompu.");
  } finally {
    finir();
  }

  function finir() {
    if (btn) btn.disabled = false;
    Micro.fermer();
    rendreDiagnostic();
  }
}

export function texteDiagnostic() {
  const d = dernier ? `\nDernier test: attendu ${dernier.attendu}` : "";
  return [
    `Lëtzebuergesch am Auto ${(window.LETZ_CONFIG || {}).appVersion || ""}`,
    `Contenu ${(window.LETZ_CONTENT || {}).contentVersion || ""}`,
    `Navigateur ${navigator.userAgent}`,
    `Cloud configuré ${Moteur.cloudConfigure()}`,
    `Compte connecté ${!!SB.user()}`,
    `Format audio ${Rec.mimeDisponible()}`,
    `Voix lb réelle ${Voix.voixLuxembourgeoiseReelle()}`,
    d
  ].join("\n");
}

export function brancherDiagnostic() {
  const b = $("voiceTestBtn"); if (b) b.onclick = lancerTestMicro;
  const f = $("fullDiagnosticBtn"); if (f) f.onclick = lancerTestMicro;
  const c = $("copyDiagBtn");
  if (c) c.onclick = () => navigator.clipboard?.writeText(texteDiagnostic()).then(() => toast("Diagnostic copié.")).catch(() => toast("Copie impossible."));
  rendreDiagnostic();
}
