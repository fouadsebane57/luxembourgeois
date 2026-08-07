/* =====================================================================
   LËTZEBUERGESCH AM AUTO — MOTEUR
   Les données sont dans cours.js. Ce fichier contient la logique.
   ===================================================================== */

const APP_VERSION = "2.0.0";
const BUILD = "2026-08-07.1";
const ITEMS = [];
COURS.forEach((l, li) => l.i.forEach((it, ii) => ITEMS.push({ ...it, cle: li + "-" + ii, lecon: li })));
const $ = id => document.getElementById(id);
const echapper = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ---------- contexte technique ---------- */
const dansCadre = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
const secure = ("isSecureContext" in window) ? window.isSecureContext : (location.protocol === "https:");
const RECO = window.SpeechRecognition || window.webkitSpeechRecognition || null;

/* ---------- stockage ---------- */
const Store = {
  async get(k) {
    try { if (window.storage) { const r = await window.storage.get(k); return r ? r.value : null; } } catch (e) {}
    try { return localStorage.getItem(k); } catch (e) { return null; }
  },
  async set(k, v) {
    try { if (window.storage) { await window.storage.set(k, v); return true; } } catch (e) {}
    try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
  }
};
let prog = {}, valides = {}, favoris = {}, jr = { seances: 0, minutes: 0, dernier: null, dernierKey: null, serie: 0, hist: {} };
let reg = { cor: false, echo: true, comp: true, truc: true, vit: 0.5, int: 1.0, tps: 5000, vDe: "", vFr: "", obj: 20 };
const JOUR = 86400000, INTERVALLES = [0, 1, 2, 4, 8, 16, 32];
const auj = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const jourCle = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const minutesAuj = () => Number((jr.hist && (jr.hist[auj()] ?? jr.hist[String(auj())])) || 0);
let filtreLex = "tous";
let derniereDiag = "";
let erreurs = [];
function logErreur(type, err) {
  const msg = `${new Date().toISOString()} · ${type} · ${err && (err.stack || err.message) ? (err.stack || err.message) : String(err)}`;
  erreurs.push(msg); erreurs = erreurs.slice(-20);
  try { localStorage.setItem("lux:errors", JSON.stringify(erreurs)); } catch (_) {}
}
window.addEventListener("error", e => logErreur("JS", e.error || e.message));
window.addEventListener("unhandledrejection", e => logErreur("Promise", e.reason));

async function charger() {
  const a = await Store.get("lux:prog"); if (a) { try { prog = JSON.parse(a); } catch (e) { logErreur("chargement progression", e); } }
  const v = await Store.get("lux:valides"); if (v) { try { valides = JSON.parse(v); } catch (e) { logErreur("chargement leçons", e); } }
  const b = await Store.get("lux:journal"); if (b) { try { jr = Object.assign(jr, JSON.parse(b)); } catch (e) { logErreur("chargement journal", e); } }
  const c = await Store.get("lux:reglages"); if (c) { try { reg = Object.assign(reg, JSON.parse(c)); } catch (e) { logErreur("chargement réglages", e); } }
  const f = await Store.get("lux:favoris"); if (f) { try { favoris = JSON.parse(f); } catch (e) { logErreur("chargement favoris", e); } }
  try { erreurs = JSON.parse(localStorage.getItem("lux:errors") || "[]").slice(-20); } catch (_) { erreurs = []; }
  if (!jr.hist) jr.hist = {};
  if (!Number.isFinite(Number(reg.obj))) reg.obj = 20;
  const migrationV2 = await Store.get("lux:v2migrated");
  if (!migrationV2) {
    reg.cor = false;
    await Store.set("lux:reglages", JSON.stringify(reg));
    await Store.set("lux:v2migrated", "1");
  }
  majReglages(); alerteContexte(); majConnexion(); majInstallation(); peindre();
}
async function sauver() {
  const ok = await Promise.all([
    Store.set("lux:prog", JSON.stringify(prog)),
    Store.set("lux:valides", JSON.stringify(valides)),
    Store.set("lux:journal", JSON.stringify(jr)),
    Store.set("lux:reglages", JSON.stringify(reg)),
    Store.set("lux:favoris", JSON.stringify(favoris))
  ]);
  if (ok.some(x => !x)) afficherToast("La progression n'a pas pu être enregistrée sur cet appareil.");
}
const niv = c => (prog[c] && prog[c].n) || 0;
const due = c => (prog[c] && prog[c].due) || 0;
const solides = () => ITEMS.filter(i => niv(i.cle) >= 4).length;
const aRevoirAuj = () => ITEMS.filter(i => niv(i.cle) > 0 && due(i.cle) <= auj()).length;
const nbValides = () => Object.keys(valides).filter(k => valides[k]).length;
const debloquee = li => li === 0 || !!valides[li - 1];
function leconCourante() { for (let li = 0; li < COURS.length; li++) if (!valides[li]) return li; return COURS.length - 1; }
function etapeAtteinte() { return COURS[leconCourante()].e; }
function verifierValidation(li) {
  const its = ITEMS.filter(i => i.lecon === li), ok = its.filter(i => niv(i.cle) >= 4).length;
  if (!valides[li] && ok >= Math.ceil(its.length * 0.8)) { valides[li] = true; return true; }
  return false;
}
function alerteContexte() {
  const el = document.getElementById("alerteMic");
  if (dansCadre) {
    el.className = "alerte on";
    el.innerHTML = "<b>Le micro ne peut pas fonctionner ici.</b><br>Cette page s'affiche dans un aperçu intégré, où le navigateur bloque le micro. Ouvre-la comme une vraie page pour avoir la correction.";
  } else if (!secure) {
    el.className = "alerte on";
    el.innerHTML = "<b>Le micro sera refusé.</b><br>Cette page n'est pas servie en HTTPS. Le navigateur n'autorise le micro que sur une adresse sécurisée.";
  } else el.className = "alerte";
}

