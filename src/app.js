/* ===================================================================
   LULU TRAJET · v5.1.0
   Apprendre le luxembourgeois en audio pendant les trajets.
   Point d'entrée. Modules ES natifs, aucun outil de construction.
   =================================================================== */

import * as C from "./core/content.js";
import * as S from "./core/state.js";
import * as Sched from "./core/scheduler.js";
import * as Sess from "./core/session.js";
import * as Mig from "./core/migrate.js";
import * as Voix from "./audio/tts.js";
import * as Micro from "./audio/mic.js";
import * as Rec from "./audio/recorder.js";

import * as Moteur from "./speech/engine.js";
import { VERDICT, EFFET, LIBELLE, MESSAGE } from "./speech/score.js";
import * as SB from "./data/supabase.js";
import * as Sync from "./data/sync.js";
import { rendre, toast, $, $$, echapper, ouvrirModale, fermerModale } from "./ui/render.js";
import { brancherDiagnostic, lancerTestMicro } from "./ui/diagnostic.js";
import * as Commandes from "./ui/commandes.js";
import * as Cfg from "./core/config.js";

export const VERSION = Cfg.version();

/* ---------- état d'exécution ---------- */
let route = "home";
let seance = null;
let jetonSeance = 0;
let enPause = false;
let droits = { premium: false, source: "local", statut: "local" };
let promptInstall = null;
let dernierEnregistrement = null;
let resolutionAuto = null;

export const estPremium = () => !!droits.premium;
export const routeActive = () => route;
export const seanceActive = () => seance;
export const droitsActuels = () => droits;

const MODES = [
  { id: "smart",    icone: "🚗",  titre: "Mode voiture",       desc: "Écoute et répète, sans toucher l'écran. Français, luxembourgeois, ta réponse.", meta: "recommandé", premium: false },
  { id: "review",   icone: "↺",   titre: "Révisions",          desc: "Reprend uniquement ce qui arrive à échéance.",         meta: "mémoire",    premium: false },
  { id: "sprint",   icone: "⚡",  titre: "Sprint oral",        desc: "Réponses rapides en luxembourgeois, sans lire.",       meta: "5 min",      premium: false },
  { id: "numbers",  icone: "123", titre: "Chiffres",           desc: "Automatise les nombres dans un ordre imprévisible.",   meta: "rapide",     premium: false },
  { id: "listen",   icone: "♫",   titre: "Écoute libre",       desc: "Aucune pression. Écoute et laisse la langue rentrer.", meta: "fatigue",    premium: false },
  { id: "repeat",   icone: "◉",   titre: "Écoute et répète",   desc: "Fonctionne partout, même sans réseau ni compte. Le modèle, ta voix, tu compares.", meta: "hors ligne", premium: false },
  { id: "dialogue", icone: "◫",   titre: "Dialogues",          desc: "Conversations à deux voix avec traduction.",           meta: "premium",    premium: true },
  { id: "mistakes", icone: "◎",   titre: "Mes erreurs",        desc: "Reprend tes fragilités les plus fréquentes.",          meta: "premium",    premium: true }
];
export const modes = () => MODES;

/* ---------- calculs dérivés ---------- */
export const leconCourante = () => {
  const cours = C.COURS();
  for (let i = 0; i < cours.length; i++) if (!S.state().validated[cours[i].lid]) return i;
  return Math.max(0, cours.length - 1);
};
export const etapeCourante = () => C.COURS()[leconCourante()]?.e || 1;
export const dus = () => C.itemsUniques().filter((i) => Sched.estDu(S.progressionDe(i.id)));
export const solides = () => C.itemsUniques().filter((i) => Sched.estSolide(S.progressionDe(i.id)));
export const leconsValidees = () => Object.values(S.state().validated).filter(Boolean).length;
export const minutesAujourdHui = () => Number(S.state().journal.hist?.[Sched.aujourdHui()] || 0);

function verifierLecon(li) {
  const lecon = C.COURS()[li];
  if (!lecon) return;
  const its = C.itemsDeLecon(li);
  const ok = its.filter((i) => Sched.estSolide(S.progressionDe(i.id))).length;
  if (ok >= Math.ceil(its.length * 0.8)) { S.state().validated[lecon.lid] = true; S.sauver(); }
}

