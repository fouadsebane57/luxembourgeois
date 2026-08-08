/* ===================================================================
   COMMANDES VOCALES

   Position honnête, vérifiée plutôt que promise.

   Ce qui fonctionne réellement :
     Chrome sur Android, SpeechRecognition en continu, hors séance
     d'enregistrement. Les mots reconnus sont volontairement courts.

   Ce qui ne fonctionne PAS de façon fiable, et n'est donc pas activé :
     Safari sur iPhone. La reconnaissance y exige un geste utilisateur
     à chaque démarrage, ne tient pas en continu, et entre en conflit
     avec le micro de l'exercice. Une commande vocale qui marche une
     fois sur trois est pire que pas de commande du tout.

   Sur iPhone, la relève est assurée par :
     les boutons du volant et de l'autoradio, via la Media Session,
     quatre très grandes cibles tactiles en Mode voiture.
   =================================================================== */

const MOTS = {
  repeter:   ["répète", "repete", "répéter", "encore", "redis"],
  suivant:   ["suivant", "suivante", "passe", "next"],
  precedent: ["précédent", "precedent", "retour", "avant"],
  pause:     ["pause", "stop", "arrête", "arrete"],
  continue:  ["continue", "reprends", "reprendre", "go"]
};

let rec = null;
let actif = false;
let onCommande = null;

const estIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** Les commandes vocales sont-elles réellement utilisables ici ? */
export function supporte() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) return { ok: false, raison: "Ce navigateur n'a pas de reconnaissance vocale." };
  if (estIOS()) return {
    ok: false,
    raison: "Sur iPhone, la reconnaissance en continu n'est pas fiable et bloque le micro de l'exercice. Utilise les gros boutons ou les commandes du volant."
  };
  return { ok: true, raison: "" };
}

export function demarrer(rappel) {
  const s = supporte();
  if (!s.ok) return { ok: false, raison: s.raison };
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  onCommande = rappel;
  try {
    rec = new Rec();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const dernier = e.results[e.results.length - 1];
      const texte = String(dernier[0]?.transcript || "").toLowerCase().trim();
      const cmd = reconnaitre(texte);
      if (cmd && onCommande) onCommande(cmd, texte);
    };
    rec.onerror = () => {};
    // Le navigateur coupe régulièrement l'écoute continue. On relance.
    rec.onend = () => { if (actif) { try { rec.start(); } catch (_) {} } };
    rec.start();
    actif = true;
    return { ok: true, raison: "" };
  } catch (e) {
    actif = false;
    return { ok: false, raison: "Démarrage refusé : " + e.message };
  }
}

export function arreter() {
  actif = false;
  try { rec?.stop(); } catch (_) {}
  rec = null;
}

export const enEcoute = () => actif;

export function reconnaitre(texte) {
  const t = String(texte).toLowerCase();
  for (const [cmd, mots] of Object.entries(MOTS)) {
    if (mots.some((m) => t.includes(m))) return cmd;
  }
  return null;
}

export const listeCommandes = () => Object.keys(MOTS);
