/* ================================================================
   LËTZEBUERGESCH AM AUTO · REVOLUTION 4.0
   Frontend PWA. Fonctionne en local sans backend.
   Supabase + Stripe + Google STT s'activent uniquement si config.js est rempli.
   ================================================================ */

const CFG = window.LETZ_CONFIG || {};
const VERSION = CFG.appVersion || "4.0.0";
const $ = id => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const ITEMS = [];
COURS.forEach((lesson, li) => lesson.i.forEach((it, ii) => ITEMS.push({ ...it, key: `${li}-${ii}`, lesson: li, stage: lesson.e })));
const DAY = 86400000;
const INTERVALS = [0, 1, 2, 4, 8, 16, 32];
const todayStamp = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const escapeHtml = s => String(s ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const shuffle = a => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const formatEuro = value => new Intl.NumberFormat("fr-FR", { style: "currency", currency: CFG.pricing?.currency || "EUR" }).format(value);

const DEFAULTS = {
  progress: {}, validated: {}, favorites: {},
  journal: { sessions: 0, minutes: 0, last: null, streak: 0, hist: {} },
  settings: { duration: 20, dailyGoal: 20, recognition: "auto", answerSeconds: 6, voiceRate: .85, luxVoice: "", frVoice: "", tips: true, echo: true },
  profile: { name: "Apprenant", email: "", plan: "free" },
  subscription: { status: "local", plan: "free", cycle: "year" }
};

let state = structuredClone(DEFAULTS);
let supabase = null;
let authUser = null;
let installPrompt = null;
let availableVoices = [];
let luxVoice = null;
let frVoice = null;
let lexFilter = "all";
let activeRoute = "home";
let cloudSyncTimer = null;
let micStream = null;
let recognitionLastEngine = "none";
let currentSession = null;
let sessionToken = 0;
let lastSpoken = null;
let paused = false;
let pendingSelfResolve = null;

const MODES = [
  { id: "smart", icon: "✦", title: "Trajet intelligent", desc: "Nouveaux mots, rappels et oral selon ta progression.", meta: "recommandé", premium: false },
  { id: "review", icon: "↺", title: "Révisions", desc: "Reprend uniquement ce qui arrive à échéance.", meta: "mémoire", premium: false },
  { id: "sprint", icon: "⚡", title: "Sprint oral", desc: "Réponses rapides en luxembourgeois, sans lire.", meta: "5 min", premium: false },
  { id: "numbers", icon: "123", title: "Chiffres", desc: "Automatise les nombres dans un ordre imprévisible.", meta: "rapide", premium: false },
  { id: "listen", icon: "♫", title: "Écoute libre", desc: "Aucune pression. Écoute et laisse la langue rentrer.", meta: "fatigue", premium: false },
  { id: "dialogue", icon: "◫", title: "Dialogues", desc: "Conversations à deux voix avec traduction progressive.", meta: "premium", premium: true }
];

const ROUTES = {
  home: ["BONJOUR", "Ton trajet devient ton cours."],
  learn: ["APPRENDRE", "Choisis ton trajet."],
  courses: ["PARCOURS", "Ton programme, étape par étape."],
  practice: ["ENTRAÎNEMENT", "Travaille ce qui compte aujourd'hui."],
  progress: ["PROGRESSION", "Mesure ce qui devient solide."],
  voice: ["VOIX ET MICRO", "Fais fonctionner l'oral correctement."],
  premium: ["PREMIUM", "Passe du prototype au service complet."],
  account: ["COMPTE", "Profil, abonnement et préférences."]
};

function loadState() {
  try {
    const v4 = JSON.parse(localStorage.getItem("letz:v4") || "null");
    if (v4) state = deepMerge(structuredClone(DEFAULTS), v4);
  } catch (_) {}
  // Migration transparente des versions précédentes.
  try {
    const oldProg = JSON.parse(localStorage.getItem("lux:prog") || "null");
    const oldValid = JSON.parse(localStorage.getItem("lux:valides") || "null");
    const oldJournal = JSON.parse(localStorage.getItem("lux:journal") || "null");
    const oldReg = JSON.parse(localStorage.getItem("lux:reglages") || "null");
    const oldFav = JSON.parse(localStorage.getItem("lux:favoris") || "null");
    if (oldProg && !Object.keys(state.progress).length) state.progress = oldProg;
    if (oldValid && !Object.keys(state.validated).length) state.validated = oldValid;
    if (oldFav && !Object.keys(state.favorites).length) state.favorites = oldFav;
    if (oldJournal && !state.journal.sessions) {
      state.journal = {
        sessions: oldJournal.seances || 0,
        minutes: oldJournal.minutes || 0,
        last: oldJournal.dernier || null,
        streak: oldJournal.serie || 0,
        hist: oldJournal.hist || {}
      };
    }
    if (oldReg) {
      state.settings.answerSeconds = Math.round((oldReg.tps || 6000) / 1000);
      state.settings.voiceRate = oldReg.vit || .85;
      state.settings.tips = oldReg.truc !== false;
      state.settings.echo = oldReg.echo !== false;
      state.settings.luxVoice = oldReg.vDe || "";
      state.settings.frVoice = oldReg.vFr || "";
      if (oldReg.obj) state.settings.dailyGoal = oldReg.obj;
    }
  } catch (_) {}
  saveState(false);
}

function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source || {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object") deepMerge(target[k], v);
    else target[k] = v;
  }
  return target;
}

function snapshot() {
  return { version: VERSION, updatedAt: new Date().toISOString(), progress: state.progress, validated: state.validated, favorites: state.favorites, journal: state.journal, settings: state.settings, profile: state.profile };
}

function saveState(sync = true) {
  localStorage.setItem("letz:v4", JSON.stringify(state));
  if (sync && authUser && supabase) scheduleCloudSync();
}

function scheduleCloudSync() {
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(syncToCloud, 1500);
}