/* ---------- affichage ---------- */
function peindre() {
  const h = (jr.minutes || 0) / 60, li = leconCourante();
  document.getElementById("procheT").textContent = (li + 1) + ". " + COURS[li].t;
  document.getElementById("procheS").textContent = "Étape " + COURS[li].e + " · " + ETAPES[COURS[li].e - 1] + ". " + aRevoirAuj() + " mots à revoir aujourd'hui.";
  document.getElementById("barH").style.width = Math.min(100, h) + "%";
  document.getElementById("lblH").textContent = h.toFixed(1) + " h sur 100";
  document.getElementById("resH").textContent = h < 0.1
    ? "Tu n'as pas encore commencé. Commence court, puis augmente progressivement."
    : "Il te reste " + Math.max(0, 100 - h).toFixed(1) + " heures sur le parcours indicatif de 100 heures.";
  document.getElementById("cpt").innerHTML = jr.seances ? (h.toFixed(1) + " h<br>" + (jr.serie || 0) + " jours de suite") : "";
  const ma = minutesAuj(), objectif = Math.max(5, Number(reg.obj) || 20), pct = Math.min(100, Math.round(ma / objectif * 100));
  if ($("objTxt")) $("objTxt").textContent = `${Math.round(ma)} min sur ${objectif} min`;
  if ($("objVal")) $("objVal").textContent = pct + "%";
  if ($("objBar")) $("objBar").style.width = pct + "%";
  document.getElementById("sv1").textContent = nbValides() + " / " + COURS.length;
  document.getElementById("sv2").textContent = solides() + " / " + ITEMS.length;
  document.getElementById("sv3").textContent = h.toFixed(1) + " h sur 100";
  document.getElementById("sv4").textContent = aRevoirAuj();
  document.getElementById("sv5").textContent = (jr.serie || 0);
  document.getElementById("sv3s").textContent = jr.seances ? (jr.seances + " séances. Dernière le " + jr.dernier + ".") : "Aucune séance pour l'instant.";
  document.getElementById("blocs").innerHTML = BLOCS.map(b =>
    `<div class="bloc"><div class="bloc-h">${b.h}</div><div><div class="bloc-t">${b.t}</div><div class="bloc-d">${b.d}</div></div></div>`).join("");
  peindreGraphe(); peindreSuivi(); peindreLecons(); peindreDialogues(); peindreLex(document.getElementById("rch").value);
}
function peindreGraphe() {
  const max = Math.max(30, ...Object.values(jr.hist || {}));
  let html = "";
  for (let k = 13; k >= 0; k--) {
    const j = auj() - k * JOUR, m = (jr.hist && jr.hist[j]) || 0;
    const hh = Math.max(2, Math.round(m / max * 78));
    html += `<div class="${m ? 'act' : ''}" style="height:${hh}px" title="${Math.round(m)} min"></div>`;
  }
  document.getElementById("graph").innerHTML = html;
}
function statut(li) { if (valides[li]) return { c: "ok", t: "Validée" }; if (!debloquee(li)) return { c: "", t: "Verrouillée" }; return { c: "now", t: "En cours" }; }
function ligne(l, li, btn) {
  const its = ITEMS.filter(i => i.lecon === li), ok = its.filter(i => niv(i.cle) >= 4).length, s = statut(li);
  const inner = `<div class="lcn">${String(li + 1).padStart(2, "0")}</div>
   <div class="lcb"><div class="lct">${l.t}</div><div class="lcm">${ok} mots solides sur ${its.length}</div>
   <div class="jg"><span style="width:${ok / its.length * 100}%"></span></div></div><div class="badge ${s.c}">${s.t}</div>`;
  return btn ? `<button class="lc" data-l="${li}" ${debloquee(li) ? "" : "disabled"}>${inner}</button>` : `<div class="lc">${inner}</div>`;
}
function peindreSuivi() {
  let html = "", e = 0;
  COURS.forEach((l, li) => { if (l.e !== e) { e = l.e; html += `<div class="etp">Étape ${e} <span>· ${ETAPES[e - 1]}</span></div>`; } html += ligne(l, li, false); });
  document.getElementById("suiviListe").innerHTML = html;
}
function peindreLecons() {
  let html = `<div class="p">${COURS.length} leçons dans un ordre imposé. <b>Une leçon se valide toute seule en trajet</b> quand huit mots sur dix sont solides.</div>`, e = 0;
  COURS.forEach((l, li) => { if (l.e !== e) { e = l.e; html += `<div class="etp">Étape ${e} <span>· ${ETAPES[e - 1]}</span></div>`; } html += ligne(l, li, true); });
  document.getElementById("lecons").innerHTML = html;
}
function peindreDialogues() {
  const et = etapeAtteinte();
  document.getElementById("dialogues").innerHTML = DIALOGUES.map((d, k) => {
    const ouvert = d.e <= et;
    return `<div class="dlg"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px">
      <div><div class="lct">${d.t}</div><div class="lcm">Étape ${d.e}</div></div>
      ${ouvert ? `<button class="mn" data-dial="${k}">Écouter</button>` : `<span class="badge">Verrouillé</span>`}</div>
      ${ouvert ? d.l.map(r => `<div class="rep"><div class="qui">${r.q}</div><div class="txt">
        <div class="lbx">${r.lb}</div><div class="frx">${r.fr}</div></div></div>`).join("") : ""}</div>`;
  }).join("");
}
function racine(lb) { return lb.replace(/^(ech|du|hie|hien|si|mir|dir|Dir|d'|de |den |e |eng )\s*/i, "").split(/[ ,?…]/)[0].replace(/^d'/, ""); }
function fiche(it) {
  const n = niv(it.cle);
  const st = n >= 4 ? '<div class="fst ok">Solide</div>' : (n > 0 ? '<div class="fst">En cours</div>' : '<div class="fst">Pas encore vu</div>');
  const fav = !!favoris[it.cle];
  return `<div class="f"><div class="fb"><div class="flb">${echapper(it.lb)}</div><div class="fph">${echapper(it.ph)}</div>
   <div class="ffr">${echapper(it.fr)}</div>${it.tr ? `<div class="ftr">Astuce : ${echapper(it.tr)}</div>` : ""}${st}</div>
   <div style="display:flex;gap:5px"><button class="fav ${fav ? "on" : ""}" data-fav="${it.cle}" aria-label="${fav ? "Retirer des favoris" : "Ajouter aux favoris"}" title="Favori">★</button><button class="mn" data-d="${encodeURIComponent(it.lb)}">Écouter</button>
   <a class="mn" href="https://lod.lu/search?q=${encodeURIComponent(racine(it.lb))}" target="_blank" rel="noopener">lod.lu</a></div></div>`;
}
function ouvrir(li) {
  const l = COURS[li];
  document.getElementById("lecons").style.display = "none";
  const d = document.getElementById("detail"); d.style.display = "block";
  d.innerHTML = `<button class="ret" id="ret">← Toutes les leçons</button>
   <div class="h">${String(li + 1).padStart(2, "0")} · ${l.t}</div><div class="ng">${l.note}</div>
   ${l.i.map(fiche).join("")}<button class="go" style="margin-top:18px" data-test="${li}">Test écrit · à l'arrêt</button>`;
  document.getElementById("ret").onclick = () => { d.style.display = "none"; document.getElementById("lecons").style.display = "block"; };
  window.scrollTo(0, 0);
}
function peindreLex(f = "") {
  const q = normaliserRecherche(f || "");
  let l = ITEMS.filter(i => !q || normaliserRecherche(i.lb).includes(q) || normaliserRecherche(i.fr).includes(q));
  if (filtreLex === "revoir") l = l.filter(i => niv(i.cle) > 0 && due(i.cle) <= auj());
  if (filtreLex === "solides") l = l.filter(i => niv(i.cle) >= 4);
  if (filtreLex === "favoris") l = l.filter(i => favoris[i.cle]);
  document.getElementById("lexique").innerHTML = l.map(fiche).join("") || `<div class="p">Aucun résultat.</div>`;
}
function normaliserRecherche(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/* ---------- voix ---------- */
let VOIX = [], vDe = null, vFr = null;
function chargerVoix() {
  if (!("speechSynthesis" in window)) return;
  VOIX = speechSynthesis.getVoices() || []; if (!VOIX.length) return;
  const lb = VOIX.filter(v => /^lb/i.test(v.lang));
  const de = VOIX.filter(v => /^de/i.test(v.lang));
  const lux = [...lb, ...de.filter(v => !lb.some(x => x.name === v.name))];
  const fr = VOIX.filter(v => /^fr/i.test(v.lang));
  const sd = document.getElementById("selDe"), sf = document.getElementById("selFr");
  sd.innerHTML = lux.length ? lux.map(v => `<option value="${echapper(v.name)}">${/^lb/i.test(v.lang) ? "Lëtzebuergesch · " : "Allemand · "}${echapper(v.name)}</option>`).join("") : `<option value="">Aucune voix compatible installée</option>`;
  sf.innerHTML = fr.length ? fr.map(v => `<option value="${echapper(v.name)}">${echapper(v.name)}</option>`).join("") : `<option value="">Aucune voix française installée</option>`;
  if (reg.vDe && lux.some(v => v.name === reg.vDe)) sd.value = reg.vDe; else if (lux.length) reg.vDe = sd.value = lux[0].name;
  if (reg.vFr && fr.some(v => v.name === reg.vFr)) sf.value = reg.vFr; else if (fr.length) reg.vFr = sf.value = fr[0].name;
  vDe = VOIX.find(v => v.name === reg.vDe) || lux[0] || null;
  vFr = VOIX.find(v => v.name === reg.vFr) || fr[0] || null;
}
if ("speechSynthesis" in window) { chargerVoix(); speechSynthesis.onvoiceschanged = chargerVoix; }
const pourDe = t => t.replace(/ë/g, "ä").replace(/Ë/g, "Ä").replace(/é/g, "e").replace(/É/g, "E").replace(/à/g, "a");
function dire(t, lg, mult, pitchMult) {
  return new Promise(r => {
    if (!("speechSynthesis" in window)) { setTimeout(r, 500); return; }
    try {
      const vraieLb = lg === "de" && vDe && /^lb/i.test(vDe.lang || "");
      const texte = lg === "de" && !vraieLb ? pourDe(t) : t;
      const u = new SpeechSynthesisUtterance(texte);
      if (lg === "de") {
        u.lang = vraieLb ? (vDe.lang || "lb-LU") : "de-DE";
        if (vDe) u.voice = vDe;
        u.rate = Math.max(.25, reg.vit * (mult || 1));
      } else {
        u.lang = "fr-FR"; if (vFr) u.voice = vFr;
        u.rate = Math.min(1.15, reg.vit + 0.4) * (mult || 1);
      }
      u.pitch = Math.max(0.1, Math.min(2, reg.int * (pitchMult || 1)));
      let fini = false, timer = null;
      const fin = () => { if (!fini) { fini = true; if (timer) clearTimeout(timer); r(); } };
      u.onend = fin;
      u.onerror = e => { logErreur("synthèse vocale", e.error || "erreur"); fin(); };
      try { speechSynthesis.resume(); } catch (_) {}
      speechSynthesis.speak(u);
      const vitesse = Math.max(.3, u.rate || .7);
      timer = setTimeout(fin, Math.max(3500, texte.length * 180 / vitesse));
    } catch (e) { logErreur("dire", e); setTimeout(r, 300); }
  });
}

/* ---------- micro ---------- */
let micStream = null, micErreur = "", recoOk = null;
async function ouvrirMicro() {
  if (micStream) return true;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { micErreur = "API micro absente de ce navigateur."; return false; }
  try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); micErreur = ""; return true; }
  catch (e) {
    const n = e && e.name ? e.name : "";
    if (dansCadre) micErreur = "Page dans un aperçu intégré, le micro y est bloqué.";
    else if (!secure) micErreur = "Page non servie en HTTPS, le navigateur refuse le micro.";
    else if (n === "NotAllowedError") micErreur = "Autorisation refusée. Ouvre les réglages du site et autorise le micro.";
    else if (n === "NotFoundError") micErreur = "Aucun micro détecté.";
    else micErreur = "Refus du navigateur (" + (n || "inconnu") + ").";
    return false;
  }
}
function fermerMicro() {
  if (!micStream) return;
  try { micStream.getTracks().forEach(t => t.stop()); } catch (_) {}
  micStream = null;
}
function enregistrer(ms) {
  return new Promise(r => {
    if (!micStream || typeof MediaRecorder === "undefined") { setTimeout(() => r(null), ms); return; }
    let mr, mor = [];
    try { mr = new MediaRecorder(micStream); } catch (e) { setTimeout(() => r(null), ms); return; }
    mr.ondataavailable = e => { if (e.data && e.data.size) mor.push(e.data); };
    mr.onstop = () => { try { r(mor.length ? new Blob(mor, { type: mr.mimeType || "audio/webm" }) : null); } catch (e) { r(null); } };
    try { mr.start(); } catch (e) { setTimeout(() => r(null), ms); return; }
    setTimeout(() => { try { if (mr.state !== "inactive") mr.stop(); } catch (e) { r(null); } }, ms);
  });
}
function jouerBlob(b) {
  return new Promise(r => {
    if (!b) { r(); return; }
    try {
      const u = URL.createObjectURL(b), a = new Audio(u); let fini = false;
      const fin = () => { if (fini) return; fini = true; try { URL.revokeObjectURL(u); } catch (_) {} r(); };
      a.onended = fin; a.onerror = fin;
      a.play().catch(e => { logErreur("lecture écho", e); fin(); });
      setTimeout(fin, 9000);
    } catch (e) { logErreur("jouerBlob", e); r(); }
  });
}
let recoDerniereErreur = "";
function ecouter(ms, langue) {
  return new Promise(r => {
    if (!RECO) { r(null); return; }
    let rec; try { rec = new RECO(); } catch (e) { logErreur("reconnaissance init", e); r(null); return; }
    rec.lang = langue || (vDe && /^lb/i.test(vDe.lang || "") ? "lb-LU" : "de-DE");
    rec.interimResults = false; rec.maxAlternatives = 3; recoDerniereErreur = "";
    let fini = false, res = null;
    const stop = () => { if (fini) return; fini = true; try { rec.stop(); } catch (_) {} r(res); };
    rec.onresult = e => { try { res = e.results[0][0].transcript; } catch (x) { logErreur("reconnaissance résultat", x); } stop(); };
    rec.onerror = e => { recoDerniereErreur = e.error || "erreur"; if (!/no-speech|aborted/.test(recoDerniereErreur)) logErreur("reconnaissance", recoDerniereErreur); stop(); };
    rec.onend = () => stop();
    try { rec.start(); } catch (e) { recoDerniereErreur = e.name || "start"; logErreur("reconnaissance démarrage", e); r(null); return; }
    setTimeout(stop, ms);
  });
}
function normaliser(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z ]/g, "").replace(/sch/g, "ch").replace(/ck/g, "k")
    .replace(/w/g, "v").replace(/z/g, "ts").replace(/(.)\1+/g, "$1").trim();
}
function distance(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let p = Array.from({ length: n + 1 }, (_, j) => j), c = new Array(n + 1);
  for (let i = 1; i <= m; i++) { c[0] = i; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); [p, c] = [c, p]; }
  return p[n];
}