/* ---------- verrouillage Premium ---------- */
export function leconVerrouillee(li) {
  const limite = Cfg.gratuit().lessons ?? 8;
  return !estPremium() && li >= limite;
}

/* ---------- navigation ---------- */
export function allerA(r) {
  const routes = ["home", "learn", "courses", "practice", "progress", "voice", "premium", "account"];
  route = routes.includes(r) ? r : "home";
  $$(".view").forEach((v) => {
    const actif = v.dataset.view === route;
    v.classList.toggle("active", actif);
    v.hidden = !actif;
    v.setAttribute("aria-hidden", actif ? "false" : "true");
  });
  rendre();
  window.scrollTo({ top: 0, behavior: "smooth" });
  const url = new URL(location.href);
  url.searchParams.set("route", route);
  history.replaceState(null, "", url);
}

/* ---------- séance ---------- */
export async function demarrerMode(mode, leconForcee = null) {
  const def = MODES.find((m) => m.id === mode);
  if (def?.premium && !estPremium()) { allerA("premium"); toast("Ce mode fait partie de Premium."); return; }

  const maxGratuit = Number(Cfg.gratuit().maxSessionMinutes || 20);
  let duree = Number(S.state().settings.duration || 20);
  if (!estPremium() && duree > maxGratuit) {
    duree = maxGratuit;
    S.state().settings.duration = duree; S.sauver();
    toast(`La formule Découverte est limitée à ${maxGratuit} minutes par séance.`);
  }

  // Nous sommes dans un geste utilisateur : c'est le seul moment où
  // iOS accepte de démarrer le moteur audio. On l'attend vraiment.
  await Micro.reveiller();
  await Voix.preparer();

  const s = Sess.creerSeance({
    mode,
    dureeMinutes: mode === "sprint" || mode === "numbers" ? Math.min(5, duree) : duree,
    items: C.items(),
    dialogues: C.DIALOGUES(),
    progression: S.state().progress,
    leconCourante: leconForcee ?? leconCourante(),
    etapeCourante: etapeCourante()
  });
  if (!s.file.length && !s.recyclage.length) { toast("Aucun contenu disponible pour ce mode."); return; }

  fermerModale("lessonModal");
  seance = s;
  jetonSeance++;
  enPause = false;
  $("sessionOverlay").hidden = false;
  document.body.style.overflow = "hidden";
  $("sessionPauseBtn").textContent = "Pause";
  Sess.demarrer(seance);
  activerMediaSession();
  demarrerCommandesVocales();
  await boucleSeance(jetonSeance);
}

async function boucleSeance(jeton) {
  while (seance && jeton === jetonSeance) {
    if (enPause) { await pause(200); continue; }
    const ex = Sess.prochain(seance);
    if (!ex) break;
    majBandeau();
    const t0 = Date.now();
    if (ex.type === Sess.TYPES.DIALOGUE) await jouerDialogue(ex.dialogue, jeton);
    else await jouerExercice(ex, jeton);
    if (!seance || jeton !== jetonSeance) return;
    Sess.terminerExercice(seance, ex, Date.now() - t0);

    // Position mémorisée après CHAQUE exercice. Une fermeture brutale de
    // l'application, un appel entrant ou une batterie vide ne fait donc
    // jamais perdre plus d'un exercice.
    const it = ex.it || null;
    S.noterPosition({
      mode: seance.mode,
      lecon: it ? it.lesson : leconCourante(),
      lid: it ? it.lid : "",
      itemId: it ? it.id : "",
      position: seance.index,
      seanceMinutes: Math.round(seance.cibleMs / 60000),
      terminee: false
    });
  }
  if (seance && jeton === jetonSeance) cloturer();
}

function majBandeau() {
  if (!seance) return;
  const noms = { smart: "Mode voiture", repeat: "Écoute et répète", review: "Révisions", sprint: "Sprint oral", numbers: "Chiffres", listen: "Écoute libre", dialogue: "Dialogue", mistakes: "Mes erreurs" };
  const restant = Math.ceil(Sess.restantMs(seance) / 60000);
  $("sessionModeLabel").textContent = noms[seance.mode] || "Séance";
  $("sessionCounter").textContent = `${restant} min restantes`;
  $("sessionProgressBar").style.width = `${Math.round(Sess.progressionTemps(seance) * 100)}%`;
}