async function syncToCloud() {
  if (!supabase || !authUser) return;
  try {
    await supabase.from("user_progress").upsert({ user_id: authUser.id, snapshot: snapshot(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  } catch (_) {}
}

function mergeCloudSnapshot(remote) {
  if (!remote) return;
  const rp = remote.progress || {};
  for (const [key, val] of Object.entries(rp)) {
    const local = state.progress[key] || { n: 0, seen: 0, due: 0, day: 0 };
    state.progress[key] = {
      n: Math.max(local.n || 0, val.n || 0),
      seen: Math.max(local.seen || local.vu || 0, val.seen || val.vu || 0),
      due: Math.max(local.due || 0, val.due || 0),
      day: Math.max(local.day || local.jour || 0, val.day || val.jour || 0),
      mistakes: Math.max(local.mistakes || 0, val.mistakes || 0)
    };
  }
  Object.assign(state.validated, remote.validated || {});
  Object.assign(state.favorites, remote.favorites || {});
  const rj = remote.journal || {};
  state.journal.sessions = Math.max(state.journal.sessions || 0, rj.sessions || 0);
  state.journal.minutes = Math.max(state.journal.minutes || 0, rj.minutes || 0);
  state.journal.streak = Math.max(state.journal.streak || 0, rj.streak || 0);
  state.journal.hist = { ...(rj.hist || {}), ...(state.journal.hist || {}) };
  saveState(false);
}

const progressFor = key => state.progress[key] || { n: 0, seen: 0, due: 0, day: 0, mistakes: 0 };
const levelOf = key => progressFor(key).n || 0;
const dueOf = key => progressFor(key).due || 0;
const solidCount = () => ITEMS.filter(i => levelOf(i.key) >= 4).length;
const dueItems = () => ITEMS.filter(i => levelOf(i.key) > 0 && dueOf(i.key) <= todayStamp());
const validatedCount = () => Object.keys(state.validated).filter(k => state.validated[k]).length;
const currentLessonIndex = () => { for (let i = 0; i < COURS.length; i++) if (!state.validated[i]) return i; return COURS.length - 1; };
const currentStage = () => COURS[currentLessonIndex()]?.e || 1;
const minutesToday = () => Number(state.journal.hist?.[todayStamp()] || 0);
const isPremium = () => ["active", "trialing"].includes(state.subscription.status) || state.subscription.plan === "premium";

function verifyLesson(li) {
  const its = ITEMS.filter(i => i.lesson === li);
  const solid = its.filter(i => levelOf(i.key) >= 4).length;
  if (solid >= Math.ceil(its.length * .8)) state.validated[li] = true;
}

function markLearning(item, result) {
  if (!item) return;
  const p0 = progressFor(item.key);
  const p = { n: p0.n || 0, seen: p0.seen || p0.vu || 0, due: p0.due || 0, day: p0.day || p0.jour || 0, mistakes: p0.mistakes || 0 };
  p.seen += 1; p.day = todayStamp();
  if (result === "easy") p.n = Math.min(6, p.n + 2);
  else if (result === "ok") p.n = Math.min(6, p.n + 1);
  else if (result === "hard") { p.n = Math.max(0, p.n - 1); p.mistakes += 1; }
  else if (result === "seen" && p.seen % 2 === 0) p.n = Math.min(6, p.n + 1);
  p.due = todayStamp() + INTERVALS[Math.min(p.n, INTERVALS.length - 1)] * DAY;
  state.progress[item.key] = p;
  verifyLesson(item.lesson);
  saveState();
}

function renderAll() {
  renderHeader(); renderHome(); renderModes(); renderCourses(); renderPractice(); renderProgress(); renderVoiceSettings(); renderAccount(); renderPricing();
}

function renderHeader() {
  const [eyebrow, title] = ROUTES[activeRoute] || ROUTES.home;
  $("pageEyebrow").textContent = eyebrow;
  $("pageTitle").textContent = title;
  $("streakTop").textContent = state.journal.streak || 0;
  $$("[data-route]").forEach(b => b.classList.toggle("active", b.dataset.route === activeRoute));
  const initial = (state.profile.name || state.profile.email || "F").trim().charAt(0).toUpperCase() || "F";
  $("avatarBtn").textContent = initial;
}

function renderHome() {
  const li = currentLessonIndex(), lesson = COURS[li];
  $("todayLesson").textContent = `${String(li + 1).padStart(2, "0")} · ${lesson.t}`;
  $("todayStage").textContent = `Étape ${lesson.e}`;
  $("todayDescription").textContent = lesson.note;
  const goal = Number(state.settings.dailyGoal) || 20, mins = minutesToday(), pct = clamp(Math.round(mins / goal * 100), 0, 100);
  $("dailyPct").textContent = `${pct}%`; $("dailyMinutes").textContent = `${Math.round(mins)} min`; $("dailyGoal").textContent = goal;
  $("dailyRing").style.setProperty("--p", `${pct * 3.6}deg`);
  $("reviewCount").textContent = dueItems().length;
  $("heroMinutes").textContent = state.settings.duration || 20;
  $("homeLessons").textContent = `${validatedCount()} / ${COURS.length}`;
  $("homeSolid").textContent = solidCount();
  $("homeHours").textContent = `${((state.journal.minutes || 0) / 60).toFixed(1)} h`;
  $("homeStreak").textContent = `${state.journal.streak || 0} j`;
}

function modeCard(mode, large = false) {
  const lock = mode.premium && !isPremium();
  return `<button class="mode-card" data-mode="${mode.id}">
    <div class="mode-icon">${mode.icon}</div><h3>${escapeHtml(mode.title)}${lock ? " · ✦" : ""}</h3><p>${escapeHtml(mode.desc)}</p>
    <div class="mode-meta"><span>${escapeHtml(mode.meta)}</span><span>${lock ? "Premium" : "Démarrer →"}</span></div></button>`;
}

function renderModes() {
  $("homeModes").innerHTML = MODES.slice(0, 4).map(m => modeCard(m)).join("");
  $("learnModes").innerHTML = MODES.map(m => modeCard(m, true)).join("");
  $$(".duration-picker button").forEach(b => b.classList.toggle("active", Number(b.dataset.min) === Number(state.settings.duration)));
}

function renderCourses(filter = $("courseSearch")?.value || "") {
  const q = normalizeSearch(filter);
  const matched = COURS.map((l, li) => ({ ...l, li })).filter(l => !q || normalizeSearch(`${l.t} ${l.note} ${l.i.map(x => `${x.lb} ${x.fr}`).join(" ")}`).includes(q));
  $("courseSummary").innerHTML = `
    <article><strong>${COURS.length}</strong><span>leçons</span></article>
    <article><strong>${ITEMS.length}</strong><span>expressions</span></article>
    <article><strong>${validatedCount()}</strong><span>leçons validées</span></article>`;
  let html = "", lastStage = 0;
  matched.forEach(l => {
    if (l.e !== lastStage) {
      lastStage = l.e;
      html += `<div class="course-stage"><div class="course-stage-head"><div class="stage-num">${l.e}</div><div><h3>${escapeHtml(ETAPES[l.e - 1])}</h3><span>${COURS.filter(x => x.e === l.e).length} leçons</span></div></div></div>`;
    }
    const items = ITEMS.filter(i => i.lesson === l.li), solid = items.filter(i => levelOf(i.key) >= 4).length, pct = Math.round(solid / items.length * 100), valid = !!state.validated[l.li];
    const freeLimit = CFG.free?.lessons ?? 8, locked = !isPremium() && l.li >= freeLimit;
    html += `<button class="lesson-row ${valid ? "valid" : ""}" data-lesson="${l.li}">
      <span class="lesson-num">${locked ? "✦" : String(l.li + 1).padStart(2, "0")}</span><div><h4>${escapeHtml(l.t)}</h4><p>${items.length} expressions · ${locked ? "Premium" : (valid ? "validée" : `étape ${l.e}`)}</p></div>
      <div class="lesson-progress"><b>${pct}%</b><div class="mini-bar"><span style="width:${pct}%"></span></div></div></button>`;
  });
  $("courseList").innerHTML = html || `<div class="panel muted">Aucune leçon trouvée.</div>`;
}

function renderPractice() {
  $("practiceDue").textContent = dueItems().length;
  const q = normalizeSearch($("lexSearch")?.value || "");
  let list = ITEMS.filter(i => !q || normalizeSearch(`${i.lb} ${i.fr} ${i.ph}`).includes(q));
  if (lexFilter === "due") list = list.filter(i => levelOf(i.key) > 0 && dueOf(i.key) <= todayStamp());
  if (lexFilter === "solid") list = list.filter(i => levelOf(i.key) >= 4);
  if (lexFilter === "fav") list = list.filter(i => state.favorites[i.key]);
  $("lexList").innerHTML = list.slice(0, 180).map(i => `<div class="lex-row"><div class="lex-main"><b>${escapeHtml(i.lb)}</b><em>${escapeHtml(i.ph || "")}</em><span>${escapeHtml(i.fr)}</span></div><div class="lex-actions"><button class="icon-btn ${state.favorites[i.key] ? "active" : ""}" data-fav="${i.key}" title="Favori">★</button><button class="icon-btn" data-speak="${encodeURIComponent(i.lb)}" title="Écouter">▶</button><a class="icon-btn" style="display:grid;place-items:center;text-decoration:none" target="_blank" rel="noopener" href="https://lod.lu/search?q=${encodeURIComponent(rootWord(i.lb))}" title="Vérifier sur lod.lu">L</a></div></div>`).join("") || `<div class="panel muted">Aucun résultat.</div>`;
}

function renderProgress() {
  const hours = (state.journal.minutes || 0) / 60;
  $("metricHours").textContent = `${hours.toFixed(1)} h`; $("metricSessions").textContent = `${state.journal.sessions || 0} séance${state.journal.sessions === 1 ? "" : "s"}`;
  $("metricLessons").textContent = validatedCount(); $("metricSolid").textContent = solidCount(); $("metricSolidSub").textContent = `sur ${ITEMS.length}`;
  $("metricStreak").textContent = `${state.journal.streak || 0} j`; $("metricLast").textContent = state.journal.last ? `dernière ${state.journal.last}` : "Aucune séance";
  const hist = state.journal.hist || {}; let total = 0, bars = "";
  for (let k = 13; k >= 0; k--) { const stamp = todayStamp() - k * DAY, min = Number(hist[stamp] || 0); total += min; const max = Math.max(30, ...Object.values(hist).map(Number)); const h = clamp(Math.round(min / max * 100), 2, 100); const label = new Date(stamp).toLocaleDateString("fr-FR", { weekday: "short" }); bars += `<div class="chart-col"><div class="chart-bar" style="height:${h}%" data-label="${label} · ${Math.round(min)} min"></div></div>`; }
  $("progressChart").innerHTML = bars; $("chartTotal").textContent = `${Math.round(total)} min`;
  const unseen = ITEMS.filter(i => levelOf(i.key) === 0).length, learning = ITEMS.filter(i => [1,2,3].includes(levelOf(i.key))).length, solid = solidCount();
  const rows = [["Non vus", unseen, "#51677b"],["En cours", learning, "#78b9ff"],["Solides", solid, "#7be0b3"]];
  $("masteryBars").innerHTML = rows.map(([name,n,color]) => `<div class="mastery-row"><span>${name}</span><div class="mastery-track"><i style="width:${Math.round(n/ITEMS.length*100)}%;background:${color}"></i></div><b>${n}</b></div>`).join("");
  const li = currentLessonIndex(); $("nextStageTitle").textContent = COURS[li].t; $("nextStageText").textContent = `Étape ${COURS[li].e}, ${ETAPES[COURS[li].e - 1]}. ${dueItems().length} expression${dueItems().length === 1 ? "" : "s"} à revoir aujourd'hui.`;
}

function renderVoiceSettings() {
  $("answerTime").value = state.settings.answerSeconds; $("answerSeconds").textContent = state.settings.answerSeconds;
  $("voiceRate").value = state.settings.voiceRate; $("voiceRateLabel").textContent = `${Number(state.settings.voiceRate).toFixed(2).replace(".", ",")}×`;
  $$("#recognitionMode button").forEach(b => b.classList.toggle("active", b.dataset.value === state.settings.recognition));
  renderDiagnostic(false);
}

function renderPricing() {
  const cycle = state.subscription.cycle || "year"; $$("#billingToggle button").forEach(b => b.classList.toggle("active", b.dataset.cycle === cycle));
  const price = cycle === "month" ? Number(CFG.pricing?.monthly || 7.99) : Number(CFG.pricing?.yearly || 59.99);
  $("premiumPrice").innerHTML = cycle === "month" ? `<strong>${formatEuro(price)}</strong><span>/ mois</span>` : `<strong>${formatEuro(price)}</strong><span>/ an</span>`;
  $("premiumEquiv").textContent = cycle === "month" ? "sans engagement annuel" : `soit ${formatEuro(price / 12)} / mois`;
}

function renderAccount() {
  const name = state.profile.name || authUser?.user_metadata?.name || authUser?.email?.split("@")[0] || "Apprenant";
  const email = authUser?.email || state.profile.email || "Mode local";
  const initial = name.trim().charAt(0).toUpperCase() || "F";
  $("profileName").textContent = name; $("profileEmail").textContent = email; $("profileAvatar").textContent = initial; $("avatarBtn").textContent = initial;
  const premium = isPremium(); const planName = premium ? "Premium" : "Découverte";
  $("accountPlan").textContent = planName; $("sidePlanName").textContent = planName; $("billingPlanTitle").textContent = planName;
  $("billingStatus").textContent = state.subscription.status || "local";
  $("billingPlanText").textContent = premium ? "Ton accès Premium est actif." : "Aucun abonnement Premium actif.";
  $("billingPortalBtn").hidden = !premium || !authUser;
  $("dailyGoalSelect").value = String(state.settings.dailyGoal); $("memoryTipsToggle").checked = state.settings.tips; $("echoToggle").checked = state.settings.echo;
  if (authUser) {
    $("authStatus").textContent = `Connecté avec ${authUser.email}. La progression peut être synchronisée.`; $("signInBtn").hidden = true; $("signUpBtn").hidden = true; $("signOutBtn").hidden = false; $("authEmail").value = authUser.email || ""; $("authPassword").value = "";
  } else {
    const configured = !!(CFG.supabaseUrl && CFG.supabaseAnonKey); $("authStatus").textContent = configured ? "Connecte-toi pour synchroniser ta progression et gérer Premium." : "Le mode local fonctionne. Configure Supabase dans config.js pour activer les comptes."; $("signInBtn").hidden = false; $("signUpBtn").hidden = false; $("signOutBtn").hidden = true;
  }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent); $("installHelp").textContent = window.matchMedia("(display-mode: standalone)").matches ? "Application déjà installée." : ios ? "Sur iPhone : Safari → Partager → Sur l'écran d'accueil." : "Sur Android : utilise Installer si le bouton est proposé, sinon le menu Chrome → Ajouter à l'écran d'accueil.";
}

function routeTo(route) {
  if (!ROUTES[route]) route = "home"; activeRoute = route;
  $$(".view").forEach(v => v.classList.toggle("active", v.dataset.view === route)); renderHeader(); window.scrollTo({ top: 0, behavior: "smooth" });
  const url = new URL(location.href); url.searchParams.set("route", route); history.replaceState(null, "", url);
}

function openLesson(li) {
  const freeLimit = CFG.free?.lessons ?? 8;
  if (!isPremium() && li >= freeLimit) { routeTo("premium"); toast("Cette leçon fait partie de Premium."); return; }
  const l = COURS[li]; const items = ITEMS.filter(i => i.lesson === li); const solid = items.filter(i => levelOf(i.key) >= 4).length;
  $("lessonModalBody").innerHTML = `<p class="kicker">LEÇON ${String(li+1).padStart(2,"0")} · ÉTAPE ${l.e}</p><h2 id="lessonModalTitle">${escapeHtml(l.t)}</h2><p class="muted">${solid} expression${solid===1?"":"s"} solide${solid===1?"":"s"} sur ${items.length}.</p><div class="lesson-note">${escapeHtml(l.note)}</div><div class="lesson-items">${items.map(it => `<div class="lesson-item"><div><b>${escapeHtml(it.lb)}</b><em>${escapeHtml(it.ph || "")}</em><span>${escapeHtml(it.fr)}</span>${state.settings.tips && it.tr ? `<span class="tip">Astuce : ${escapeHtml(it.tr)}</span>` : ""}</div><button class="icon-btn" data-speak="${encodeURIComponent(it.lb)}">▶</button></div>`).join("")}</div><button class="primary big full" style="margin-top:18px" data-lesson-start="${li}">Travailler cette leçon</button>`;
  showModal("lessonModal");
}

function showModal(id) { $(id).hidden = false; document.body.style.overflow = "hidden"; }
function closeModal(id) { $(id).hidden = true; document.body.style.overflow = ""; }

function normalizeSearch(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }
function normalizeSpeech(s) { return normalizeSearch(s).replace(/sch/g,"sh").replace(/ch/g,"h").replace(/w/g,"v").replace(/z/g,"ts").replace(/(.)\1+/g,"$1"); }
function distance(a, b) { const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=Array.from({length:n+1},(_,j)=>j),c=new Array(n+1);for(let i=1;i<=m;i++){c[0]=i;for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));[p,c]=[c,p]}return p[n]; }
function similarity(a, b) { const x=normalizeSpeech(a),y=normalizeSpeech(b);return 1-distance(x,y)/Math.max(x.length,y.length,1); }
function rootWord(lb) { return String(lb).replace(/^(ech|du|hie|hien|si|mir|dir|Dir|d'|de |den |e |eng )\s*/i, "").split(/[ ,?…]/)[0].replace(/^d'/, ""); }

function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  availableVoices = speechSynthesis.getVoices() || [];
  const lb = availableVoices.filter(v => /^lb/i.test(v.lang)); const de = availableVoices.filter(v => /^de/i.test(v.lang)); const fr = availableVoices.filter(v => /^fr/i.test(v.lang)); const candidates = [...lb, ...de.filter(v => !lb.some(x => x.name === v.name))];
  luxVoice = availableVoices.find(v => v.name === state.settings.luxVoice) || candidates[0] || null; frVoice = availableVoices.find(v => v.name === state.settings.frVoice) || fr[0] || null;
  if (luxVoice) state.settings.luxVoice = luxVoice.name; if (frVoice) state.settings.frVoice = frVoice.name;
  if ($("luxVoiceSelect")) { $("luxVoiceSelect").innerHTML = candidates.length ? candidates.map(v => `<option value="${escapeHtml(v.name)}">${/^lb/i.test(v.lang) ? "Lëtzebuergesch" : "Allemand, secours"} · ${escapeHtml(v.name)}</option>`).join("") : `<option value="">Aucune voix compatible</option>`; $("luxVoiceSelect").value = state.settings.luxVoice || ""; }
  if ($("frVoiceSelect")) { $("frVoiceSelect").innerHTML = fr.length ? fr.map(v => `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)}</option>`).join("") : `<option value="">Aucune voix française</option>`; $("frVoiceSelect").value = state.settings.frVoice || ""; }
}

