/* ===================================================================
   RENDU

   Priorité affichée, dans cet ordre : Reprendre, Écouter, Progression.
   Le reste est secondaire et vit dans les autres onglets.
   =================================================================== */

import * as C from "../core/content.js";
import * as S from "../core/state.js";
import * as Sched from "../core/scheduler.js";
import * as Cfg from "../core/config.js";

export const $ = (id) => document.getElementById(id);
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));
export const echapper = (s) => String(s ?? "").replace(/[&<>'"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));

let A = null;
export function brancherApp(app) { A = app; }

export function toast(msg) {
  const el = $("toast"); if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 4000);
}

export function ouvrirModale(id) {
  const el = $(id); if (!el) return;
  el.hidden = false;
  document.body.style.overflow = "hidden";
  el.querySelector("button, [href], input, select")?.focus();
}
export function fermerModale(id) {
  const el = $(id); if (!el) return;
  el.hidden = true;
  document.body.style.overflow = "";
}

const euros = (v) => new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: Cfg.tarifs().currency || "EUR"
}).format(v);

const normaliser = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

export function rendre() {
  if (!A) return;
  entete();
  ({ home: accueil, learn: apprendre, courses: parcours, practice: entrainement,
     progress: progression, voice: voixEtMicro, premium: premiumVue,
     account: compte }[A.routeActive()] || accueil)();
}

function entete() {
  const titres = {
    home: ["", ""],
    learn: ["TRAJET", "Choisis ta séance."],
    courses: ["COURS", "Ton programme, étape par étape."],
    practice: ["ENTRAÎNEMENT", "Travaille ce qui compte aujourd'hui."],
    progress: ["PROGRÈS", "Mesure ce qui devient solide."],
    voice: ["VOIX ET MICRO", "Fais fonctionner l'oral correctement."],
    premium: ["PREMIUM", "Le programme complet."],
    account: ["COMPTE", "Profil, données et préférences."]
  };
  const [k, t] = titres[A.routeActive()] || titres.home;
  const eb = $("pageEyebrow"), pt = $("pageTitle"), ph = $("pageHead");
  if (ph) ph.hidden = A.routeActive() === "home";
  if (eb) eb.textContent = k;
  if (pt) pt.textContent = t;
  if ($("streakTop")) $("streakTop").textContent = S.state().journal.streak || 0;
  $$("[data-route]").forEach((b) => b.classList.toggle("active", b.dataset.route === A.routeActive()));
  const nom = S.state().profile.name || "A";
  if ($("avatarBtn")) $("avatarBtn").textContent = nom.trim().charAt(0).toUpperCase() || "A";
  if ($("sidePlanName")) $("sidePlanName").textContent = A.estPremium() ? "Premium" : "Découverte";
}

/* ---------- ACCUEIL ---------- */

function salutation() {
  const h = new Date().getHours();
  if (h < 11) return "Moien";        // bonjour, du matin à midi
  if (h < 18) return "Bonjour";
  return "Gudden Owend";             // bonsoir
}