function afficher({ phase, prompt = "", phonetique = "", traduction = "", entendu = "", verdict = "" }) {
  $("sessionPhase").textContent = phase || "";
  $("sessionPrompt").textContent = prompt;
  $("sessionPhonetic").textContent = phonetique;
  $("sessionTranslation").textContent = traduction;
  const h = $("sessionHeard");
  h.hidden = !entendu;
  h.textContent = entendu ? `Entendu : ${entendu}` : "";
  const b = $("sessionVerdict");
  if (b) { b.hidden = !verdict; b.textContent = verdict ? LIBELLE[verdict] || "" : ""; b.dataset.verdict = verdict || ""; }
  $("sessionFeedback").hidden = true;
  $("sessionOrb").classList.remove("listening");
}

async function jouerExercice(ex, jeton) {
  const it = ex.it;
  const vivant = () => seance && jeton === jetonSeance;

  if (ex.type === Sess.TYPES.ECOUTE) {
    afficher({ phase: "Écoute", prompt: it.lb, phonetique: it.ph });
    await Voix.dire(it.lb, "lb");
    if (!vivant()) return;
    afficher({ phase: "Sens", prompt: it.lb, phonetique: it.ph, traduction: it.fr });
    await Voix.dire(it.fr, "fr");
    if (!vivant()) return;
    await Voix.dire(it.lb, "lb", 0.9);
    S.enregistrerExposition(it.id);
    return;
  }

  if (ex.type === Sess.TYPES.NOMBRE) {
    afficher({ phase: "Quel nombre ?", prompt: it.lb });
    await Voix.dire(it.lb, "lb");
    await pause(1500);
    if (!vivant()) return;
    afficher({ phase: "Réponse", prompt: it.lb, traduction: it.fr });
    await Voix.dire(it.fr, "fr");
    S.enregistrerExposition(it.id);
    return;
  }

  // Exercice oral.
  afficher({ phase: "À toi", prompt: `Comment dis-tu : ${it.fr} ?` });
  await Voix.dire(`Comment dis-tu : ${it.fr} ?`, "fr");
  if (!vivant()) return;

  $("sessionOrb").classList.add("listening");
  const r = await Moteur.evaluerReponse(it, {
    moteur: S.state().settings.recognition,
    profil: S.state().settings.profilAudio,
    attenteMaxMs: S.state().settings.attenteMaxMs,
    paroleMaxMs: S.state().settings.paroleMaxMs,
    contexte: C.vocabulaireLecon(it.lesson, 30),
    jeton: await SB.jetonAcces(),
    onNiveau: peindreNiveau,
    annule: () => !vivant() || enPause
  });
  $("sessionOrb").classList.remove("listening");
  if (!vivant()) return;

  dernierEnregistrement = r.blob || null;
  seance.tentatives++;
  if (r.fiable) seance.fiables++;
  if (r.verdict === VERDICT.CORRECT) seance.correct++;

  afficher({
    phase: LIBELLE[r.verdict],
    prompt: it.lb, phonetique: it.ph, traduction: it.fr,
    entendu: r.engine === "local" ? (r.detailRythme || "") : (r.match?.texte || ""),
    verdict: r.verdict
  });

  // Écriture de la progression. Un effet NONE n'écrit rien du tout.
  if (r.effet !== EFFET.NONE) {
    S.enregistrerResultat(it.id, r.effet, "production", { fiable: r.fiable, confidence: r.match?.confidence });
    verifierLecon(it.lesson);
  }

  // Mode autonome : le rythme d'abord, s'il y a quelque chose à dire,
  // puis le modèle, puis sa propre voix. C'est la comparaison directe
  // qui apprend, pas la note.
  if (r.engine === "local") {
    if (r.messageRythme) await Voix.dire(r.messageRythme, "fr");
    else await Voix.dire("Écoute le modèle, puis ta voix.", "fr");
    if (!vivant()) return;
    await Voix.dire(it.lb, "lb", 0.8);
    if (!vivant()) return;
    if (r.blob) await Rec.lireBlob(r.blob);
    if (!vivant()) return;
    await Voix.dire(it.lb, "lb", 0.9);
  } else {
    await Voix.dire(MESSAGE[r.verdict], "fr");
    if (!vivant()) return;
    if (r.verdict !== VERDICT.CORRECT) {
      await Voix.dire(it.lb, "lb", 0.85);
      if (!vivant()) return;
      // Entendre sa propre voix juste après le modèle est le meilleur
      // moyen de distinguer un problème de prononciation d'un problème de micro.
      if (S.state().settings.echo && r.blob) await Rec.lireBlob(r.blob);
    }
  }

  // Auto-évaluation proposée uniquement quand le système n'a pas pu trancher,
  // et jamais bloquante. La séance continue seule si personne ne touche l'écran.
  if (r.effet === EFFET.NONE && r.verdict !== VERDICT.MICRO) {
    const choix = await demanderAutoEvaluation(jeton, r.engine === "local" ? 9000 : 8000);
    if (choix && vivant()) {
      S.enregistrerResultat(it.id, choix, "production", { fiable: false });
      verifierLecon(it.lesson);
    }
  }
}