/* ---------- moteur de séance ---------- */
let plan = [], idx = 0, pause = false, actif = false, jt = 0, duree = 20, t0 = 0, verrou = null, derPause = 0;
let scoreOk = 0, scoreTotal = 0, modeActif = "normal", solidesDebut = 0, dueDebut = 0;
const melange = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const attente = it => Math.max(2500, reg.tps - (niv(it.cle) >= 3 ? 1200 : 0));

function proches(it) {
  const meme = ITEMS.filter(x => x.lecon === it.lecon && x.cle !== it.cle);
  let best = null, bd = 1e9;
  meme.forEach(x => { const d = distance(normaliser(x.lb), normaliser(it.lb)); if (d < bd) { bd = d; best = x; } });
  return (best && bd <= 4) ? best : null;
}
function morceaux(lb) {
  const m = lb.replace(/[?…]/g, "").split(" ").filter(Boolean);
  if (m.length < 3) return null;
  const out = []; for (let k = m.length - 1; k >= 0; k--) out.push(m.slice(k).join(" "));
  return out;
}
function construire(minutes, mode) {
  const slots = Math.max(6, Math.round(minutes * 60 / 14));
  const p = new Array(slots).fill(null);
  const poser = (i, e) => { let k = Math.max(0, i); while (k < slots && p[k]) k++; if (k < slots) { p[k] = e; return k; } return -1; };
  const li = leconCourante();
  const dus = melange(ITEMS.filter(i => niv(i.cle) > 0 && niv(i.cle) < 5 && due(i.cle) <= auj()));
  const hier = ITEMS.filter(i => prog[i.cle] && prog[i.cle].jour === auj() - JOUR);
  const fragiles = dus.filter(i => niv(i.cle) < 3);
  const durs = ITEMS.filter(i => niv(i.cle) >= 4);
  const neufs = (mode === "normal") ? ITEMS.filter(i => i.lecon === li && niv(i.cle) === 0).slice(0, minutes >= 60 ? 7 : minutes >= 40 ? 6 : minutes >= 20 ? 4 : 2) : [];

  if (mode === "jeu") {
    const pool = [...dus, ...durs]; if (!pool.length) pool.push(...ITEMS.slice(0, 10));
    poser(0, { type: "note", fr: "Jeu rapide. Je dis une phrase en français, tu réponds en luxembourgeois le plus vite possible. Score à la fin." });
    melange(pool).slice(0, slots - 2).forEach((it, n) => poser(1 + n, { type: "production", it, rapide: true }));
    poser(slots - 1, { type: "bilan" });
    return p.filter(Boolean);
  }
  if (mode === "nombres") {
    const nums = ITEMS.filter(i => i.lecon <= 3 && niv(i.cle) > 0);
    const pool = nums.length ? nums : ITEMS.filter(i => i.lecon <= 3);
    poser(0, { type: "note", fr: "Entraînement aux chiffres. Je dis un nombre en luxembourgeois, tu dis le chiffre en français à voix haute." });
    melange(pool.concat(pool, pool)).slice(0, slots - 2).forEach((it, n) => poser(1 + n, { type: "chiffre", it }));
    poser(slots - 1, { type: "bilan" });
    return p.filter(Boolean);
  }
  if (mode === "libre") {
    const pool = ITEMS.filter(i => niv(i.cle) > 0);
    const src = pool.length ? pool : ITEMS.slice(0, 30);
    poser(0, { type: "note", fr: "Écoute libre. Rien à faire, rien à dire. Laisse simplement passer les mots." });
    melange(src).forEach((it, n) => { if (n < slots - 2) poser(1 + n, { type: "libre", it }); });
    poser(slots - 1, { type: "bilan" });
    return p.filter(Boolean);
  }
  if (mode === "revision") {
    poser(0, { type: "note", fr: "Séance du retour. On consolide ce que tu as vu aujourd'hui, puis ce qui est fragile." });
    const duJour = ITEMS.filter(i => prog[i.cle] && prog[i.cle].jour === auj());
    let n = 1;
    melange([...duJour, ...fragiles]).forEach(it => { poser(n, { type: reg.comp ? "ecoute" : "production", it }); poser(n + 7, { type: "production", it }); n += 2; });
    const dlg = DIALOGUES.filter(d => d.e <= etapeAtteinte());
    if (dlg.length) poser(Math.round(slots * 0.6), { type: "dialogue", d: dlg[Math.floor(Math.random() * dlg.length)] });
    const reste = [...dus, ...durs]; let k = 0;
    for (let i = 0; i < slots - 1; i++) if (!p[i] && reste.length) { const it = reste[k % reste.length]; k++; p[i] = { type: k % 3 === 0 ? "production" : "ecoute", it }; }
    poser(slots - 1, { type: "bilan" });
    return p.filter(Boolean);
  }
  /* mode normal */
  poser(0, { type: "note", fr: "Leçon " + (li + 1) + ". " + COURS[li].t + ". Objectif du jour : " + neufs.length + " nouvelles expressions et " + Math.min(dus.length, 20) + " rappels." });
  if (hier.length) {
    poser(1, { type: "note", fr: "D'abord, on reprend ce que tu as vu hier. C'est cette reprise qui fixe la mémoire." });
    melange(hier).slice(0, 6).forEach((it, n) => poser(2 + n, { type: "production", it }));
  }
  fragiles.slice(0, 4).forEach((it, n) => poser(3 + n * 2, { type: reg.comp ? "ecoute" : "production", it }));
  neufs.forEach((it, n) => {
    const base = poser(9 + n * 5, { type: "decouverte", it });
    const mo = morceaux(it.lb); if (mo) poser(base + 1, { type: "construction", it, mo });
    const pr = proches(it); if (pr && n % 2 === 0) poser(base + 6, { type: "discrimination", it, autre: pr });
    [3, 11, 24, 48].forEach((d, k) => poser(base + d, { type: (reg.comp && k % 2 === 0) ? "ecoute" : "production", it }));
  });
  let j = 0;
  dus.forEach(it => {
    poser(Math.round(slots * 0.35) + j * 3, { type: niv(it.cle) < 2 ? "decouverte" : (reg.comp ? "ecoute" : "production"), it });
    poser(Math.round(slots * 0.35) + j * 3 + 18, { type: "production", it }); j++;
  });
  const dlg = DIALOGUES.filter(d => d.e <= etapeAtteinte());
  if (dlg.length && slots > 20) poser(Math.round(slots * 0.75), { type: "dialogue", d: dlg[Math.floor(Math.random() * dlg.length)] });
  const reste = [...durs, ...dus, ...neufs]; let k = 0;
  for (let i = 0; i < slots - 1; i++) if (!p[i] && reste.length) { const it = reste[k % reste.length]; k++; p[i] = { type: reg.comp ? (k % 3 === 0 ? "production" : "ecoute") : (k % 3 === 0 ? "ecoute" : "production"), it }; }
  fragiles.slice(0, 3).forEach((it, n) => { p[Math.max(0, slots - 2 - n)] = { type: "production", it }; });
  poser(slots - 1, { type: "bilan" });
  return p.filter(Boolean);
}
const dormir = ms => new Promise(r => { const d = Date.now(); (function t() { if (!actif) return r(); if (pause) return setTimeout(t, 120); if (Date.now() - d >= ms) return r(); setTimeout(t, 80); })(); });
function compte(ms) {
  const el = document.getElementById("anav"), c = 2 * Math.PI * 31; el.style.strokeDasharray = c; const d = Date.now();
  (function t() { if (!actif) return; if (pause) return setTimeout(t, 120); const p = Math.min(1, (Date.now() - d) / ms); el.style.strokeDashoffset = c * p; if (p < 1) requestAnimationFrame(t); })();
}
function bn(m) { const b = document.getElementById("bn"); b.textContent = m; b.classList.add("on"); setTimeout(() => b.classList.remove("on"), 7000); }
function vider() {
  ["cs", "lb", "phx", "fr", "ent"].forEach(i => { const e = document.getElementById(i); e.textContent = ""; e.classList.remove("on"); });
  document.getElementById("an").classList.remove("on"); document.getElementById("micro").classList.remove("on");
}
function show(i, t) { const e = document.getElementById(i); if (t !== undefined) e.textContent = t; e.classList.add("on"); }
function phase(t, c) { const e = document.getElementById("ph"); e.textContent = t; e.className = "ph" + (c ? " " + c : ""); }
function maj() {
  document.getElementById("lblT").textContent = Math.min(duree, Math.round((Date.now() - t0) / 60000)) + " / " + duree + " min";
  document.getElementById("pist").style.width = (idx / plan.length * 100) + "%";
  document.getElementById("lblB").textContent = (idx + 1) + " sur " + plan.length;
}
async function tourDeParole(attendu, ms) {
  show("micro");
  let blob = null, dit = null;
  if (reg.cor && RECO) dit = await ecouter(ms, vDe && /^lb/i.test(vDe.lang || "") ? "lb-LU" : "de-DE");
  else if (reg.echo) {
    if (!micStream) await ouvrirMicro();
    if (micStream) blob = await enregistrer(ms); else await dormir(ms);
  } else await dormir(ms);
  document.getElementById("micro").classList.remove("on");
  if (blob) { phase("Ta voix", "or"); await jouerBlob(blob); return null; }
  if (!dit) return null;
  show("ent", "Entendu : " + dit);
  await dire("J'ai entendu : " + dit, "fr");
  const a = normaliser(attendu), b = normaliser(dit);
  const sim = 1 - distance(a, b) / Math.max(a.length, b.length, 1);
  scoreTotal++;
  if (sim > 0.7) { scoreOk++; phase("C'est ça", "on"); await dire("C'est ça.", "fr"); }
  else if (sim > 0.4) { phase("Presque"); await dire("Presque.", "fr"); }
  else { phase("Pas encore", "ko"); await dire("Pas encore. Écoute bien.", "fr"); }
  return sim;
}
async function peutEtrePause() {
  if (Date.now() - derPause < 300000) return;
  derPause = Date.now();
  vider(); phase("Silence", "or");
  show("cs", "Dix secondes de silence. Ne dis rien, laisse reposer.");
  await dire("Dix secondes de silence. Laisse reposer.", "fr");
  await dormir(10000);
}
async function demarrer(mode) {
  if (actif) return;
  modeActif = mode;
  duree = (mode === "jeu") ? 5 : parseInt(document.querySelector('.d[aria-pressed="true"]').dataset.m, 10);
  plan = construire(duree, mode); idx = 0; actif = true; pause = false; t0 = Date.now(); derPause = Date.now(); jt++; scoreOk = 0; scoreTotal = 0;
  solidesDebut = solides(); dueDebut = aRevoirAuj();
  document.getElementById("cd").classList.add("on");
  document.getElementById("bPau").textContent = "Pause";
  const noms = { jeu: "Jeu", revision: "Retour", nombres: "Chiffres", libre: "Écoute libre" };
  document.getElementById("etat").textContent = noms[mode] || ("Séance " + ((jr.seances || 0) + 1));
  if (!("speechSynthesis" in window)) bn("Voix indisponible sur ce navigateur.");
  else if (!vDe) bn("Aucune voix Lëtzebuergesch ou allemande trouvée. Onglet Voix et micro.");
  if (reg.cor && !RECO && mode !== "libre") bn("Reconnaissance vocale non supportée. L'écho reste disponible.");
  if (reg.echo && mode !== "libre") { const ok = await ouvrirMicro(); if (!ok) bn("Écho vocal inactif : " + micErreur); }
  try { if ("wakeLock" in navigator) verrou = await navigator.wakeLock.request("screen"); } catch (e) { logErreur("wake lock", e); }
  await dire(mode === "libre" ? "Écoute libre. Rien à faire." : "On commence. Pose le téléphone. Réponds toujours à voix haute.", "fr");
  boucle(jt).catch(e => { logErreur("boucle séance", e); bn("Une erreur a interrompu la séance."); terminer(); });
}
async function boucle(mj) {
  while (actif && mj === jt && idx < plan.length) {
    const ex = plan[idx]; maj(); vider();
    const stop = () => !actif || mj !== jt;
    if (ex.type !== "bilan" && ex.type !== "libre") await peutEtrePause();
    if (stop()) return;
    vider();

    if (ex.type === "note") {
      phase("Explication"); show("cs", ex.fr); await dire(ex.fr, "fr"); if (stop()) return; await dormir(400);
    }
    if (ex.type === "libre") {
      const it = ex.it;
      phase("Écoute libre");
      show("lb", it.lb); show("phx", it.ph);
      await dire(it.lb, "de"); if (stop()) return;
      show("fr", it.fr); await dire(it.fr, "fr"); if (stop()) return;
      await dire(it.lb, "de"); if (stop()) return;
      await dormir(600);
    }
    if (ex.type === "decouverte") {
      const it = ex.it, premier = niv(it.cle) === 0;
      phase("Écoute"); show("lb", it.lb); show("phx", it.ph);
      await dire(it.lb, "de"); if (stop()) return; await dormir(250);
      await dire(it.lb, "de", 0.85); if (stop()) return;
      phase("Sens"); show("fr", it.fr); await dire(it.fr, "fr"); if (stop()) return;
      if (premier && reg.truc && it.tr) { phase("Astuce", "or"); show("cs", "Astuce : " + it.tr); await dire("Astuce. " + it.tr, "fr"); if (stop()) return; }
      phase("Répète à voix haute", "on"); show("an"); compte(attente(it));
      const sim = await tourDeParole(it.lb, attente(it)); if (stop()) return;
      document.getElementById("an").classList.remove("on");
      phase("Le modèle"); await dire(it.lb, "de"); if (stop()) return;
      noter(it.cle, sim === null ? null : (sim > 0.7 ? "ok" : null)); await dormir(250);
    }
    if (ex.type === "construction") {
      const it = ex.it;
      phase("On construit", "or");
      await dire("On monte la phrase par la fin. Répète après moi.", "fr"); if (stop()) return;
      for (const m of ex.mo) {
        if (stop()) return;
        show("lb", m); await dire(m, "de"); if (stop()) return;
        show("an"); compte(2600); await dormir(2600); document.getElementById("an").classList.remove("on");
      }
      show("fr", it.fr); await dire(it.fr, "fr"); if (stop()) return;
      noter(it.cle, null); await dormir(250);
    }
    if (ex.type === "discrimination") {
      const a = ex.it, b = ex.autre, prem = Math.random() < 0.5 ? a : b, sec = prem === a ? b : a;
      phase("Deux mots proches", "or"); show("cs", "Lequel veut dire : " + a.fr + " ?");
      await dire("Écoute les deux mots, puis dis un ou deux.", "fr"); if (stop()) return;
      show("lb", "1"); await dire("Un.", "fr"); await dire(prem.lb, "de"); if (stop()) return;
      show("lb", "2"); await dire("Deux.", "fr"); await dire(sec.lb, "de"); if (stop()) return;
      show("lb", ""); await dire("Lequel veut dire : " + a.fr, "fr"); if (stop()) return;
      show("an"); compte(3200); show("micro");
      let rep = null;
      if (reg.cor && RECO && micStream) rep = await ecouter(3200, "fr-FR"); else await dormir(3200);
      document.getElementById("micro").classList.remove("on"); document.getElementById("an").classList.remove("on");
      const bon = (prem === a) ? 1 : 2;
      if (rep) {
        const n = normaliser(rep); const d = /(un|premier|1)/.test(n) ? 1 : (/(deux|deuxieme|second|2)/.test(n) ? 2 : 0);
        scoreTotal++;
        if (d === bon) { scoreOk++; phase("Exact", "on"); await dire("Exact.", "fr"); }
        else { phase("Non", "ko"); await dire("Non. C'était le " + (bon === 1 ? "premier" : "deuxième") + ".", "fr"); }
      } else await dire("C'était le " + (bon === 1 ? "premier" : "deuxième") + ".", "fr");
      if (stop()) return;
      show("lb", a.lb); show("fr", a.fr); await dire(a.lb, "de"); if (stop()) return;
      noter(a.cle, null); await dormir(250);
    }
    if (ex.type === "production") {
      const it = ex.it, ms = ex.rapide ? Math.max(3000, reg.tps - 1500) : attente(it);
      phase("À toi", "on"); show("cs", "Comment dis-tu : " + it.fr + " ?");
      await dire((ex.rapide ? "" : "Comment dis-tu : ") + it.fr, "fr"); if (stop()) return;
      show("an"); compte(ms);
      const sim = await tourDeParole(it.lb, ms); if (stop()) return;
      document.getElementById("an").classList.remove("on");
      phase("Réponse"); show("lb", it.lb); show("phx", it.ph);
      await dire(it.lb, "de"); if (stop()) return;
      if (!ex.rapide) { await dormir(800); await dire(it.lb, "de", 0.9); }
      noter(it.cle, sim === null ? null : (sim > 0.7 ? "ok" : null)); await dormir(200);
    }
    if (ex.type === "chiffre") {
      const it = ex.it;
      phase("Quel chiffre ?", "on"); show("lb", it.lb);
      await dire(it.lb, "de"); if (stop()) return;
      show("an"); compte(3000); show("micro");
      let rep = null;
      if (reg.cor && RECO && micStream) rep = await ecouter(3000, "fr-FR"); else await dormir(3000);
      document.getElementById("micro").classList.remove("on"); document.getElementById("an").classList.remove("on");
      if (rep) {
        show("ent", "Entendu : " + rep);
        const juste = normaliser(rep).includes(normaliser(it.fr));
        scoreTotal++;
        if (juste) { scoreOk++; phase("Exact", "on"); await dire("Exact.", "fr"); }
        else { phase("Non", "ko"); await dire("Non. C'était " + it.fr + ".", "fr"); }
        noter(it.cle, juste ? "ok" : null);
      } else { phase("Réponse"); await dire("C'était " + it.fr + ".", "fr"); noter(it.cle, null); }
      if (stop()) return;
      show("fr", it.fr); await dire(it.lb, "de"); if (stop()) return; await dormir(200);
    }
    if (ex.type === "ecoute") {
      const it = ex.it;
      phase("Qu'est-ce que ça veut dire ?", "on"); show("lb", it.lb);
      await dire(it.lb, "de"); if (stop()) return;
      show("an"); compte(3400); await dormir(3400); if (stop()) return;
      document.getElementById("an").classList.remove("on");
      phase("Sens"); show("fr", it.fr); show("phx", it.ph);
      await dire(it.fr, "fr"); if (stop()) return; await dire(it.lb, "de"); if (stop()) return;
      noter(it.cle, null); await dormir(200);
    }
    if (ex.type === "dialogue") {
      const d = ex.d;
      phase("Conversation", "or"); show("cs", "Écoute la conversation. Deux personnes.");
      await dire("Écoute cette conversation entre deux personnes. Essaie de saisir le sens général.", "fr"); if (stop()) return;
      for (const r of d.l) {
        if (stop()) return;
        vider(); show("cs", r.q); show("lb", r.lb);
        await dire(r.lb, "de", 1, r.q === "A" ? 0.85 : 1.2); if (stop()) return;
        await dormir(500);
      }
      vider(); phase("Le sens"); show("cs", "On reprend, avec la traduction.");
      await dire("On reprend, avec la traduction.", "fr"); if (stop()) return;
      for (const r of d.l) {
        if (stop()) return;
        vider(); show("lb", r.lb); show("fr", r.fr);
        await dire(r.lb, "de", 1, r.q === "A" ? 0.85 : 1.2); if (stop()) return;
        await dire(r.fr, "fr"); if (stop()) return;
      }
      await dormir(400);
    }
    if (ex.type === "bilan") {
      let valide = false; COURS.forEach((l, li) => { if (verifierValidation(li)) valide = true; });
      let txt = "Séance terminée. ";
      if (scoreTotal) txt += "Tu as répondu juste " + scoreOk + " fois sur " + scoreTotal + ". ";
      txt += solides() + " expressions sont solides. ";
      if (valide) txt += "Une leçon vient d'être validée, la suivante est débloquée. ";
      txt += "Demain, je te ferai reprendre ce que tu as vu aujourd'hui. À demain.";
      phase("Bilan", "or"); show("cs", txt); await dire(txt, "fr"); if (stop()) return; await dormir(500);
    }
    idx++;
    if ((Date.now() - t0) / 60000 >= duree && plan[idx] && plan[idx].type !== "bilan") idx = plan.length - 1;
  }
  if (actif && mj === jt) terminer();
}
function noter(c, j) {
  const p = prog[c] || { n: 0, vu: 0, due: 0, jour: 0 };
  p.vu++; p.jour = auj();
  if (j === "ok") p.n = Math.min(6, p.n + 2);
  else if (j === "ko") p.n = Math.max(0, p.n - 1);
  else p.n = Math.min(6, p.n + (p.vu % 2 === 0 ? 1 : 0));
  p.due = auj() + INTERVALLES[Math.min(p.n, INTERVALLES.length - 1)] * JOUR;
  prog[c] = p;
}
async function terminer() {
  if (!actif && !document.getElementById("cd").classList.contains("on")) return;
  actif = false; jt++;
  try { speechSynthesis.cancel(); } catch (_) {}
  try { if (verrou) { await verrou.release(); verrou = null; } } catch (e) { logErreur("wake lock release", e); }
  fermerMicro();
  COURS.forEach((l, li) => verifierValidation(li));
  const mins = Math.max(0, Math.min(duree, (Date.now() - t0) / 60000));
  const d = new Date().toLocaleDateString("fr-FR"), key = jourCle();
  if (mins >= 0.5) {
    if (jr.dernierKey !== key) {
      const h = new Date(); h.setDate(h.getDate() - 1);
      jr.serie = (jr.dernierKey === jourCle(h)) ? (jr.serie || 0) + 1 : 1;
    }
    if (!jr.hist) jr.hist = {};
    jr.hist[auj()] = Number(jr.hist[auj()] || 0) + mins;
    Object.keys(jr.hist).forEach(k => { if (/^\d+$/.test(k) && auj() - Number(k) > 90 * JOUR) delete jr.hist[k]; });
    jr.seances = (jr.seances || 0) + 1;
    jr.minutes = (jr.minutes || 0) + mins;
    jr.dernier = d; jr.dernierKey = key;
    await sauver();
  }
  document.getElementById("cd").classList.remove("on");
  peindre();
  afficherBilan(mins);
}
function afficherBilan(mins) {
  if (!$("sum")) return;
  $("sumMin").textContent = mins < 1 ? "< 1 min" : `${Math.round(mins)} min`;
  $("sumScore").textContent = scoreTotal ? `${scoreOk}/${scoreTotal}` : "—";
  $("sumSolides").textContent = String(solides());
  $("sumDue").textContent = String(aRevoirAuj());
  const gain = solides() - solidesDebut;
  const objectif = Math.max(5, Number(reg.obj) || 20);
  const reste = Math.max(0, objectif - minutesAuj());
  let msg = gain > 0 ? `${gain} expression${gain > 1 ? "s" : ""} consolidée${gain > 1 ? "s" : ""}. ` : "";
  msg += reste > 0 ? `Il reste environ ${Math.ceil(reste)} min pour atteindre l'objectif du jour.` : "Objectif quotidien atteint.";
  $("sumMsg").textContent = msg;
  $("sum").classList.add("on");
}