function speak(text, lang = "lb", rate = 1) {
  lastSpoken = { text, lang, rate };
  return new Promise(resolve => {
    if (!("speechSynthesis" in window)) return resolve();
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); if (lang === "lb") { u.lang = luxVoice && /^lb/i.test(luxVoice.lang) ? luxVoice.lang : "de-DE"; if (luxVoice) u.voice = luxVoice; u.rate = clamp((state.settings.voiceRate || .85) * rate, .45, 1.25); } else { u.lang="fr-FR";if(frVoice)u.voice=frVoice;u.rate=clamp((state.settings.voiceRate||.85)+.1,.6,1.25); } let done=false; const fin=()=>{if(!done){done=true;resolve();}};u.onend=fin;u.onerror=fin;speechSynthesis.speak(u);setTimeout(fin,Math.max(2500,String(text).length*180)); } catch(_) { resolve(); }
  });
}

async function ensureMic() {
  if (micStream && micStream.active) return micStream;
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Ce navigateur ne donne pas accès au micro.");
  micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  return micStream;
}

function startMicVisual() {
  $("micVisual")?.classList.add("live"); const wave=$("micWave"); if (wave && !wave.children.length) wave.innerHTML=Array.from({length:24},(_,i)=>`<i style="height:${10+(i%7)*5}px"></i>`).join("");
}
function stopMicVisual() { $("micVisual")?.classList.remove("live"); }