function peindreNiveau({ db, etat, seuil }) {
  const el = $("micLevel");
  if (!el) return;
  const pct = Math.max(0, Math.min(100, Math.round(((db + 70) / 55) * 100)));
  el.style.setProperty("--niveau", pct + "%");
  el.dataset.etat = etat || "";
  if (typeof seuil === "number") el.style.setProperty("--seuil", Math.max(0, Math.min(100, Math.round(((seuil + 70) / 55) * 100))) + "%");
}

function demanderAutoEvaluation(jeton, delaiMs) {
  return new Promise((resolve) => {
    if (!seance || jeton !== jetonSeance) return resolve(null);
    $("sessionFeedback").hidden = false;
    resolutionAuto = resolve;
    setTimeout(() => {
      if (resolutionAuto === resolve) { resolutionAuto = null; $("sessionFeedback").hidden = true; resolve(null); }
    }, delaiMs);
  });
}

async function jouerDialogue(d, jeton) {
  const vivant = () => seance && jeton === jetonSeance;
  afficher({ phase: "Dialogue", prompt: d.t, traduction: "Écoute le sens général" });
  await Voix.dire("Écoute cette conversation.", "fr");
  for (const l of d.l) {
    if (!vivant()) return;
    afficher({ phase: `Voix ${l.q}`, prompt: l.lb });
    await Voix.dire(l.lb, "lb", l.q === "A" ? 0.95 : 1.05);
  }
  if (!vivant()) return;
  await Voix.dire("On reprend avec la traduction.", "fr");
  for (const l of d.l) {
    if (!vivant()) return;
    afficher({ phase: `Voix ${l.q}`, prompt: l.lb, traduction: l.fr });
    await Voix.dire(l.lb, "lb");
    await Voix.dire(l.fr, "fr");
  }
}

function cloturer() {
  const b = Sess.bilan(seance);
  const j = S.state().journal;
  const jour = Sched.aujourdHui();
  j.sessions = (j.sessions || 0) + 1;
  j.minutes = (j.minutes || 0) + b.minutes;
  j.hist = j.hist || {};
  j.hist[jour] = (j.hist[jour] || 0) + b.minutes;

  const auj = new Date().toLocaleDateString("fr-FR");
  const hier = new Date(jour - Sched.JOUR).toLocaleDateString("fr-FR");
  if (j.last !== auj) j.streak = j.last === hier ? (j.streak || 0) + 1 : 1;
  j.last = auj;
  S.noterPosition({ terminee: true, position: 0 });
  S.sauver();

  afficher({
    phase: "Séance terminée",
    prompt: `${b.minutes} min sur ${b.minutesCible} prévues`,
    traduction: b.precision !== null
      ? `${b.precision}% de réponses reconnues avec certitude sur ${b.fiables} mesures fiables`
      : `${solides().length} expressions solides. Aucune mesure fiable sur cette séance.`
  });
  $("sessionProgressBar").style.width = "100%";
  Voix.dire("Séance terminée.", "fr");
  const s = seance;
  setTimeout(() => { if (seance === s) { arreterSeance(); allerA("home"); } }, 3800);
}

function demarrerCommandesVocales() {
  if (!S.state().settings.commandesVocales) return;
  const sup = Commandes.supporte();
  if (!sup.ok) return;   // jamais de fausse promesse : voir ui/commandes.js
  Commandes.demarrer((cmd) => {
    if (cmd === "repeter") repeter();
    else if (cmd === "suivant") passerExercice();
    else if (cmd === "pause") basculerPause(true);
    else if (cmd === "continue") basculerPause(false);
  });
}