/* ---------- test écrit ---------- */
let qz = { li: 0, q: [], n: 0, bon: 0 };
function lancerTest(li) {
  const its = ITEMS.filter(i => i.lecon === li), autres = ITEMS.filter(i => i.lecon !== li);
  qz = { li, n: 0, bon: 0, q: melange(its).slice(0, 10).map(it => ({ it, opts: melange([it.fr, ...melange(autres).slice(0, 3).map(x => x.fr)]) })) };
  document.getElementById("qz").classList.add("on");
  document.getElementById("qzTitre").textContent = "Test · " + COURS[li].t;
  questionSuivante();
}
function questionSuivante() {
  const c = document.getElementById("qzCorps");
  if (qz.n >= qz.q.length) {
    const pc = Math.round(qz.bon / qz.q.length * 100), ok = pc >= 80;
    if (ok) valides[qz.li] = true; sauver();
    c.innerHTML = `<div class="qz-r"><div class="sc">${pc}%</div>
     <div class="p" style="margin-top:14px">${ok ? "Leçon validée." : "Il manque un peu. Retravaille-la en trajet."}</div>
     <button class="go" id="qzFin">Fermer</button></div>`;
    document.getElementById("qzFin").onclick = fermerTest; return;
  }
  const q = qz.q[qz.n];
  c.innerHTML = `<div class="qz-q">${q.it.lb}</div><div class="qz-p">Question ${qz.n + 1} sur ${qz.q.length}</div>
   ${q.opts.map((o, k) => `<button class="qz-o" data-o="${k}">${o}</button>`).join("")}`;
  dire(q.it.lb, "de");
  c.querySelectorAll(".qz-o").forEach(b => b.onclick = () => {
    const choix = q.opts[parseInt(b.dataset.o, 10)], juste = choix === q.it.fr;
    if (juste) { qz.bon++; b.classList.add("bon"); noter(q.it.cle, "ok"); }
    else {
      b.classList.add("faux"); noter(q.it.cle, "ko");
      c.querySelectorAll(".qz-o").forEach(x => { if (x.textContent === q.it.fr) x.classList.add("bon"); });
    }
    c.querySelectorAll(".qz-o").forEach(x => x.onclick = null);
    setTimeout(() => { qz.n++; questionSuivante(); }, juste ? 600 : 1500);
  });
}
function fermerTest() { document.getElementById("qz").classList.remove("on"); peindre(); }

