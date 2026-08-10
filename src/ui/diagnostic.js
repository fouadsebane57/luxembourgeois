/* ===================================================================
   DIAGNOSTIC

   Objectif : ne plus jamais afficher « À régler » sans dire pourquoi
   ni quoi faire. Chaque ligne porte un état, une cause et une action.
   =================================================================== */

import * as Micro from "../audio/mic.js";
import * as Rec from "../audio/recorder.js";
import * as Moteur from "../speech/engine.js";
import * as Voix from "../audio/tts.js";
import * as Cfg from "../core/config.js";
import { CAUSE, fiche } from "../speech/erreurs.js";
import { resume as resumeFormat, choisir as choisirFormat } from "../audio/formats.js";
import { compare, verdictDe, LIBELLE, VERDICT, EFFET, seuilPour } from "../speech/score.js";
import * as SB from "../data/supabase.js";
import { $, echapper, toast } from "./render.js";

const MOT_TEST = "Moien";
let dernier = null;
export const dernierTest = () => dernier;

const ETIQUETTE = { ok: "OK", warn: "À surveiller", bad: "À régler" };

function rendreLigne(nom, etat, detail, action) {
  return `<div class="diag-row" data-etat="${etat}">
    <span>
      <b>${echapper(nom)}</b>
      <small>${echapper(detail || "")}</small>
      ${action ? `<em class="diag-action">→ ${echapper(action)}</em>` : ""}
    </span>
    <b class="tag-${etat}">${ETIQUETTE[etat]}</b>
  </div>`;
}

/** Ligne HTML construite depuis une cause connue. */
function rendreCause(nom, cause, detailTechnique) {
  const f = fiche(cause);
  if (!f) return rendreLigne(nom, "ok", detailTechnique);
  return rendreLigne(nom, "bad", `${f.titre}. ${detailTechnique || f.message}`, f.action);
}

/* ---------- Contrôles instantanés ----------
   Renvoie des données structurées, pas du HTML. Deux raisons :
   c'est testable automatiquement, et c'est réutilisable par le
   rapport copiable. Le rendu est fait plus bas par ligneDe().
   ------------------------------------------------------------ */

