/* ===================================================================
   SYNTHÈSE VOCALE

   Limite connue et non contournable côté web : SpeechSynthesis
   s'interrompt quand l'écran se verrouille sur iOS. Le mode « pose le
   téléphone » n'est donc pas encore tenu sur iPhone écran éteint.
   Le contournement durable est l'audio pré-enregistré. Il est prévu
   après la stabilisation vocale, pas dans ce lot.

   Ici, on corrige ce qui peut l'être :
     la promesse se résout à la vraie fin de lecture, pas sur un minuteur
     approximatif qui provoquait des chevauchements de voix,
     un seul énoncé à la fois, avec annulation propre.
   =================================================================== */

let voix = [];
let voixLb = null;
let voixFr = null;
let enCours = null;
let dernier = null;

const reglages = () => (window.LETZ_STATE_SETTINGS || {});
export function brancherReglages(fn) { window.LETZ_STATE_SETTINGS = fn; }

export function dispo() { return "speechSynthesis" in window; }

export function chargerVoix() {
  if (!dispo()) return { lb: [], fr: [] };
  voix = speechSynthesis.getVoices() || [];
  const lb = voix.filter((v) => /^lb/i.test(v.lang));
  const de = voix.filter((v) => /^de/i.test(v.lang));
  const fr = voix.filter((v) => /^fr/i.test(v.lang));
  const candidats = [...lb, ...de.filter((v) => !lb.some((x) => x.name === v.name))];

  const s = lireReglages();
  voixLb = voix.find((v) => v.name === s.luxVoice) || candidats[0] || null;
  voixFr = voix.find((v) => v.name === s.frVoice) || fr[0] || null;

  remplirSelect("luxVoiceSelect", candidats, voixLb, (v) =>
    `${/^lb/i.test(v.lang) ? "Lëtzebuergesch" : "Allemand, approximation"} · ${v.name}`);
  remplirSelect("frVoiceSelect", fr, voixFr, (v) => v.name);
  return { lb: candidats, fr };
}

function lireReglages() {
  try { return JSON.parse(localStorage.getItem("letz:v5") || "{}").settings || {}; }
  catch (_) { return {}; }
}

function remplirSelect(id, liste, choisie, libelle) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = liste.length
    ? liste.map((v) => `<option value="${v.name.replace(/"/g, "&quot;")}">${libelle(v)}</option>`).join("")
    : `<option value="">Aucune voix compatible sur cet appareil</option>`;
  if (choisie) el.value = choisie.name;
}

export function voixLuxembourgeoiseReelle() { return !!(voixLb && /^lb/i.test(voixLb.lang)); }
export function voixActuelles() { return { lb: voixLb, fr: voixFr }; }

/** Prépare le moteur. À appeler sur un geste utilisateur, iOS l'exige. */
export async function preparer() {
  if (!dispo()) return;
  try { speechSynthesis.cancel(); } catch (_) {}
  chargerVoix();
  if (!voix.length) await new Promise((r) => { speechSynthesis.onvoiceschanged = () => { chargerVoix(); r(); }; setTimeout(r, 700); });
}

export function dire(texte, langue = "lb", facteur = 1) {
  dernier = { texte, langue, facteur };
  return new Promise((resolve) => {
    if (!dispo() || !String(texte).trim()) return resolve();
    try { speechSynthesis.cancel(); } catch (_) {}

    const s = lireReglages();
    const u = new SpeechSynthesisUtterance(String(texte));
    const base = Number(s.voiceRate || 0.85);

    if (langue === "lb") {
      u.lang = voixLuxembourgeoiseReelle() ? voixLb.lang : "de-DE";
      if (voixLb) u.voice = voixLb;
      u.rate = borne(base * facteur, 0.45, 1.25);
    } else {
      u.lang = "fr-FR";
      if (voixFr) u.voice = voixFr;
      u.rate = borne(base + 0.1, 0.6, 1.3);
    }

    let fini = false;
    const finir = () => { if (fini) return; fini = true; clearInterval(veille); enCours = null; resolve(); };
    u.onend = finir;
    u.onerror = finir;
    enCours = u;

    // Filet de sécurité : sur certains navigateurs, onend ne se déclenche pas.
    // On surveille l'état réel du moteur plutôt que d'estimer une durée.
    const veille = setInterval(() => {
      if (!speechSynthesis.speaking && !speechSynthesis.pending) finir();
    }, 250);
    // Plafond absolu, généreux, uniquement pour ne jamais bloquer la séance.
    setTimeout(finir, Math.max(6000, String(texte).length * 260));

    try { speechSynthesis.speak(u); } catch (_) { finir(); }
  });
}

export function repeter() { if (dernier) return dire(dernier.texte, dernier.langue, dernier.facteur); }
export function stopper() { try { speechSynthesis.cancel(); } catch (_) {} enCours = null; }
const borne = (n, a, b) => Math.max(a, Math.min(b, n));