/* ---------- écoute d'un dialogue depuis l'onglet ---------- */
async function jouerDialogue(k) {
  const d = DIALOGUES[k];
  for (const r of d.l) { await dire(r.lb, "de", 1, r.q === "A" ? 0.85 : 1.2); }
}

/* ---------- diagnostic ---------- */
async function etatPermissionMicro() {
  if (!navigator.permissions || !navigator.permissions.query) return "inconnue";
  try { const p = await navigator.permissions.query({ name: "microphone" }); return p.state || "inconnue"; }
  catch (_) { return "inconnue"; }
}
async function diagnostic() {
  const d = $("diag"), l = [];
  d.innerHTML = "Test en cours…"; chargerVoix();
  const ok = t => `<span class="ok">${echapper(t)}</span>`, ko = t => `<span class="ko">${echapper(t)}</span>`, or = t => `<span class="or">${echapper(t)}</span>`;
  l.push(`<b>Application</b> : ${ok("V" + APP_VERSION + " · " + BUILD)}`);
  l.push(`<b>Adresse</b> : ${echapper(location.protocol + "//" + location.host)} · ${secure ? ok("contexte sécurisé") : ko("contexte non sécurisé")}`);
  l.push(`<b>Connexion</b> : ${navigator.onLine ? ok("en ligne") : or("hors ligne")}`);
  l.push(`<b>Installation</b> : ${estInstallee() ? ok("application installée") : or("ouverte dans le navigateur")}`);
  let stockage = false;
  try { localStorage.setItem("lux:test", "1"); stockage = localStorage.getItem("lux:test") === "1"; localStorage.removeItem("lux:test"); } catch (_) {}
  l.push(`<b>Stockage progression</b> : ${stockage ? ok("fonctionne") : ko("indisponible")}`);
  l.push(`<b>Service worker</b> : ${("serviceWorker" in navigator) ? (navigator.serviceWorker.controller ? ok("actif") : or("supporté, pas encore contrôlé")) : ko("non supporté")}`);
  l.push(`<b>Synthèse vocale</b> : ${("speechSynthesis" in window) ? ok("disponible") : ko("absente")}`);
  l.push(`<b>Voix Lëtzebuergesch</b> : ${vDe ? ok((/^lb/i.test(vDe.lang || "") ? "native · " : "approximation allemande · ") + vDe.name) : ko("aucune voix compatible")}`);
  l.push(`<b>Voix française</b> : ${vFr ? ok(vFr.name) : ko("aucune")}`);
  const perm = await etatPermissionMicro();
  l.push(`<b>Permission micro</b> : ${perm === "granted" ? ok("autorisée") : perm === "denied" ? ko("refusée") : or(perm)}`);
  d.innerHTML = l.join("<br>");

  const mic = await ouvrirMicro();
  l.push(`<b>Micro</b> : ${mic ? ok("accessible") : ko(micErreur || "indisponible")}`);
  l.push(`<b>Enregistrement local</b> : ${typeof MediaRecorder !== "undefined" ? ok("supporté") : ko("non supporté")}`);
  l.push(`<b>Reconnaissance vocale</b> : ${RECO ? or("supportée, test à venir") : ko("non supportée par ce navigateur")}`);
  d.innerHTML = l.join("<br>");

  if (mic && typeof MediaRecorder !== "undefined") {
    l.push(`<b>Test écho</b> : ${or("parle pendant 2 secondes")}`); d.innerHTML = l.join("<br>");
    await dire("Parle pendant deux secondes.", "fr");
    const b = await enregistrer(2000); await jouerBlob(b);
    l[l.length - 1] = `<b>Test écho</b> : ${b ? ok("enregistrement et lecture terminés") : ko("échec de l'enregistrement")}`;
    d.innerHTML = l.join("<br>");
  }
  fermerMicro();

  if (RECO && secure) {
    l.push(`<b>Test reconnaissance</b> : ${or("dis bonjour maintenant")}`); d.innerHTML = l.join("<br>");
    await dire("Dis bonjour maintenant.", "fr");
    const r = await ecouter(4500, "fr-FR"); recoOk = !!r;
    l[l.length - 1] = `<b>Test reconnaissance</b> : ${r ? ok("entendu : " + r) : ko("aucun résultat" + (recoDerniereErreur ? " · " + recoDerniereErreur : ""))}`;
  }
  if (erreurs.length) l.push(`<b>Dernière erreur enregistrée</b> : ${ko(erreurs[erreurs.length - 1].slice(0, 250))}`);
  else l.push(`<b>Erreurs JavaScript</b> : ${ok("aucune enregistrée")}`);
  l.push(`<br><b>Conseil</b> : ${!secure ? "ouvre l'application depuis ton adresse GitHub Pages en HTTPS." : !vDe ? "installe une voix allemande ou Lëtzebuergesch dans le téléphone." : !RECO ? "garde l'écho vocal activé, la reconnaissance n'est pas indispensable." : "la base technique est opérationnelle."}`);
  d.innerHTML = l.join("<br>");
  derniereDiag = d.innerText;
}