export function arreterSeance() {
  Commandes.arreter();
  jetonSeance++;
  seance = null;
  enPause = false;
  resolutionAuto = null;
  Voix.stopper();
  Micro.fermer();
  desactiverMediaSession();
  $("sessionOverlay").hidden = true;
  document.body.style.overflow = "";
  rendre();
}

/* ---------- contrôles voiture ---------- */
function activerMediaSession() {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: "LULU Trajet · séance",
      artist: "LULU Trajet",
      artwork: [{ src: "icon-512.png", sizes: "512x512", type: "image/png" }]
    });
    navigator.mediaSession.setActionHandler("play", () => basculerPause(false));
    navigator.mediaSession.setActionHandler("pause", () => basculerPause(true));
    navigator.mediaSession.setActionHandler("previoustrack", () => Voix.repeter());
    navigator.mediaSession.setActionHandler("nexttrack", () => passerExercice());
    navigator.mediaSession.playbackState = "playing";
  } catch (_) {}
}
function desactiverMediaSession() {
  if (!("mediaSession" in navigator)) return;
  try {
    ["play", "pause", "previoustrack", "nexttrack"].forEach((a) => navigator.mediaSession.setActionHandler(a, null));
    navigator.mediaSession.playbackState = "none";
  } catch (_) {}
}

export function basculerPause(force) {
  enPause = typeof force === "boolean" ? force : !enPause;
  $("sessionPauseBtn").textContent = enPause ? "Reprendre" : "Pause";
  if (enPause) Voix.stopper();
  if ("mediaSession" in navigator) { try { navigator.mediaSession.playbackState = enPause ? "paused" : "playing"; } catch (_) {} }
}

/**
 * Passer à l'exercice suivant.
 * L'ancien code incrémentait le jeton puis relançait la boucle, ce qui
 * faisait tourner deux boucles en parallèle. Ici, on coupe seulement la
 * voix : la boucle en cours détecte la fin et enchaîne toute seule.
 */
export function passerExercice() {
  if (!seance) return;
  Voix.stopper();
  if (resolutionAuto) { const r = resolutionAuto; resolutionAuto = null; $("sessionFeedback").hidden = true; r(null); }
}

/**
 * Reprend exactement là où l'utilisateur s'était arrêté.
 * Si aucune séance n'a été interrompue, on démarre le Mode voiture
 * sur la leçon courante. On ne recommence JAMAIS au début quand une
 * progression existe.
 */
export async function reprendre() {
  const r = S.reprise();
  if (!S.aReprendre()) return demarrerMode("smart");
  if (r.seanceMinutes) { S.state().settings.duration = r.seanceMinutes; S.sauver(false); }
  const lecon = r.terminee ? leconCourante() : (r.lecon ?? leconCourante());
  return demarrerMode(r.mode || "smart", lecon);
}

export function repeter() { Voix.repeter(); }
export function dernierAudio() { return dernierEnregistrement; }

/* ---------- droits ---------- */
export async function rafraichirDroits() {
  if (SB.user()) {
    droits = await SB.lireDroits();
  } else {
    // Aucun compte : jamais Premium. Le stockage local ne décide plus rien.
    droits = { premium: false, source: "anonyme", statut: "local" };
  }
  rendre();
  return droits;
}

/* ---------- démarrage ---------- */
async function demarrer() {
  await S.charger();
  Sync.demarrer();
  brancherEvenements();
  brancherDiagnostic();
  configurerPWA();
  Voix.chargerVoix();

  const r = SB.configure() ? await SB.init() : { ok: false, raison: "Supabase n'est pas configuré." };
  if (!r.ok && SB.configure()) console.warn("Supabase:", r.raison);
  SB.surChangement(() => { rafraichirDroits(); });
  await rafraichirDroits();

  const p = new URLSearchParams(location.search);
  allerA(p.get("route") || "home");

  const m = S.migration();
  if (m && (m.traduites || m.fusionnees)) {
    toast(`Progression migrée : ${m.traduites + m.fusionnees} expressions conservées.`);
    if (m.inconnues) console.warn("Clés non reconnues à la migration :", m.inconnues);
  }
  if (p.get("mode")) setTimeout(() => demarrerMode(p.get("mode")), 500);
  rendre();
}