function recordAudio(ms = 6000) {
  return new Promise(async (resolve, reject) => {
    try { const stream = await ensureMic(); const mimeChoices=["audio/webm;codecs=opus","audio/webm","audio/mp4"]; const mime=mimeChoices.find(x=>MediaRecorder.isTypeSupported?.(x))||""; const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined); const chunks=[];rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};rec.onerror=e=>reject(e.error||new Error("Enregistrement impossible"));rec.onstop=()=>resolve(new Blob(chunks,{type:rec.mimeType||mime||"audio/webm"}));rec.start();setTimeout(()=>{if(rec.state!=="inactive")rec.stop()},ms); } catch(e){reject(e)}
  });
}

async function blobToBase64(blob) { const buf = new Uint8Array(await blob.arrayBuffer()); let bin=""; const step=0x8000; for(let i=0;i<buf.length;i+=step) bin += String.fromCharCode(...buf.subarray(i,i+step)); return btoa(bin); }

function browserRecognitionAvailable() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
function cloudSpeechConfigured() { return !!(CFG.functionsBaseUrl && CFG.supabaseUrl && CFG.supabaseAnonKey); }

async function browserRecognize(ms = 6500, lang = "de-DE") {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) return { engine:"browser", transcripts:[], error:"Reconnaissance navigateur indisponible" };
  return new Promise(resolve => {
    let rec; try { rec = new Rec(); } catch(e) { return resolve({engine:"browser",transcripts:[],error:e.message}); }
    rec.lang=lang;rec.interimResults=false;rec.maxAlternatives=5;rec.continuous=false;let ended=false;const out=[];const finish=(error="")=>{if(ended)return;ended=true;try{rec.stop()}catch(_){}resolve({engine:"browser",transcripts:out,error})};rec.onresult=e=>{try{const r=e.results[e.results.length-1];for(let i=0;i<r.length;i++)out.push({text:r[i].transcript,confidence:r[i].confidence||0})}catch(_){}finish()};rec.onerror=e=>finish(e.error||"Erreur de reconnaissance");rec.onend=()=>finish();try{rec.start()}catch(e){finish(e.message)}setTimeout(()=>finish("Temps écoulé"),ms);
  });
}