export async function controlesRapides() {
  const perm = await Micro.etatPermission();
  const mime = Rec.mimeDisponible();
  const v = Cfg.verifier();
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const cloud = Moteur.etatCloud(!!SB.user());
  const voix = Voix.descriptionVoix();
  const L = [];
  const ligne = (nom, etat, detail, action) => ({ nom, etat, detail: detail || "", action: action || "" });
  const ligneCause = (nom, cause, detailTechnique) => {
    const f = fiche(cause);
    return f ? { nom, etat: "bad", detail: `${f.titre}. ${detailTechnique || f.message}`, action: f.action, cause }
             : { nom, etat: "ok", detail: detailTechnique || "", action: "" };
  };

  L.push(ligne("Version de l'application", "ok", `LULU Trajet ${Cfg.version()} · contenu ${(window.LULU_CONTENT || window.LETZ_CONTENT || {}).contentVersion || "?"}`));

  L.push(ligne("Connexion sécurisée",
    location.protocol === "https:" || location.hostname === "localhost" ? "ok" : "bad",
    location.protocol === "https:" ? "HTTPS actif" : "Le micro exige HTTPS",
    location.protocol === "https:" ? "" : "Ouvre le site en https."));

  // Configuration, champ par champ. C'est ici que se lisait le blocage.
  if (v.ok) {
    L.push(ligne("Fichier config.js", "ok", "Les trois valeurs sont présentes et bien formées."));
  } else {
    const f = fiche(v.cause);
    const detail = v.champs.length
      ? v.champs.map((c) => `${c.cle} : ${c.vide ? "VIDE" : c.formatOk ? "ok" : "format inattendu"}`).join(" · ")
      : v.resume;
    L.push(ligne("Fichier config.js", "bad", `${v.resume} ${detail}`, f?.action || ""));
  }

  L.push(ligne("API micro", Micro.supporte() ? "ok" : "bad",
    Micro.supporte() ? "getUserMedia disponible" : "Non supportée par ce navigateur"));

  L.push(ligne("Autorisation micro",
    perm === "granted" ? "ok" : perm === "denied" ? "bad" : "warn",
    perm === "granted" ? "Accordée"
      : perm === "denied" ? "Refusée"
      : "Sera demandée au premier test",
    perm === "denied" ? "Réglages du navigateur, section Micro, autorise ce site." : ""));

  // Moteur audio : la panne de la 5.0.0 venait de là.
  const etatCtx = Micro.etatContexte();
  L.push(ligne("Moteur audio",
    etatCtx === "running" ? "ok" : etatCtx === "absent" ? "warn" : "warn",
    etatCtx === "running" ? "En fonctionnement"
      : etatCtx === "absent" ? "Pas encore démarré, normal avant le premier test"
      : `État ${etatCtx}. Sur iPhone il démarre seulement après un appui à l'écran.`,
    etatCtx === "suspended" ? "Appuie sur Tester maintenant, cela le réveille." : ""));

  // Le format retenu et ses trois critères, mesurés sur CET appareil.
  const f = choisirFormat();
  const rf = resumeFormat(f);
  L.push(ligne("Enregistrement audio", f.mime === null ? "bad" : "ok",
    f.mime === null ? "MediaRecorder indisponible" : `Format retenu : ${rf.enregistrement}`));
  if (f.mime !== null) {
    L.push(ligne("Lecture locale du format", f.relisible ? "ok" : "bad",
      `${rf.lectureLocale}. ${f.explication}`,
      f.relisible ? "" : "La réécoute de ta voix sera indisponible sur cet appareil. Signale-le avec le format affiché."));
    L.push(ligne("Format accepté par la transcription", rf.speechToText === "compatible" ? "ok" : "warn",
      rf.speechToText === "compatible"
        ? "Format officiellement pris en charge par le service de transcription."
        : "Compatibilité à confirmer par un envoi réel."));
  }

  L.push(ligne("Synthèse vocale", voix.etat, voix.texte,
    voix.etat === "ok" ? "" : "Aucune action possible : cela dépend des voix installées sur l'appareil."));

  if (cloud.pret) {
    L.push(ligne("Reconnaissance luxembourgeoise", "ok", cloud.resume));
  } else {
    L.push(ligneCause("Reconnaissance luxembourgeoise", cloud.cause, cloud.resume));
  }

  // Le mode autonome garantit que l'application reste utilisable même
  // si tout le reste est en défaut. Il mérite d'être annoncé comme un
  // état sain, pas comme un pis-aller.
  L.push(ligne("Mode autonome", "ok",
    "Actif. Sans serveur, l'application mesure ta tentative, joue le modèle, rejoue ta voix, et te laisse juger. Ta progression avance quand même."));

  L.push(ligne("Reconnaissance de secours", Moteur.navigateurDisponible() ? "warn" : "bad",
    Moteur.navigateurDisponible()
      ? "Disponible. Elle ne connaît pas le luxembourgeois et ne peut jamais te pénaliser."
      : "Indisponible sur ce navigateur."));

  L.push(ligne("Mode hors ligne", "serviceWorker" in navigator ? "ok" : "warn",
    "serviceWorker" in navigator ? "Application utilisable sans réseau" : "Hors ligne limité"));

  L.push(ligne("Appareil", ios ? "warn" : "ok",
    ios ? "iPhone : la voix s'arrête quand l'écran se verrouille."
        : navigator.userAgent.slice(0, 70),
    ios ? "Garde l'écran allumé pendant le trajet, ou utilise un support avec alimentation." : ""));

  return L;
}

export async function rendreDiagnostic() {
  const el = $("diagnosticList");
  if (!el) return;
  el.innerHTML = (await controlesRapides())
    .map((x) => rendreLigne(x.nom, x.etat, x.detail, x.action)).join("");
  const sel = $("micSelect");
  if (sel) {
    const list = await Micro.listerAppareils();
    sel.innerHTML = list.length
      ? `<option value="">Micro par défaut de l'appareil</option>` +
        list.map((d) => `<option value="${echapper(d.id)}">${echapper(d.label)}</option>`).join("")
      : `<option value="">Autorise le micro pour voir la liste</option>`;
    sel.value = Micro.appareilActuel() || "";
  }
}

/* ---------- Test complet, maillon par maillon ---------- */