function brancherEvenements() {
  document.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    const r = t("[data-route]"); if (r) return allerA(r.dataset.route);
    const m = t("[data-mode]"); if (m) return demarrerMode(m.dataset.mode);
    const l = t("[data-lesson]"); if (l) return ouvrirLecon(Number(l.dataset.lesson));
    const ls = t("[data-lesson-start]"); if (ls) return demarrerMode("smart", Number(ls.dataset.lessonStart));
    const f = t("[data-fav]"); if (f) {
      const id = f.dataset.fav;
      S.state().favorites[id] = !S.state().favorites[id];
      S.sauver(); return rendre();
    }
    const sp = t("[data-speak]"); if (sp) return Voix.dire(decodeURIComponent(sp.dataset.speak), "lb");
    const cm = t("[data-close-modal]"); if (cm) return fermerModale(cm.dataset.closeModal);
    // Correction P0-4 : les boutons Dialogues et Mes erreurs étaient inertes.
    const pf = t("[data-premium-feature]"); if (pf) {
      const cible = { dialogues: "dialogue", mistakes: "mistakes" }[pf.dataset.premiumFeature];
      if (!cible) return;
      if (!estPremium()) { allerA("premium"); return toast("Cette fonction fait partie de Premium."); }
      return demarrerMode(cible);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const modale = document.querySelector(".modal-backdrop:not([hidden])");
    if (modale) return fermerModale(modale.id);
    if (seance) basculerPause(true);
  });

  const on = (id, evt, fn) => { const el = $(id); if (el) el[evt] = fn; };

  on("resumeBtn", "onclick", reprendre);
  on("homeReviewBtn", "onclick", () => demarrerMode("review"));
  on("homeDuration", "onclick", (e) => {
    const b = e.target.closest("button[data-min]"); if (!b) return;
    S.state().settings.duration = Number(b.dataset.min); S.sauver(); rendre();
  });
  on("startSmartHome", "onclick", () => demarrerMode("smart"));
  on("durationPicker", "onclick", (e) => {
    const b = e.target.closest("button[data-min]"); if (!b) return;
    S.state().settings.duration = Number(b.dataset.min); S.sauver(); rendre();
  });
  on("courseSearch", "oninput", rendre);
  on("lexSearch", "oninput", rendre);
  on("lexFilters", "onclick", (e) => {
    const b = e.target.closest("button[data-filter]"); if (!b) return;
    $$("#lexFilters button").forEach((x) => x.classList.toggle("active", x === b));
    rendre();
  });
  on("recognitionMode", "onclick", (e) => {
    const b = e.target.closest("button[data-value]"); if (!b) return;
    S.state().settings.recognition = b.dataset.value; S.sauver(); rendre();
  });
  on("audioProfile", "onclick", (e) => {
    const b = e.target.closest("button[data-profile]"); if (!b) return;
    S.state().settings.profilAudio = b.dataset.profile; S.sauver(); rendre();
  });
  on("voiceRate", "oninput", (e) => {
    S.state().settings.voiceRate = Number(e.target.value);
    $("voiceRateLabel").textContent = `${Number(e.target.value).toFixed(2).replace(".", ",")}×`;
  });
  on("voiceRate", "onchange", () => S.sauver());
  on("luxVoiceSelect", "onchange", (e) => { S.state().settings.luxVoice = e.target.value; Voix.chargerVoix(); S.sauver(); });
  on("frVoiceSelect", "onchange", (e) => { S.state().settings.frVoice = e.target.value; Voix.chargerVoix(); S.sauver(); });
  on("micSelect", "onchange", (e) => { S.state().settings.micDeviceId = e.target.value; Micro.choisirAppareil(e.target.value); S.sauver(); });
  on("voicePreviewBtn", "onclick", async () => { await Voix.dire("Moien. Wéi geet et?", "lb"); await Voix.dire("Voici la voix du professeur.", "fr"); });

  on("dailyGoalSelect", "onchange", (e) => { S.state().settings.dailyGoal = Number(e.target.value); S.sauver(); rendre(); });
  on("memoryTipsToggle", "onchange", (e) => { S.state().settings.tips = e.target.checked; S.sauver(); });
  on("commandesToggle", "onchange", (e) => { S.state().settings.commandesVocales = e.target.checked; S.sauver(); rendre(); });
  on("echoToggle", "onchange", (e) => { S.state().settings.echo = e.target.checked; S.sauver(); });

  on("exportProgressBtn", "onclick", exporterProgression);
  on("importProgressBtn", "onclick", () => $("importProgressFile").click());
  on("importProgressFile", "onchange", (e) => e.target.files[0] && importerProgression(e.target.files[0]));
  on("resetProgressBtn", "onclick", () => {
    if (!confirm("Effacer toute la progression locale ? Cette action ne peut pas être annulée.")) return;
    S.reinitialiserProgression(); rendre(); toast("Progression remise à zéro.");
  });

  on("signInBtn", "onclick", async () => {
    const r = await SB.connexion($("authEmail").value, $("authPassword").value);
    toast(r.message);
    if (r.ok) { $("authPassword").value = ""; await gererPremiereConnexion(); }
  });
  on("signUpBtn", "onclick", async () => {
    const r = await SB.inscription($("authEmail").value, $("authPassword").value);
    toast(r.message);
  });
  on("signOutBtn", "onclick", async () => { const r = await SB.deconnexion(); toast(r.message); await rafraichirDroits(); });
  on("forgotBtn", "onclick", async () => { const r = await SB.motDePasseOublie($("authEmail").value); toast(r.message); });
  on("exportAccountBtn", "onclick", async () => {
    const d = await SB.exporterDonnees();
    if (!d) return toast("Connecte-toi pour exporter tes données.");
    telecharger(d, `lulu-donnees-${new Date().toISOString().slice(0, 10)}.json`);
  });
  on("deleteAccountBtn", "onclick", async () => {
    if (!confirm("Supprimer définitivement ton compte et toutes tes données serveur ?")) return;
    const r = await SB.supprimerCompte(); toast(r.message); await rafraichirDroits();
  });

  on("installBtnSide", "onclick", installer);
  on("installBtnAccount", "onclick", installer);
  on("updateBtn", "onclick", verifierMiseAJour);

  on("sessionExitBtn", "onclick", () => { if (confirm("Quitter cette séance ?")) arreterSeance(); });
  on("sessionPauseBtn", "onclick", () => basculerPause());
  on("sessionRepeatBtn", "onclick", repeter);
  on("sessionSkipBtn", "onclick", passerExercice);
  on("sessionFeedback", "onclick", (e) => {
    const b = e.target.closest("button[data-self]"); if (!b || !resolutionAuto) return;
    const r = resolutionAuto; resolutionAuto = null;
    $("sessionFeedback").hidden = true;
    r({ hard: EFFET.DOWN, ok: EFFET.UP, easy: EFFET.UP_STRONG }[b.dataset.self] || null);
  });

  window.addEventListener("online", majEtatReseau);
  window.addEventListener("offline", majEtatReseau);
  majEtatReseau();
}