async function cloudRecognize(blob, expected = "") {
  if (!cloudSpeechConfigured()) return { engine:"cloud", transcripts:[], error:"Moteur cloud non configuré" };
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  const token = session?.access_token || "";
  try {
    const audio = await blobToBase64(blob);
    const res = await fetch(`${CFG.functionsBaseUrl.replace(/\/$/,"")}/speech-transcribe`, { method:"POST", headers:{"Content-Type":"application/json", ...(token?{"Authorization":`Bearer ${token}`}:{})}, body:JSON.stringify({audioBase64:audio,mimeType:blob.type||"audio/webm",expected}) });
    const data = await res.json().catch(()=>({})); if(!res.ok) throw new Error(data.error||`Erreur cloud ${res.status}`); return { engine:"cloud", transcripts:data.transcripts||[], error:"", usage:data.usage||null };
  } catch(e) { return { engine:"cloud", transcripts:[], error:e.message }; }
}

function bestRecognition(result, expected) {
  const cands=(result?.transcripts||[]).map(x=>({ ...x, sim: similarity(expected,x.text) })).sort((a,b)=>(b.sim+(b.confidence||0)*.1)-(a.sim+(a.confidence||0)*.1)); return cands[0]||null;
}

async function recognizeSpeech(expected, opts = {}) {
  const preferred = opts.engine || state.settings.recognition || "auto"; const ms=(opts.seconds||state.settings.answerSeconds||6)*1000; recognitionLastEngine="none";
  let chosen = preferred;
  if (chosen === "auto") chosen = cloudSpeechConfigured() ? "cloud" : (browserRecognitionAvailable() ? "browser" : "echo");
  if (chosen === "cloud") {
    try { startMicVisual(); const blob=await recordAudio(ms); stopMicVisual(); const r=await cloudRecognize(blob,expected); recognitionLastEngine="cloud"; if(r.transcripts?.length)return { ...r, blob }; if(preferred==="auto" && browserRecognitionAvailable()) { const b=await browserRecognize(ms,"de-DE");recognitionLastEngine="browser";return b; } return { ...r, blob }; } catch(e){stopMicVisual();if(preferred==="auto"&&browserRecognitionAvailable()){const b=await browserRecognize(ms,"de-DE");recognitionLastEngine="browser";return b;}return {engine:"cloud",transcripts:[],error:e.message};}
  }
  if (chosen === "browser") { startMicVisual(); const r=await browserRecognize(ms,"de-DE"); stopMicVisual();recognitionLastEngine="browser";return r; }
  try { startMicVisual(); const blob=await recordAudio(ms);stopMicVisual();recognitionLastEngine="echo";return {engine:"echo",transcripts:[],blob,error:""}; } catch(e){stopMicVisual();return {engine:"echo",transcripts:[],error:e.message};}
}

function buildSession(mode, specificLesson = null) {
  const duration = mode === "sprint" || mode === "numbers" ? 5 : Number(state.settings.duration || 20);
  const count = clamp(Math.round(duration * 1.5), 8, 70);
  const current = specificLesson ?? currentLessonIndex(); const currentItems = ITEMS.filter(i => i.lesson === current); const due = shuffle(dueItems()); const solids = shuffle(ITEMS.filter(i => levelOf(i.key) >= 4)); const unseen = shuffle(currentItems.filter(i => levelOf(i.key) === 0));
  if (mode === "listen") return { mode,duration,items:shuffle([...due,...currentItems,...solids]).slice(0,count).map(it=>({type:"listen",it})) };
  if (mode === "numbers") { const nums=ITEMS.filter(i=>i.lesson<=4);return {mode,duration,items:shuffle([...nums,...nums,...nums]).slice(0,count).map(it=>({type:"number",it}))}; }
  if (mode === "dialogue") { const ds=DIALOGUES.filter(d=>d.e<=currentStage());return {mode,duration,items:shuffle(ds).slice(0,Math.max(1,Math.round(duration/5))).map(d=>({type:"dialogue",dialogue:d}))}; }
  let pool=[];
  if (mode === "review") pool = [...due, ...shuffle(ITEMS.filter(i=>levelOf(i.key)>0&&levelOf(i.key)<4))];
  else if (mode === "sprint") pool = [...due, ...solids, ...currentItems];
  else pool = [...due.slice(0,Math.ceil(count*.35)), ...unseen.slice(0,Math.max(3,Math.ceil(count*.2))), ...shuffle(currentItems).slice(0,Math.ceil(count*.3)), ...solids.slice(0,Math.ceil(count*.2))];
  if (!pool.length) pool = currentItems;
  pool = shuffle(pool.length < count ? [...pool,...pool,...currentItems] : pool).slice(0,count);
  return {mode,duration,items:pool.map((it,idx)=>({type: idx%4===0 && mode==="smart" ? "listen" : "speak",it}))};
}

async function startMode(mode, specificLesson = null) {
  const def=MODES.find(m=>m.id===mode); if(def?.premium && !isPremium()){routeTo("premium");toast("Ce mode fait partie de Premium.");return;}
  if (!isPremium() && Number(state.settings.duration) > Number(CFG.free?.maxSessionMinutes || 20)) { state.settings.duration = CFG.free?.maxSessionMinutes || 20; toast(`La formule Découverte est limitée à ${state.settings.duration} minutes par séance.`); renderAll(); }
  const session=buildSession(mode,specificLesson); if(!session.items.length){toast("Aucun contenu disponible pour ce mode.");return;}
  closeModal("lessonModal"); currentSession={...session,index:0,started:Date.now(),correct:0,attempts:0}; sessionToken++; paused=false; $("sessionOverlay").hidden=false;document.body.style.overflow="hidden";$("sessionPauseBtn").textContent="Pause";await runSession(sessionToken);
}

async function runSession(token) {
  while(currentSession && token===sessionToken && currentSession.index<currentSession.items.length){if(paused){await sleep(200);continue;}const ex=currentSession.items[currentSession.index];updateSessionChrome();if(ex.type==="dialogue")await runDialogue(ex.dialogue,token);else await runExercise(ex,token);if(!currentSession||token!==sessionToken)return;currentSession.index++;}
  if(currentSession&&token===sessionToken)finishSession();
}