function accueil() {
  const st = S.state();
  const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  const html = (id, v) => { const e = $(id); if (e) e.innerHTML = v; };

  const r = S.reprise();
  const aReprendre = S.aReprendre();
  const li = aReprendre && !r.terminee ? r.lecon : A.leconCourante();
  const lecon = C.COURS()[li] || C.COURS()[0];

  // Bandeau d'accueil
  set("welcomeGreeting", `${salutation()} 👋`);
  if (aReprendre) {
    const jours = Math.floor((Date.now() - r.dateMs) / 86400000);
    set("welcomeLine",
      jours === 0 ? "Content de te revoir."
      : jours === 1 ? "Content de te revoir. Tu étais là hier."
      : `Content de te revoir. Ta dernière séance date d'il y a ${jours} jours.`);
  } else {
    set("welcomeLine", "Apprends le luxembourgeois pendant tes trajets. Écoute, répète, progresse.");
  }

  // Bouton principal
  const btn = $("resumeBtn");
  const sous = $("resumeSub");
  if (btn) {
    btn.textContent = aReprendre ? "Reprendre mon trajet" : "Commencer mon premier trajet";
    btn.dataset.reprise = aReprendre ? "1" : "0";
  }
  if (sous) {
    sous.textContent = aReprendre
      ? `Leçon ${li + 1} · ${lecon?.t || ""}`
      : `On commence par la leçon 1 · ${lecon?.t || ""}`;
  }

  // Chiffres clés
  const total = C.COURS().length;
  const faites = A.leconsValidees();
  const heures = (st.journal.minutes || 0) / 60;
  set("statLessons", `${faites}/${total}`);
  set("statSolid", A.solides().length);
  set("statTime", heures >= 1 ? `${heures.toFixed(1)} h` : `${Math.round(st.journal.minutes || 0)} min`);
  set("statStreak", `${st.journal.streak || 0} j`);

  // Anneau de progression globale
  const pct = total ? Math.round((faites / total) * 100) : 0;
  set("homeRingPct", `${pct}%`);
  const ring = $("homeRing");
  if (ring) ring.style.setProperty("--p", `${pct * 3.6}deg`);
  set("homeRingLabel", `${faites} leçon${faites === 1 ? "" : "s"} terminée${faites === 1 ? "" : "s"}`);

  // Révisions du jour
  const due = A.dus().length;
  set("homeDue", due);
  set("homeDueLabel", due === 0 ? "Rien à revoir aujourd'hui"
    : due === 1 ? "expression à revoir aujourd'hui" : "expressions à revoir aujourd'hui");
  const rev = $("homeReviewBtn");
  if (rev) rev.hidden = due === 0;

  // Durée de séance
  $$("#homeDuration button").forEach((b) =>
    b.classList.toggle("active", Number(b.dataset.min) === Number(st.settings.duration)));

  // Accès rapides
  html("homeQuick", A.modes().filter((m) => ["listen", "review", "sprint"].includes(m.id))
    .map((m) => `<button class="quick" data-mode="${m.id}">
        <span class="quick-icon" aria-hidden="true">${m.icone}</span>
        <span><b>${echapper(m.titre)}</b><small>${echapper(m.meta)}</small></span>
      </button>`).join(""));
}

/* ---------- AUTRES VUES ---------- */

function carteMode(m) {
  const verrou = m.premium && !A.estPremium();
  return `<button class="mode-card" data-mode="${m.id}">
    <div class="mode-icon" aria-hidden="true">${m.icone}</div>
    <h3>${echapper(m.titre)}${verrou ? " ✦" : ""}</h3><p>${echapper(m.desc)}</p>
    <div class="mode-meta"><span>${echapper(m.meta)}</span><span>${verrou ? "Premium" : "Démarrer →"}</span></div></button>`;
}

function apprendre() {
  if ($("learnModes")) $("learnModes").innerHTML = A.modes().map(carteMode).join("");
  $$(".duration-picker button").forEach((b) =>
    b.classList.toggle("active", Number(b.dataset.min) === Number(S.state().settings.duration)));
}

function parcours() {
  const q = normaliser($("courseSearch")?.value || "");
  const cours = C.COURS();
  if ($("courseSummary")) $("courseSummary").innerHTML =
    `<article><strong>${cours.length}</strong><span>leçons</span></article>
     <article><strong>${C.itemsUniques().length}</strong><span>expressions</span></article>
     <article><strong>${A.leconsValidees()}</strong><span>validées</span></article>`;
  let html = "", etape = 0;
  cours.forEach((l, li) => {
    const texte = `${l.t} ${l.note} ${l.i.map((x) => `${x.lb} ${x.fr}`).join(" ")}`;
    if (q && !normaliser(texte).includes(q)) return;
    if (l.e !== etape) {
      etape = l.e;
      html += `<div class="course-stage"><div class="course-stage-head"><div class="stage-num">${l.e}</div>
        <div><h3>${echapper(C.ETAPES()[l.e - 1] || "")}</h3><span>${cours.filter((x) => x.e === l.e).length} leçons</span></div></div></div>`;
    }
    const its = C.itemsDeLecon(li);
    const ok = its.filter((i) => Sched.estSolide(S.progressionDe(i.id))).length;
    const pct = its.length ? Math.round((ok / its.length) * 100) : 0;
    const valide = !!S.state().validated[l.lid];
    const verrou = A.leconVerrouillee(li);
    html += `<button class="lesson-row ${valide ? "valid" : ""}" data-lesson="${li}">
      <span class="lesson-num">${verrou ? "✦" : String(li + 1).padStart(2, "0")}</span>
      <div><h4>${echapper(l.t)}</h4><p>${its.length} expressions · ${verrou ? "Premium" : valide ? "validée" : `étape ${l.e}`}</p></div>
      <div class="lesson-progress"><b>${pct}%</b><div class="mini-bar"><span style="width:${pct}%"></span></div></div></button>`;
  });
  if ($("courseList")) $("courseList").innerHTML = html || `<div class="panel muted">Aucune leçon trouvée.</div>`;
}