async function gererPremiereConnexion() {
  await rafraichirDroits();
  const a = await Sync.analyserPremiereConnexion();
  if (!a.conflit) { await Sync.tirer(); await Sync.pousser(); return rendre(); }
  const corps = $("mergeModalBody");
  if (!corps) { await Sync.appliquerChoixPremiereConnexion("fusionner", a.snapshotDistant); return rendre(); }
  corps.innerHTML = `
    <h2>Deux progressions existent</h2>
    <p class="muted">Sur cet appareil : <b>${a.local}</b> expressions.<br>
    Sur ton compte : <b>${a.distant}</b> expressions, dernière mise à jour ${a.distantLe ? new Date(a.distantLe).toLocaleString("fr-FR") : "inconnue"}.</p>
    <p class="muted">Rien n'est effacé tant que tu n'as pas choisi.</p>
    <button class="primary big full" data-merge="fusionner">Fusionner les deux, recommandé</button>
    <button class="ghost full" data-merge="garder_local">Garder celle de cet appareil</button>
    <button class="ghost full" data-merge="garder_cloud">Garder celle du compte</button>`;
  corps.onclick = async (e) => {
    const b = e.target.closest("[data-merge]"); if (!b) return;
    await Sync.appliquerChoixPremiereConnexion(b.dataset.merge, a.snapshotDistant);
    fermerModale("mergeModal"); rendre(); toast("Progression synchronisée.");
  };
  ouvrirModale("mergeModal");
}