function updateSessionChrome(){const s=currentSession;const names={smart:"Trajet intelligent",review:"Révisions",sprint:"Sprint oral",numbers:"Chiffres",listen:"Écoute libre",dialogue:"Dialogue"};$("sessionModeLabel").textContent=names[s.mode]||"Séance";$("sessionCounter").textContent=`${Math.min(s.index+1,s.items.length)} / ${s.items.length}`;$("sessionProgressBar").style.width=`${Math.round(s.index/s.items.length*100)}%`;}
function sessionDisplay({phase,prompt="",phonetic="",translation="",heard=""}){$("sessionPhase").textContent=phase||"";$("sessionPrompt").textContent=prompt;$("sessionPhonetic").textContent=phonetic;$("sessionTranslation").textContent=translation;$("sessionHeard").hidden=!heard;$("sessionHeard").textContent=heard?`Entendu : ${heard}`:"";$("sessionFeedback").hidden=true;$("sessionOrb").classList.remove("listening");}

async function runExercise(ex,token){const it=ex.it;if(ex.type==="listen"){sessionDisplay({phase:"Écoute",prompt:it.lb,phonetic:it.ph});await speak(it.lb,"lb");if(token!==sessionToken)return;await sleep(350);sessionDisplay({phase:"Sens",prompt:it.lb,phonetic:it.ph,translation:it.fr});await speak(it.fr,"fr");if(token!==sessionToken)return;await speak(it.lb,"lb",.9);markLearning(it,"seen");await sleep(500);return;}
  if(ex.type==="number"){sessionDisplay({phase:"Quel nombre ?",prompt:it.lb});await speak(it.lb,"lb");await sleep(1600);sessionDisplay({phase:"Réponse",prompt:it.lb,translation:it.fr});await speak(it.fr,"fr");markLearning(it,"seen");await sleep(350);return;}
  sessionDisplay({phase:"À toi",prompt:`Comment dis-tu : ${it.fr} ?`,translation:""});await speak(`Comment dis-tu : ${it.fr} ?`,"fr");if(token!==sessionToken)return;$("sessionOrb").classList.add("listening");const r=await recognizeSpeech(it.lb);$("sessionOrb").classList.remove("listening");if(token!==sessionToken)return;const best=bestRecognition(r,it.lb);currentSession.attempts++;
  if(best && best.sim>=.78){currentSession.correct++;sessionDisplay({phase:"Très bien",prompt:it.lb,phonetic:it.ph,translation:it.fr,heard:best.text});markLearning(it,"easy");await speak("Très bien.","fr");await speak(it.lb,"lb");await sleep(400);return;}
  if(best && best.sim>=.5){sessionDisplay({phase:"Presque",prompt:it.lb,phonetic:it.ph,translation:it.fr,heard:best.text});markLearning(it,"ok");await speak("Presque. Écoute le modèle.","fr");await speak(it.lb,"lb");await sleep(500);return;}
  // Résultat absent ou faible: ne pas pénaliser automatiquement.
  sessionDisplay({phase:r.error?"Reconnaissance incertaine":"Compare avec le modèle",prompt:it.lb,phonetic:it.ph,translation:it.fr,heard:best?.text||""});await speak(it.lb,"lb");if(state.settings.echo&&r.blob)await playBlob(r.blob);const self=await askSelfRating(token);if(self)markLearning(it,self);}

async function askSelfRating(token){if(token!==sessionToken)return null;$("sessionFeedback").hidden=false;return new Promise(resolve=>{pendingSelfResolve=resolve;setTimeout(()=>{if(pendingSelfResolve===resolve){pendingSelfResolve=null;$("sessionFeedback").hidden=true;resolve("seen")}},12000)});}

async function runDialogue(d,token){sessionDisplay({phase:"Dialogue",prompt:d.t,translation:"Écoute le sens général"});await speak("Écoute cette conversation.","fr");for(const line of d.l){if(token!==sessionToken)return;sessionDisplay({phase:`Voix ${line.q}`,prompt:line.lb,translation:""});await speak(line.lb,"lb",line.q==="A"?.95:1.05);await sleep(250)}await speak("On reprend avec la traduction.","fr");for(const line of d.l){if(token!==sessionToken)return;sessionDisplay({phase:`Voix ${line.q}`,prompt:line.lb,translation:line.fr});await speak(line.lb,"lb");await speak(line.fr,"fr");}}

function finishSession(){const s=currentSession;const elapsed=Math.max(1,Math.min(s.duration,(Date.now()-s.started)/60000));state.journal.sessions=(state.journal.sessions||0)+1;state.journal.minutes=(state.journal.minutes||0)+elapsed;state.journal.hist=state.journal.hist||{};state.journal.hist[todayStamp()]=(state.journal.hist[todayStamp()]||0)+elapsed;const today=new Date().toLocaleDateString("fr-FR");const yesterday=new Date(todayStamp()-DAY).toLocaleDateString("fr-FR");if(state.journal.last!==today)state.journal.streak=state.journal.last===yesterday?(state.journal.streak||0)+1:1;state.journal.last=today;saveState();const accuracy=s.attempts?Math.round(s.correct/s.attempts*100):null;sessionDisplay({phase:"Séance terminée",prompt:`${Math.round(elapsed)} min`,translation:accuracy!==null?`${accuracy}% de réponses reconnues avec confiance · ${solidCount()} expressions solides`:`${solidCount()} expressions solides`});$("sessionFeedback").hidden=true;$("sessionProgressBar").style.width="100%";setTimeout(()=>{if(currentSession===s){stopSession();renderAll();routeTo("home")}},3500)}
function stopSession(){sessionToken++;currentSession=null;paused=false;try{speechSynthesis.cancel()}catch(_){}$("sessionOverlay").hidden=true;document.body.style.overflow="";}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function playBlob(blob){return new Promise(resolve=>{try{const url=URL.createObjectURL(blob),audio=new Audio(url);audio.onended=()=>{URL.revokeObjectURL(url);resolve()};audio.onerror=()=>{URL.revokeObjectURL(url);resolve()};audio.play().catch(resolve);setTimeout(resolve,8000)}catch(_){resolve()}})}

async function runVoiceTest(){const btn=$("voiceTestBtn"),box=$("voiceTestResult");btn.disabled=true;box.className="voice-result";box.textContent="Autorise le micro, puis dis « Moien » une seule fois.";try{await ensureMic();await speak("Dis Moien maintenant.","fr");startMicVisual();const r=await recognizeSpeech("Moien",{seconds:6});stopMicVisual();const best=bestRecognition(r,"Moien");recognitionLastEngine=r.engine||"none";if(best){const pc=Math.round(best.sim*100);box.className=`voice-result ${pc>=70?"good":"bad"}`;box.innerHTML=`Moteur : <b>${escapeHtml(r.engine)}</b><br>Entendu : <b>${escapeHtml(best.text)}</b><br>Correspondance avec « Moien » : <b>${pc}%</b>${r.engine==="browser"?"<br><small>Le navigateur utilise ici une reconnaissance de secours, moins fiable pour le luxembourgeois.</small>":""}`;$("speechEngineBadge").textContent=r.engine;}else{box.className="voice-result bad";box.innerHTML=`Aucun mot reconnu. Moteur : <b>${escapeHtml(r.engine||"aucun")}</b>.<br>${escapeHtml(r.error||"Le moteur n'a pas retourné de transcription.")}<br><small>Ce résultat n'affecte pas ta progression.</small>`;$("speechEngineBadge").textContent="à corriger";}}catch(e){stopMicVisual();box.className="voice-result bad";box.textContent=e.message||"Test impossible.";}finally{btn.disabled=false;renderDiagnostic(false)}}