export async function lancerTestMicro() {
  const btn = $("voiceTestBtn");
  const box = $("voiceTestResult");
  const badge = $("voiceTestBadge");
  if (btn) { btn.disabled = true; btn.textContent = "Test en cours…"; }
  if (badge) { badge.textContent = "en cours"; badge.dataset.etat = "warn"; }

  const L = [];
  const pousse = (...args) => { L.push(rendreLigne(...args)); if (box) box.innerHTML = L.join(""); };
  const pousseCause = (nom, cause, detail) => { L.push(rendreCause(nom, cause, detail)); if (box) box.innerHTML = L.join(""); };
  let etatFinal = "bad";

  try {
    if (box) box.innerHTML = `<p class="muted">Autorise le micro, puis dis « Moien » une seule fois.</p>`;

    // 1. Micro
    try { await Micro.ouvrir(); pousse("Autorisation micro", "ok", "Accordée"); }
    catch (e) { pousse("Autorisation micro", "bad", e.message, "Réglages du navigateur, section Micro."); return finir(); }

    // 2. Moteur audio, réveillé et attendu
    const running = await Micro.reveiller();
    pousse("Moteur audio", running ? "ok" : "bad",
      running ? "Démarré et en fonctionnement" : `Bloqué en état ${Micro.etatContexte()}`,
      running ? "" : "Ferme puis rouvre l'application, et appuie sur le bouton sans passer par un raccourci.");
    if (!running) return finir();

    // 3. Appareil réel
    const info = Micro.infosFlux();
    pousse("Microphone utilisé", info?.qualiteReduite ? "warn" : "ok",
      `${info?.label} · ${info?.sampleRate || "?"} Hz${info?.bluetooth ? " · Bluetooth mains libres" : ""}`,
      info?.bluetooth ? "En voiture, compare avec le micro du téléphone : il est souvent meilleur." : "");

    // 4. Niveau au repos
    const repos = await Micro.mesurerNiveau(1000);
    if (!repos.fiable) {
      pousse("Bruit ambiant", "bad", "Mesure impossible, le moteur audio ne tournait pas.");
      return finir();
    }
    if (!repos.ok) {
      pousse("Bruit ambiant", "bad",
        `Aucun signal détecté, ${Math.round(repos.picDb)} dB au maximum. Le micro est muet ou dirigé vers un autre appareil.`,
        "Vérifie qu'aucun casque ni enceinte Bluetooth ne capte le son à la place du téléphone.");
      return finir();
    }
    pousse("Bruit ambiant", repos.moyenDb < -45 ? "ok" : repos.moyenDb < -32 ? "warn" : "bad",
      `${Math.round(repos.moyenDb)} dB en moyenne, pic à ${Math.round(repos.picDb)} dB`,
      repos.moyenDb >= -32 ? "Environnement très bruyant. Active le profil Voiture." : "");

    // 5. Capture
    await Voix.dire("Dis Moien maintenant.", "fr");
    // Le diagnostic pilote son propre cycle micro, hors séance.
    // C'est l'exception assumée à la règle de l'orchestrateur unique :
    // aucune séance ne tourne pendant un diagnostic.
    const capture = await Rec.capturer({
      profil: repos.moyenDb >= -40 ? "voiture" : "calme", attenteMaxMs: 5000
    });
    const vad = capture.vad;

    if (!vad?.speechDetected) {
      pousse("Détection de parole", "bad",
        vad?.detail || `Rien détecté. Seuil ${Math.round(vad?.seuilDb ?? 0)} dB, pic ${Math.round(vad?.peakDb ?? -100)} dB.`,
        "Rapproche le téléphone à moins de cinquante centimètres et parle normalement.");
      if (capture.blob) proposerReecoute(capture.blob);
      return finir();
    }
    pousse("Détection de parole", "ok",
      `${vad.speechMs} ms de parole · seuil ${Math.round(vad.seuilDb)} dB · signal sur bruit ${Math.round(vad.snrDb)} dB`);

    if (!capture.blob) { pousse("Enregistrement", "bad", capture.error || "Aucun audio produit."); return finir(); }
    pousse("Enregistrement", "ok",
      `${capture.mimeType} · ${Math.round(capture.octets / 1024)} Ko · ${vad.totalMs} ms`);
    dernier = { blob: capture.blob, attendu: MOT_TEST, mime: capture.mimeType };

    // 6. Transcription cloud
    const jeton = await SB.jetonAcces();
    let stt = null;
    const ec = Moteur.etatCloud(!!jeton);

    if (!ec.pret) {
      pousseCause("Transcription luxembourgeoise", ec.cause, ec.resume);
    } else {
      stt = await Moteur.reconnaissanceCloud({
        blob: capture.blob, mimeType: capture.mimeType,
        expected: MOT_TEST, accepted: [], contexte: [], jeton
      });
      if (stt.transcripts.length) {
        pousse("Transcription luxembourgeoise", "ok",
          `${stt.model} · ${stt.lang} · région ${stt.region} · ${stt.latencyMs} ms dont ${stt.serverMs} ms serveur`);
        if (stt.usage) pousse("Quota du mois",
          stt.usage.used < stt.usage.limit * 0.8 ? "ok" : "warn",
          `${stt.usage.used} sur ${stt.usage.limit} pour ${stt.usage.period}`);
      } else {
        pousseCause("Transcription luxembourgeoise", stt.cause,
          `${stt.error}${stt.httpStatus ? ` (HTTP ${stt.httpStatus})` : ""}`);
      }
    }

    // 7. Secours navigateur
    if (!stt?.transcripts.length) {
      const nav = await Moteur.reconnaissanceNavigateur(6000);
      if (nav.transcripts.length) {
        pousse("Transcription de secours", "warn",
          `Navigateur en ${nav.lang}, ${nav.latencyMs} ms. Ne connaît pas le luxembourgeois.`);
        stt = nav;
      } else {
        pousseCause("Transcription de secours", nav.cause, nav.error);
      }
    }

    if (!stt?.transcripts.length) {
      pousse("Comparaison", "bad", "Aucune transcription à comparer.",
        "Corrige d'abord la ligne rouge ci-dessus.");
      proposerReecoute(capture.blob);
      return finir();
    }

    // 8. Comparaison
    const m = compare(MOT_TEST, [], stt.transcripts);
    const v = verdictDe({
      engine: stt.engine, error: stt.error, errorKind: "none",
      speechDetected: true, speechMs: vad.speechMs, snrDb: vad.snrDb, match: m
    });
    const bon = v.verdict === VERDICT.CORRECT || v.verdict === VERDICT.PROBABLE;
    etatFinal = bon ? "ok" : "warn";
    pousse("Comparaison", bon ? "ok" : "warn",
      `score ${m.score.toFixed(2)} · seuil requis ${seuilPour(m.cible).toFixed(2)}${m.diacritiqueSeul ? " · seul l'accent diffère" : ""}`);

    if (box) {
      box.innerHTML += `
      <div class="test-card">
        <div><span>Attendu</span><b>${echapper(MOT_TEST)}</b></div>
        <div><span>Entendu</span><b>${echapper(stt.transcripts.map((t) => t.text).join(" / "))}</b></div>
        <div><span>Moteur</span><b>${stt.engine === "cloud" ? `Google STT ${stt.lang}` : "Navigateur, secours"}</b></div>
        <div><span>Temps</span><b>${stt.latencyMs} ms</b></div>
        <div><span>Résultat</span><b data-verdict="${v.verdict}">${LIBELLE[v.verdict]}</b></div>
        <div><span>Progression</span><b>${v.effet === EFFET.NONE ? "inchangée, c'est un test" : "inchangée, c'est un test"}</b></div>
      </div>`;
      proposerReecoute(capture.blob);
    }
  } catch (e) {
    pousse("Test", "bad", e.message || "Test interrompu.");
  } finally {
    finir();
  }

  function proposerReecoute(blob) {
    if (!box || !blob) return;
    box.innerHTML += `
      <button class="ghost full" id="replayTestBtn">Réécouter mon enregistrement</button>
      <p class="muted small">Si tu t'entends bien mais que le texte est faux, le problème vient du moteur de transcription, pas de ta prononciation. Si tu ne t'entends pas, le problème vient du micro. Ce test ne modifie jamais ta progression.</p>`;
    const rb = $("replayTestBtn");
    if (rb) rb.onclick = () => Rec.lireBlob(blob);
  }

  function finir() {
    if (btn) { btn.disabled = false; btn.textContent = "Tester maintenant"; }
    if (badge) { badge.textContent = etatFinal === "ok" ? "réussi" : "à corriger"; badge.dataset.etat = etatFinal; }
    Micro.fermer();
    rendreDiagnostic();
  }
}