export function ouvrirLecon(li) {
  if (leconVerrouillee(li)) { allerA("premium"); return toast("Cette leçon fait partie de Premium."); }
  const l = C.COURS()[li];
  const its = C.itemsDeLecon(li);
  const ok = its.filter((i) => Sched.estSolide(S.progressionDe(i.id))).length;
  $("lessonModalBody").innerHTML = `
    <p class="kicker">LEÇON ${String(li + 1).padStart(2, "0")} · ÉTAPE ${l.e}</p>
    <h2>${echapper(l.t)}</h2>
    <p class="muted">${ok} expression${ok === 1 ? "" : "s"} solide${ok === 1 ? "" : "s"} sur ${its.length}.</p>
    <div class="lesson-note">${echapper(l.note)}</div>
    <div class="lesson-items">${its.map((it) => `
      <div class="lesson-item"><div>
        <b>${echapper(it.lb)}</b><em>${echapper(it.ph || "")}</em><span>${echapper(it.fr)}</span>
        ${S.state().settings.tips && it.tr ? `<span class="tip">Astuce : ${echapper(it.tr)}</span>` : ""}
        ${it.st !== "verified" ? `<span class="unverified" title="Cette expression n'a pas encore été validée par un relecteur">à vérifier</span>` : ""}
      </div><button class="icon-btn" data-speak="${encodeURIComponent(it.lb)}" aria-label="Écouter">▶</button></div>`).join("")}</div>
    <button class="primary big full" style="margin-top:18px" data-lesson-start="${li}">Travailler cette leçon</button>`;
  ouvrirModale("lessonModal");
}

function exporterProgression() {
  telecharger(S.instantane(), `lulu-progression-${new Date().toISOString().slice(0, 10)}.json`);
}

async function importerProgression(fichier) {
  try {
    const data = JSON.parse(await fichier.text());
    if (data.schema === 5) { S.fusionnerDistant(data); }
    else {
      // Ancien export v4 : traduction par la table de migration.
      const { progression, rapport } = Mig.traduireProgression(data.progress || {});
      S.fusionnerDistant({ progress: progression, validated: {}, favorites: {}, journal: data.journal || {} });
      if (rapport.inconnues) toast(`${rapport.inconnues} entrées non reconnues ont été ignorées.`);
    }
    S.sauver(); rendre(); toast("Progression importée.");
  } catch (e) { toast("Fichier illisible : " + e.message); }
}

function telecharger(objet, nom) {
  const blob = new Blob([JSON.stringify(objet, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function majEtatReseau() {
  const off = navigator.onLine === false;
  const bar = $("offlineBar");
  if (bar) bar.hidden = !off;
}

function configurerPWA() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register(`sw.js?v=${VERSION}`).then((reg) => {
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        nw?.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            const b = $("updateBar");
            if (b) b.hidden = false; else toast("Nouvelle version disponible. Recharge l'application.");
          }
        });
      });
    }).catch((e) => console.warn("Service worker", e));
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); promptInstall = e;
    const b = $("installBtnSide"); if (b) b.hidden = false;
    const a = $("installBtnAccount"); if (a) a.disabled = false;
  });
  window.addEventListener("appinstalled", () => {
    promptInstall = null;
    const b = $("installBtnSide"); if (b) b.hidden = true;
    toast("Application installée.");
  });
  const br = $("updateReloadBtn");
  if (br) br.onclick = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    reg?.waiting?.postMessage("SKIP_WAITING");
    setTimeout(() => location.reload(), 400);
  };
}

async function installer() {
  if (window.matchMedia("(display-mode: standalone)").matches) return toast("L'application est déjà installée.");
  if (promptInstall) { promptInstall.prompt(); await promptInstall.userChoice; promptInstall = null; return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  toast(ios ? "Safari, bouton Partager, puis Sur l'écran d'accueil." : "Menu du navigateur, puis Installer l'application.");
}

async function verifierMiseAJour() {
  if (!("serviceWorker" in navigator)) return toast("Service worker indisponible.");
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return toast("Aucune installation active.");
  await reg.update();
  toast(reg.waiting ? "Mise à jour prête. Recharge l'application." : "Tu es à jour.");
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export { lancerTestMicro, Voix, Micro, Rec, Moteur, S, C, Sched, SB, Sync, Mig, Commandes, Cfg };

// Le module de rendu a besoin de l'application. Les imports ES étant
// hissés, ce branchement est effectif avant le premier appel à rendre().
import { brancherApp } from "./ui/render.js";
import * as moiMeme from "./app.js";
brancherApp(moiMeme);

demarrer();