function diagnosticData(){return [
  ["HTTPS",location.protocol==="https:"||location.hostname==="localhost","Le micro exige un contexte sécurisé"],
  ["Micro",!!navigator.mediaDevices?.getUserMedia,"API navigateur"],
  ["Enregistrement",typeof MediaRecorder!=="undefined","Pour l'écho et le cloud"],
  ["Reconnaissance navigateur",browserRecognitionAvailable(),browserRecognitionAvailable()?"secours disponible":"non disponible"],
  ["Reconnaissance cloud",cloudSpeechConfigured(),cloudSpeechConfigured()?"endpoint configuré":"à configurer avec Supabase + Google STT"],
  ["Synthèse vocale","speechSynthesis" in window, luxVoice?`${luxVoice.lang} · ${luxVoice.name}`:"aucune voix sélectionnée"],
  ["Compte cloud",!!authUser,authUser?authUser.email:"mode local"],
  ["PWA",!!navigator.serviceWorker,"service worker"],
  ["Installée",window.matchMedia("(display-mode: standalone)").matches,"mode application"]
];}
function renderDiagnostic(force=false){if(!$('diagnosticList'))return;const data=diagnosticData();$("diagnosticList").innerHTML=data.map(([name,ok,detail])=>`<div class="diag-row"><span>${escapeHtml(name)} · ${escapeHtml(detail)}</span><b class="${ok?"ok-text":"warn-text"}">${ok?"OK":"À régler"}</b></div>`).join("");}
async function fullDiagnostic(){const btn=$("fullDiagnosticBtn");btn.disabled=true;try{await ensureMic();toast("Micro autorisé.");await runVoiceTest()}catch(e){toast(e.message||"Diagnostic impossible") }finally{btn.disabled=false;renderDiagnostic(true)}}
function diagnosticText(){return diagnosticData().map(([n,ok,d])=>`${n}: ${ok?"OK":"À régler"} · ${d}`).join("\n")+`\nDernier moteur: ${recognitionLastEngine}\nVersion: ${VERSION}\nNavigateur: ${navigator.userAgent}`;}