/* ---------- Rapport copiable ---------- */

export function texteDiagnostic() {
  const v = Cfg.verifier();
  const cloud = Moteur.etatCloud(!!SB.user());
  return [
    `LULU Trajet ${Cfg.version()}`,
    `Contenu ${(window.LULU_CONTENT || window.LETZ_CONTENT || {}).contentVersion || "?"}`,
    `Navigateur ${navigator.userAgent}`,
    `Adresse ${location.href}`,
    "",
    Cfg.rapport(),
    "",
    `Moteur cloud : ${cloud.pret ? "prêt" : cloud.cause} — ${cloud.resume}`,
    `Compte connecté : ${!!SB.user()}`,
    `Contexte audio : ${Micro.etatContexte()}`,
    `Format audio : ${Rec.mimeDisponible()}`,
    `Voix : ${Voix.descriptionVoix().texte}`,
    dernier ? `Dernier test : attendu ${dernier.attendu}, format ${dernier.mime}` : "Aucun test lancé."
  ].join("\n");
}

export function brancherDiagnostic() {
  const b = $("voiceTestBtn"); if (b) b.onclick = lancerTestMicro;
  const f = $("fullDiagnosticBtn"); if (f) f.onclick = lancerTestMicro;
  const c = $("copyDiagBtn");
  if (c) c.onclick = () => navigator.clipboard?.writeText(texteDiagnostic())
    .then(() => toast("Diagnostic copié.")).catch(() => toast("Copie impossible."));
  rendreDiagnostic();
}