function entrainement() {
  if ($("practiceDue")) $("practiceDue").textContent = A.dus().length;
  const q = normaliser($("lexSearch")?.value || "");
  const filtre = document.querySelector("#lexFilters button.active")?.dataset.filter || "all";
  let liste = C.itemsUniques();
  if (q) liste = liste.filter((i) => normaliser(`${i.lb} ${i.fr} ${i.ph}`).includes(q));
  if (filtre === "due") liste = liste.filter((i) => Sched.estDu(S.progressionDe(i.id)));
  if (filtre === "solid") liste = liste.filter((i) => Sched.estSolide(S.progressionDe(i.id)));
  if (filtre === "fav") liste = liste.filter((i) => S.state().favorites[i.id]);
  const total = liste.length, vue = liste.slice(0, 200);
  if ($("lexList")) $("lexList").innerHTML = vue.map((i) => {
    const p = S.progressionDe(i.id);
    return `<div class="lex-row">
      <div class="lex-main"><b>${echapper(i.lb)}</b><em>${echapper(i.ph || "")}</em><span>${echapper(i.fr)}</span></div>
      <div class="lex-meta" title="compréhension ${p.comprehension} · production ${p.production} · prononciation ${p.pronunciation}">
        <i style="--n:${p.comprehension}"></i><i style="--n:${p.production}"></i><i style="--n:${p.pronunciation}"></i></div>
      <div class="lex-actions">
        <button class="icon-btn ${S.state().favorites[i.id] ? "active" : ""}" data-fav="${i.id}" aria-label="Favori">★</button>
        <button class="icon-btn" data-speak="${encodeURIComponent(i.lb)}" aria-label="Écouter">▶</button>
        <a class="icon-btn" target="_blank" rel="noopener" href="https://lod.lu/search?q=${encodeURIComponent(i.lb)}" aria-label="Vérifier sur lod.lu">L</a>
      </div></div>`;
  }).join("") + (total > vue.length ? `<p class="muted small">${vue.length} sur ${total} affichées.</p>` : "")
    || `<div class="panel muted">Aucun résultat.</div>`;
}

function progression() {
  const st = S.state();
  const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  const uniques = C.itemsUniques();
  set("metricHours", `${((st.journal.minutes || 0) / 60).toFixed(1)} h`);
  set("metricSessions", `${st.journal.sessions || 0} séance${st.journal.sessions === 1 ? "" : "s"}`);
  set("metricLessons", A.leconsValidees());
  set("metricSolid", A.solides().length);
  set("metricSolidSub", `sur ${uniques.length}`);
  set("metricStreak", `${st.journal.streak || 0} j`);
  set("metricLast", st.journal.last ? `dernière ${st.journal.last}` : "Aucune séance");

  const hist = st.journal.hist || {};
  const max = Math.max(30, ...Object.values(hist).map(Number));
  let total = 0, barres = "";
  for (let k = 13; k >= 0; k--) {
    const j = Sched.aujourdHui() - k * Sched.JOUR;
    const m = Number(hist[j] || 0); total += m;
    const h = Math.max(2, Math.min(100, Math.round((m / max) * 100)));
    const lab = new Date(j).toLocaleDateString("fr-FR", { weekday: "short" });
    barres += `<div class="chart-col"><div class="chart-bar" style="height:${h}%" data-label="${lab} · ${Math.round(m)} min"></div></div>`;
  }
  if ($("progressChart")) $("progressChart").innerHTML = barres;
  set("chartTotal", `${Math.round(total)} min`);

  const nonVus = uniques.filter((i) => Sched.niveauGlobal(S.progressionDe(i.id)) === 0).length;
  const enCours = uniques.filter((i) => { const n = Sched.niveauGlobal(S.progressionDe(i.id)); return n > 0 && n < Sched.NIVEAU_SOLIDE; }).length;
  const lignes = [["Non vus", nonVus, "#51677b"], ["En cours", enCours, "#78b9ff"], ["Solides", A.solides().length, "#7be0b3"]];
  if ($("masteryBars")) $("masteryBars").innerHTML = lignes.map(([n, v, c]) =>
    `<div class="mastery-row"><span>${n}</span><div class="mastery-track"><i style="width:${Math.round((v / Math.max(1, uniques.length)) * 100)}%;background:${c}"></i></div><b>${v}</b></div>`).join("");

  const l = C.COURS()[A.leconCourante()];
  if (l) {
    set("nextStageTitle", l.t);
    set("nextStageText", `Étape ${l.e}, ${C.ETAPES()[l.e - 1] || ""}. ${A.dus().length} expression${A.dus().length === 1 ? "" : "s"} à revoir aujourd'hui.`);
  }
}