async function initSupabase(){if(!CFG.supabaseUrl||!CFG.supabaseAnonKey)return;try{const mod=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");supabase=mod.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data:{session}}=await supabase.auth.getSession();authUser=session?.user||null;supabase.auth.onAuthStateChange((_event,session)=>{authUser=session?.user||null;if(authUser)loadCloudUser();else{state.subscription={status:"local",plan:"free",cycle:state.subscription.cycle||"year"};renderAll();}});if(authUser)await loadCloudUser();}catch(e){console.warn("Supabase indisponible",e);}}

async function loadCloudUser(){if(!supabase||!authUser)return;try{state.profile.email=authUser.email||"";state.profile.name=authUser.user_metadata?.name||state.profile.name;const [{data:p},{data:s}]=await Promise.all([supabase.from("user_progress").select("snapshot,updated_at").eq("user_id",authUser.id).maybeSingle(),supabase.from("subscriptions").select("status,price_id,current_period_end").eq("user_id",authUser.id).maybeSingle()]);if(p?.snapshot)mergeCloudSnapshot(p.snapshot);if(s){state.subscription.status=s.status||"inactive";state.subscription.plan=["active","trialing"].includes(s.status)?"premium":"free";}saveState(false);renderAll();}catch(e){console.warn("Chargement cloud",e)}}

async function signIn(){if(!supabase){toast("Configure Supabase dans config.js d'abord.");return;}const email=$("authEmail").value.trim(),password=$("authPassword").value;if(!email||!password){toast("Entre ton email et ton mot de passe.");return;}const {error}=await supabase.auth.signInWithPassword({email,password});if(error)toast(error.message);else toast("Connexion réussie.")}
async function signUp(){if(!supabase){toast("Configure Supabase dans config.js d'abord.");return;}const email=$("authEmail").value.trim(),password=$("authPassword").value;if(password.length<8){toast("Utilise au moins 8 caractères.");return;}const {error}=await supabase.auth.signUp({email,password,options:{data:{name:email.split("@")[0]}}});if(error)toast(error.message);else toast("Compte créé. Vérifie ton email si la confirmation est activée.")}
async function signOut(){if(!supabase)return;await supabase.auth.signOut({scope:"local"});authUser=null;state.subscription={status:"local",plan:"free",cycle:state.subscription.cycle||"year"};saveState(false);renderAll();toast("Déconnecté.")}

async function subscribe(){const cycle=state.subscription.cycle||"year";if(!CFG.functionsBaseUrl||!supabase){showCheckoutInfo("Le prototype Premium est prêt. Pour accepter de vrais paiements, configure Supabase et Stripe avec le guide DEPLOIEMENT_COMPLET.md.");return;}if(!authUser){routeTo("account");toast("Crée ou connecte ton compte avant de t'abonner.");return;}try{const {data:{session}}=await supabase.auth.getSession();const res=await fetch(`${CFG.functionsBaseUrl.replace(/\/$/,"")}/create-checkout`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${session.access_token}`},body:JSON.stringify({cycle,returnUrl:location.origin+location.pathname})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Checkout impossible");location.href=data.url;}catch(e){showCheckoutInfo(e.message)}}
async function openBillingPortal(){if(!CFG.functionsBaseUrl||!supabase||!authUser){toast("Portail non configuré.");return;}try{const {data:{session}}=await supabase.auth.getSession();const res=await fetch(`${CFG.functionsBaseUrl.replace(/\/$/,"")}/create-portal`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${session.access_token}`},body:JSON.stringify({returnUrl:location.href})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Portail impossible");location.href=data.url;}catch(e){toast(e.message)}}
function showCheckoutInfo(text){$("checkoutText").textContent=text;showModal("checkoutModal")}

function exportProgress(){const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`letzebuergesch-progression-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
async function importProgress(file){try{const data=JSON.parse(await file.text());if(!data.progress&&!data.journal)throw new Error("Format non reconnu");mergeCloudSnapshot(data);if(data.settings)state.settings=deepMerge(state.settings,data.settings);if(data.profile)state.profile=deepMerge(state.profile,data.profile);saveState();renderAll();toast("Progression importée.")}catch(e){toast(e.message||"Fichier illisible")}}
function resetProgress(){if(!confirm("Effacer toute la progression locale ? Cette action ne peut pas être annulée."))return;state.progress={};state.validated={};state.favorites={};state.journal=structuredClone(DEFAULTS.journal);saveState();renderAll();toast("Progression remise à zéro.")}

function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove("show"),3500)}

function updateOnlineState(){const off=!navigator.onLine;$("offlineBar").hidden=!off;if(off)toast("Mode hors ligne actif.")}

function setupPWA(){if("serviceWorker" in navigator && location.protocol.startsWith("http")){navigator.serviceWorker.register("sw.js?v=4.0.0").then(reg=>{reg.addEventListener("updatefound",()=>{const nw=reg.installing;nw?.addEventListener("statechange",()=>{if(nw.state==="installed"&&navigator.serviceWorker.controller)toast("Nouvelle version disponible. Recharge l'application.")})})}).catch(console.warn)}window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("installBtnSide").hidden=false;$("installBtnAccount").disabled=false});window.addEventListener("appinstalled",()=>{installPrompt=null;$("installBtnSide").hidden=true;toast("Application installée.")})}
async function installApp(){if(window.matchMedia("(display-mode: standalone)").matches){toast("L'application est déjà installée.");return;}if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return;}const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);toast(ios?"Safari → Partager → Sur l'écran d'accueil.":"Chrome → menu ⋮ → Installer ou Ajouter à l'écran d'accueil.")}
async function checkUpdate(){if(!("serviceWorker" in navigator)){toast("Service worker indisponible.");return;}const reg=await navigator.serviceWorker.getRegistration();if(!reg){toast("Aucune installation PWA active.");return;}await reg.update();toast(reg.waiting?"Mise à jour prête. Recharge l'application.":"Vérification terminée.")}

function bindEvents(){
  document.addEventListener("click",e=>{
    const route=e.target.closest("[data-route]");if(route){routeTo(route.dataset.route);return}
    const mode=e.target.closest("[data-mode]");if(mode){startMode(mode.dataset.mode);return}
    const lesson=e.target.closest("[data-lesson]");if(lesson){openLesson(Number(lesson.dataset.lesson));return}
    const lstart=e.target.closest("[data-lesson-start]");if(lstart){startMode("smart",Number(lstart.dataset.lessonStart));return}
    const fav=e.target.closest("[data-fav]");if(fav){state.favorites[fav.dataset.fav]=!state.favorites[fav.dataset.fav];saveState();renderPractice();return}
    const sp=e.target.closest("[data-speak]");if(sp){speak(decodeURIComponent(sp.dataset.speak),"lb");return}
    const close=e.target.closest("[data-close-modal]");if(close){closeModal(close.dataset.closeModal);return}
  });
  $("startSmartHome").onclick=()=>startMode("smart");
  $("durationPicker").onclick=e=>{const b=e.target.closest("button[data-min]");if(!b)return;state.settings.duration=Number(b.dataset.min);saveState();renderAll()};
  $("courseSearch").oninput=e=>renderCourses(e.target.value);
  $("lexSearch").oninput=()=>renderPractice();$("lexFilters").onclick=e=>{const b=e.target.closest("button[data-filter]");if(!b)return;lexFilter=b.dataset.filter;$$('#lexFilters button').forEach(x=>x.classList.toggle('active',x===b));renderPractice()};
  $("exportProgressBtn").onclick=exportProgress;$("importProgressBtn").onclick=()=>$("importProgressFile").click();$("importProgressFile").onchange=e=>e.target.files[0]&&importProgress(e.target.files[0]);$("resetProgressBtn").onclick=resetProgress;
  $("voiceTestBtn").onclick=runVoiceTest;$("fullDiagnosticBtn").onclick=fullDiagnostic;$("copyDiagBtn").onclick=()=>navigator.clipboard?.writeText(diagnosticText()).then(()=>toast("Diagnostic copié."));
  $("recognitionMode").onclick=e=>{const b=e.target.closest("button[data-value]");if(!b)return;state.settings.recognition=b.dataset.value;saveState();renderVoiceSettings()};
  $("answerTime").oninput=e=>{state.settings.answerSeconds=Number(e.target.value);$("answerSeconds").textContent=e.target.value};$("answerTime").onchange=()=>saveState();
  $("voiceRate").oninput=e=>{state.settings.voiceRate=Number(e.target.value);$("voiceRateLabel").textContent=`${Number(e.target.value).toFixed(2).replace('.',',')}×`};$("voiceRate").onchange=()=>saveState();
  $("luxVoiceSelect").onchange=e=>{state.settings.luxVoice=e.target.value;luxVoice=availableVoices.find(v=>v.name===e.target.value)||luxVoice;saveState()};$("frVoiceSelect").onchange=e=>{state.settings.frVoice=e.target.value;frVoice=availableVoices.find(v=>v.name===e.target.value)||frVoice;saveState()};
  $("voicePreviewBtn").onclick=async()=>{await speak("Moien. Wéi geet et?","lb");await speak("Voici la voix du professeur.","fr")};
  $("billingToggle").onclick=e=>{const b=e.target.closest("button[data-cycle]");if(!b)return;state.subscription.cycle=b.dataset.cycle;saveState(false);renderPricing()};$("subscribeBtn").onclick=subscribe;$("stayFreeBtn").onclick=()=>routeTo("home");$("checkoutContinueBtn").onclick=()=>closeModal("checkoutModal");
  $("signInBtn").onclick=signIn;$("signUpBtn").onclick=signUp;$("signOutBtn").onclick=signOut;$("billingPortalBtn").onclick=openBillingPortal;
  $("dailyGoalSelect").onchange=e=>{state.settings.dailyGoal=Number(e.target.value);saveState();renderAll()};$("memoryTipsToggle").onchange=e=>{state.settings.tips=e.target.checked;saveState()};$("echoToggle").onchange=e=>{state.settings.echo=e.target.checked;saveState()};
  $("installBtnSide").onclick=installApp;$("installBtnAccount").onclick=installApp;$("updateBtn").onclick=checkUpdate;
  $("sessionExitBtn").onclick=()=>{if(confirm("Quitter cette séance ?"))stopSession()};$("sessionPauseBtn").onclick=()=>{paused=!paused;$("sessionPauseBtn").textContent=paused?"Reprendre":"Pause";try{paused?speechSynthesis.pause():speechSynthesis.resume()}catch(_){}};$("sessionRepeatBtn").onclick=()=>{if(lastSpoken)speak(lastSpoken.text,lastSpoken.lang,lastSpoken.rate)};$("sessionSkipBtn").onclick=()=>{if(currentSession){sessionToken++;currentSession.index++;const t=sessionToken;runSession(t)}};
  $("sessionFeedback").onclick=e=>{const b=e.target.closest("button[data-self]");if(!b||!pendingSelfResolve)return;const r=pendingSelfResolve;pendingSelfResolve=null;$("sessionFeedback").hidden=true;r(b.dataset.self)};
  window.addEventListener("online",updateOnlineState);window.addEventListener("offline",updateOnlineState);
}

async function boot(){loadState();bindEvents();setupPWA();updateOnlineState();loadVoices();if("speechSynthesis" in window)speechSynthesis.onvoiceschanged=()=>{loadVoices();renderDiagnostic(false)};await initSupabase();const p=new URLSearchParams(location.search);routeTo(p.get("route")||"home");if(p.get("mode"))setTimeout(()=>startMode(p.get("mode")),400);renderAll();}
boot();