/* ---------- sauvegarde ---------- */
function exporter() {
  const data = { v: 2, app: APP_VERSION, date: new Date().toISOString(), prog, valides, favoris, jr, reg };
  const b = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = `luxembourgeois-sauvegarde-${jourCle()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
function objetSimple(v) { return v && typeof v === "object" && !Array.isArray(v); }
function importer(f) {
  const r = new FileReader();
  r.onload = async () => {
    try {
      const d = JSON.parse(r.result);
      if (!objetSimple(d) || !objetSimple(d.prog) || !objetSimple(d.valides) || !objetSimple(d.jr)) throw new Error("format de sauvegarde incomplet");
      prog = d.prog; valides = d.valides;
      favoris = objetSimple(d.favoris) ? d.favoris : favoris;
      jr = Object.assign({ seances: 0, minutes: 0, dernier: null, dernierKey: null, serie: 0, hist: {} }, d.jr);
      if (objetSimple(d.reg)) reg = Object.assign(reg, d.reg);
      await sauver(); majReglages(); peindre();
      afficherToast("Sauvegarde restaurée avec succès.");
    } catch (e) { logErreur("import", e); alert("Sauvegarde illisible ou incomplète."); }
    finally { $("fileImport").value = ""; }
  };
  r.readAsText(f);
}

/* ---------- réglages et interactions ---------- */
function majReglages() {
  $("swCor").setAttribute("aria-pressed", reg.cor ? "true" : "false");
  $("swEcho").setAttribute("aria-pressed", reg.echo ? "true" : "false");
  $("swComp").setAttribute("aria-pressed", reg.comp ? "true" : "false");
  $("swTruc").setAttribute("aria-pressed", reg.truc ? "true" : "false");
  $("rgVit").value = reg.vit;
  $("rgInt").value = reg.int;
  $("rgTps").value = reg.tps;
  $("rgObj").value = reg.obj || 20;
  $("vVit").textContent = reg.vit < 0.5 ? "très lente" : reg.vit < 0.7 ? "lente" : reg.vit < 0.95 ? "normale" : "rapide";
  $("vInt").textContent = reg.int < 0.85 ? "grave" : reg.int < 1.15 ? "moyenne" : "aiguë";
  $("vTps").textContent = (reg.tps / 1000).toFixed(1) + " secondes";
  $("vObj").textContent = (reg.obj || 20) + " min";
}

document.querySelectorAll(".tab").forEach(b => b.onclick = () => {
  document.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-selected", "false"));
  b.setAttribute("aria-selected", "true");
  document.querySelectorAll(".vue").forEach(v => v.classList.remove("on"));
  $("v-" + b.dataset.v).classList.add("on");
  if (b.dataset.v === "voix") chargerVoix();
  if (b.dataset.v === "install") majInstallation();
  window.scrollTo(0, 0);
});
$("dur").onclick = e => {
  const b = e.target.closest(".d"); if (!b) return;
  document.querySelectorAll(".d").forEach(x => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true");
};
$("go").onclick = () => demarrer("normal");
$("rev").onclick = () => demarrer("revision");
$("jeu").onclick = () => demarrer("jeu");
$("nbr").onclick = () => demarrer("nombres");
$("libre").onclick = () => demarrer("libre");
$("qt").onclick = terminer;
$("qzQuit").onclick = fermerTest;
$("sumClose").onclick = () => $("sum").classList.remove("on");
$("bPau").onclick = () => {
  pause = !pause; $("bPau").textContent = pause ? "Reprendre" : "Pause";
  try { pause ? speechSynthesis.pause() : speechSynthesis.resume(); } catch (_) {}
};
$("bSui").onclick = () => { try { speechSynthesis.cancel(); } catch (_) {} idx++; jt++; if (actif) boucle(jt).catch(e => logErreur("suivant", e)); };
$("bRef").onclick = () => { try { speechSynthesis.cancel(); } catch (_) {} jt++; if (actif) boucle(jt).catch(e => logErreur("refaire", e)); };
$("swCor").onclick = async () => {
  if (!RECO && !reg.cor) { alert("La reconnaissance vocale n'est pas supportée par ce navigateur. L'écho de ta voix reste disponible."); return; }
  reg.cor = !reg.cor; majReglages(); await sauver();
};
$("swEcho").onclick = async () => { reg.echo = !reg.echo; majReglages(); await sauver(); };
$("swComp").onclick = async () => { reg.comp = !reg.comp; majReglages(); await sauver(); };
$("swTruc").onclick = async () => { reg.truc = !reg.truc; majReglages(); await sauver(); };
$("rgVit").oninput = e => { reg.vit = parseFloat(e.target.value); majReglages(); };
$("rgInt").oninput = e => { reg.int = parseFloat(e.target.value); majReglages(); };
$("rgTps").oninput = e => { reg.tps = parseInt(e.target.value, 10); majReglages(); };
$("rgObj").oninput = e => { reg.obj = parseInt(e.target.value, 10); majReglages(); peindre(); };
["rgVit", "rgInt", "rgTps", "rgObj"].forEach(id => $(id).onchange = sauver);
$("selDe").onchange = async e => { reg.vDe = e.target.value; vDe = VOIX.find(v => v.name === reg.vDe) || vDe; await sauver(); };
$("selFr").onchange = async e => { reg.vFr = e.target.value; vFr = VOIX.find(v => v.name === reg.vFr) || vFr; await sauver(); };
$("btnTestVoix").onclick = async () => { await dire("Voici la voix du professeur.", "fr"); await dire("Moien. Wéi geet et?", "de"); };
$("btnDiag").onclick = () => diagnostic().catch(e => { logErreur("diagnostic", e); $("diag").textContent = "Le diagnostic a rencontré une erreur. Relance-le puis copie le résultat."; });
$("btnCopyDiag").onclick = async () => {
  const txt = derniereDiag || $("diag").innerText || "Diagnostic non lancé.";
  try { await navigator.clipboard.writeText(txt); afficherToast("Diagnostic copié."); }
  catch (_) { alert(txt); }
};
$("btnUpdate").onclick = verifierMaj;
$("btnUpdate2").onclick = verifierMaj;
$("btnExport").onclick = exporter;
$("btnImport").onclick = () => $("fileImport").click();
$("fileImport").onchange = e => { if (e.target.files[0]) importer(e.target.files[0]); };
$("raz").onclick = async () => {
  if (!confirm("Effacer toute la progression, les favoris et l'historique ?")) return;
  prog = {}; valides = {}; favoris = {}; jr = { seances: 0, minutes: 0, dernier: null, dernierKey: null, serie: 0, hist: {} };
  await sauver(); peindre(); afficherToast("Progression effacée.");
};
$("rch").oninput = e => peindreLex(e.target.value);
$("lexFiltres").onclick = e => {
  const b = e.target.closest("[data-filtre]"); if (!b) return;
  filtreLex = b.dataset.filtre;
  $("lexFiltres").querySelectorAll("[data-filtre]").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  peindreLex($("rch").value);
};
document.addEventListener("click", async e => {
  const fav = e.target.closest("[data-fav]");
  if (fav) { const k = fav.dataset.fav; favoris[k] = !favoris[k]; if (!favoris[k]) delete favoris[k]; await sauver(); peindreLex($("rch").value); return; }
  const d = e.target.closest("[data-d]"); if (d) { dire(decodeURIComponent(d.dataset.d), "de"); return; }
  const dl = e.target.closest("[data-dial]"); if (dl) { jouerDialogue(parseInt(dl.dataset.dial, 10)); return; }
  const t = e.target.closest("[data-test]"); if (t) { lancerTest(parseInt(t.dataset.test, 10)); return; }
  const l = e.target.closest("[data-l]"); if (l && !l.disabled) ouvrir(parseInt(l.dataset.l, 10));
});

/* ---------- installation, connexion et mises à jour ---------- */
let promptInstall = null, swReg = null, rechargerApresMaj = false;
const estIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const estAndroid = () => /android/i.test(navigator.userAgent);
function estInstallee() { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }
function majConnexion() {
  const n = $("netStatus"); if (!n) return;
  if (navigator.onLine) { n.textContent = "En ligne"; n.className = "net ok"; }
  else { n.textContent = "Hors ligne"; n.className = "net ko"; }
}
function majInstallation() {
  const inst = estInstallee(), state = $("installState"), help = $("installHelp"), b2 = $("btnInstall2"), b1 = $("btnInstall");
  if (!state || !help) return;
  if (inst) {
    state.textContent = "Application installée";
    help.textContent = "Tu l'utilises déjà comme une application autonome. Les cours restent disponibles hors ligne après leur mise en cache.";
    if (b2) { b2.textContent = "Application déjà installée"; b2.disabled = true; }
    if (b1) b1.style.display = "none";
    return;
  }
  if (b2) { b2.disabled = false; b2.textContent = "Installer l'application"; }
  if (promptInstall) {
    state.textContent = "Installation disponible";
    help.textContent = "Le navigateur peut installer directement l'application.";
    if (b1) b1.style.display = "block";
  } else if (estIOS()) {
    state.textContent = "Installation manuelle sur iPhone";
    help.textContent = "Dans Safari, touche Partager puis Sur l'écran d'accueil. iOS n'affiche pas toujours un bouton Installer dans la page.";
    if (b1) b1.style.display = "none";
  } else if (estAndroid()) {
    state.textContent = "Installation depuis le menu du navigateur";
    help.textContent = "Dans Chrome, ouvre le menu ⋮ puis Installer l'application ou Ajouter à l'écran d'accueil. Le bouton direct apparaît seulement si Chrome juge l'application installable.";
    if (b1) b1.style.display = "none";
  } else {
    state.textContent = "Installation selon le navigateur";
    help.textContent = "Utilise le menu du navigateur et cherche Installer l'application ou Ajouter à l'écran d'accueil.";
    if (b1) b1.style.display = "none";
  }
}
async function installer() {
  if (estInstallee()) { afficherToast("L'application est déjà installée."); return; }
  if (promptInstall) {
    try {
      promptInstall.prompt(); const choix = await promptInstall.userChoice;
      if (choix && choix.outcome === "accepted") afficherToast("Installation lancée.");
      promptInstall = null; majInstallation();
    } catch (e) { logErreur("installation", e); afficherToast("Le navigateur n'a pas pu lancer l'installation. Utilise son menu."); }
    return;
  }
  if (estIOS()) afficherToast("Sur iPhone : Safari, Partager, puis Sur l'écran d'accueil.");
  else afficherToast("Ouvre le menu du navigateur puis choisis Installer l'application ou Ajouter à l'écran d'accueil.");
}
function afficherToast(message, actions = []) {
  const t = $("toast"), txt = $("toastTxt"), zone = $("toastActions"); if (!t) return;
  txt.textContent = message; zone.innerHTML = "";
  actions.forEach((a, i) => { const b = document.createElement("button"); b.textContent = a.label; if (i === 0) b.className = "pri"; b.onclick = () => { t.classList.remove("on"); a.action(); }; zone.appendChild(b); });
  t.classList.add("on");
  if (!actions.length) setTimeout(() => t.classList.remove("on"), 5000);
}
function proposerMaj() {
  if (!swReg || !swReg.waiting) return;
  afficherToast("Une nouvelle version de l'application est prête.", [
    { label: "Mettre à jour", action: () => { rechargerApresMaj = true; swReg.waiting.postMessage({ type: "SKIP_WAITING" }); } },
    { label: "Plus tard", action: () => {} }
  ]);
}
async function verifierMaj() {
  if (!swReg) { afficherToast("Le service de mise à jour n'est pas encore prêt. Recharge la page puis réessaie."); return; }
  try {
    await swReg.update();
    if (swReg.waiting) proposerMaj();
    else afficherToast("Vérification terminée. Recharge l'application pour récupérer les derniers fichiers publiés.", [
      { label: "Recharger", action: () => location.reload() },
      { label: "Plus tard", action: () => {} }
    ]);
  } catch (e) { logErreur("mise à jour", e); afficherToast("Impossible de vérifier la mise à jour pour le moment."); }
}
async function initSW() {
  if (!("serviceWorker" in navigator) || !(location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) return;
  try {
    swReg = await navigator.serviceWorker.register("sw.js?v=2.0.0", { scope: "./" });
    if (swReg.waiting) proposerMaj();
    swReg.addEventListener("updatefound", () => {
      const w = swReg.installing; if (!w) return;
      w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) proposerMaj(); });
    });
  } catch (e) { logErreur("service worker", e); }
}
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); promptInstall = e; majInstallation(); });
window.addEventListener("appinstalled", () => { promptInstall = null; majInstallation(); afficherToast("Application installée."); });
$("btnInstall").onclick = installer;
$("btnInstall2").onclick = installer;
window.addEventListener("online", () => { majConnexion(); if (swReg) swReg.update().catch(() => {}); });
window.addEventListener("offline", majConnexion);
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("controllerchange", () => { if (rechargerApresMaj) location.reload(); });
document.addEventListener("visibilitychange", async () => {
  if (document.hidden && actif && !pause) { pause = true; $("bPau").textContent = "Reprendre"; try { speechSynthesis.pause(); } catch (_) {} }
  if (!document.hidden && actif && !verrou) { try { if ("wakeLock" in navigator) verrou = await navigator.wakeLock.request("screen"); } catch (_) {} }
});
window.addEventListener("pagehide", fermerMicro);

initSW();
charger();