function voixEtMicro() {
  const s = S.state().settings;
  if ($("voiceRate")) {
    $("voiceRate").value = s.voiceRate;
    $("voiceRateLabel").textContent = `${Number(s.voiceRate).toFixed(2).replace(".", ",")}×`;
  }
  $$("#recognitionMode button").forEach((b) => b.classList.toggle("active", b.dataset.value === s.recognition));
  $$("#audioProfile button").forEach((b) => b.classList.toggle("active", b.dataset.profile === s.profilAudio));
  const cv = $("commandesVocalesEtat");
  if (cv) {
    const sup = A.Commandes.supporte();
    cv.textContent = sup.ok
      ? "Disponibles sur cet appareil. Dis Répète, Suivant, Précédent, Pause ou Continue."
      : sup.raison;
    cv.dataset.etat = sup.ok ? "ok" : "warn";
  }
}

function premiumVue() {
  const prix = Number(Cfg.tarifs().yearly || 59.99);
  if ($("premiumPrice")) $("premiumPrice").innerHTML = `<strong>${euros(prix)}</strong><span>/ an</span>`;
  if ($("premiumEquiv")) $("premiumEquiv").textContent = `soit ${euros(prix / 12)} / mois`;
  if ($("premiumState")) $("premiumState").textContent = A.estPremium()
    ? "Ton accès Premium est actif."
    : "Le paiement n'est pas encore ouvert. Cette page est une présentation.";
}

function compte() {
  const st = S.state();
  const u = A.SB.user();
  const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  const nom = u?.user_metadata?.name || st.profile.name || u?.email?.split("@")[0] || "Apprenant";
  set("profileName", nom);
  set("profileEmail", u?.email || "Mode local, sans compte");
  set("profileAvatar", nom.trim().charAt(0).toUpperCase() || "A");
  set("accountPlan", A.estPremium() ? "Premium" : "Découverte");

  const d = A.droitsActuels();
  set("billingStatus", d.statut || "local");
  set("billingPlanText", d.premium
    ? "Accès Premium actif, vérifié côté serveur."
    : u ? "Aucun abonnement actif sur ce compte." : "Connecte-toi pour retrouver ton abonnement.");

  const connecte = !!u;
  ["signOutBtn", "exportAccountBtn", "deleteAccountBtn"].forEach((id) => { const e = $(id); if (e) e.hidden = !connecte; });
  ["signInBtn", "signUpBtn", "forgotBtn"].forEach((id) => { const e = $(id); if (e) e.hidden = connecte; });

  const v = Cfg.verifier();
  set("authStatus", connecte
    ? `Connecté avec ${u.email}. Ta progression est synchronisée.`
    : v.ok ? "Crée un compte ou connecte-toi pour synchroniser ta progression."
           : `Comptes indisponibles. ${v.resume}`);

  const sync = A.Sync.statut();
  set("syncStatus", !connecte ? "Hors compte, progression enregistrée sur cet appareil."
    : !sync.enLigne ? "Hors ligne. Les modifications partiront à la reconnexion."
    : sync.enAttente ? "Synchronisation en attente."
    : sync.dernierPush ? `Synchronisé à ${new Date(sync.dernierPush).toLocaleTimeString("fr-FR")}.`
    : "Prêt à synchroniser.");

  if ($("dailyGoalSelect")) $("dailyGoalSelect").value = String(st.settings.dailyGoal);
  if ($("memoryTipsToggle")) $("memoryTipsToggle").checked = !!st.settings.tips;
  if ($("echoToggle")) $("echoToggle").checked = !!st.settings.echo;
  if ($("appVersionLabel")) $("appVersionLabel").textContent = Cfg.version();

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  set("installHelp", window.matchMedia("(display-mode: standalone)").matches
    ? "Application déjà installée."
    : ios ? "Sur iPhone : Safari, bouton Partager, puis Sur l'écran d'accueil."
          : "Sur Android : menu du navigateur, puis Installer l'application.");
}
