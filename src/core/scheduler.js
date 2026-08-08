/* ===================================================================
   RÉPÉTITION ESPACÉE

   Trois dimensions séparées, comme demandé :
     comprehension  je reconnais le sens quand je l'entends
     production     je sais le dire
     pronunciation  je le dis de façon reconnaissable

   L'échéance est portée par la dimension la plus faible.
   Une donnée non fiable (effet `none`) n'écrit rien du tout.
   =================================================================== */

import { EFFET } from "../speech/score.js";

export const JOUR = 86400000;
export const INTERVALLES = [0, 1, 2, 4, 8, 16, 32, 64];
export const NIVEAU_MAX = INTERVALLES.length - 1;
export const NIVEAU_SOLIDE = 4;

export const aujourdHui = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export function vide() {
  return {
    comprehension: 0, production: 0, pronunciation: 0,
    seen: 0, errors: 0, confidence: 0,
    lastSeen: 0, nextDue: 0
  };
}

export function normaliserEntree(p) {
  const v = vide();
  if (!p || typeof p !== "object") return v;
  return {
    comprehension: clamp(p.comprehension ?? p.n ?? 0),
    production: clamp(p.production ?? p.n ?? 0),
    pronunciation: clamp(p.pronunciation ?? 0),
    seen: Math.max(0, Number(p.seen ?? p.vu ?? 0)),
    errors: Math.max(0, Number(p.errors ?? p.mistakes ?? 0)),
    confidence: borne(Number(p.confidence ?? 0), 0, 1),
    lastSeen: Number(p.lastSeen ?? p.day ?? p.jour ?? 0),
    nextDue: Number(p.nextDue ?? p.due ?? 0)
  };
}

const clamp = (n) => Math.max(0, Math.min(NIVEAU_MAX, Math.round(Number(n) || 0)));
const borne = (n, a, b) => Math.max(a, Math.min(b, Number(n) || 0));

export const niveauGlobal = (p) => Math.min(p.comprehension, p.production);
export const estSolide = (p) => niveauGlobal(p) >= NIVEAU_SOLIDE;
export const estDu = (p, t = aujourdHui()) => niveauGlobal(p) > 0 && p.nextDue <= t;

/**
 * Applique un résultat.
 * @param {object} p          entrée de progression
 * @param {string} effet      EFFET.*
 * @param {string} dimension  "comprehension" | "production" | "pronunciation" | "toutes"
 * @param {object} meta       { confidence, fiable }
 */
export function appliquer(p, effet, dimension = "production", meta = {}) {
  const n = normaliserEntree(p);

  // Règle absolue : aucune écriture sur une donnée non fiable.
  if (effet === EFFET.NONE) return n;

  n.seen += 1;
  n.lastSeen = Date.now();

  const dims = dimension === "toutes"
    ? ["comprehension", "production", "pronunciation"]
    : [dimension];

  for (const d of dims) {
    if (effet === EFFET.UP_STRONG) n[d] = clamp(n[d] + (n[d] === 0 ? 1 : 2));
    else if (effet === EFFET.UP) n[d] = clamp(n[d] + 1);
    else if (effet === EFFET.HOLD) n[d] = clamp(n[d]);
    else if (effet === EFFET.DOWN) { n[d] = clamp(n[d] - 1); }
  }
  if (effet === EFFET.DOWN) n.errors += 1;

  // La prononciation ne monte que sur une mesure fiable du moteur cloud.
  if (dimension !== "pronunciation" && meta.fiable && effet === EFFET.UP_STRONG) {
    n.pronunciation = clamp(n.pronunciation + 1);
  }

  if (typeof meta.confidence === "number" && meta.confidence > 0) {
    n.confidence = n.confidence ? n.confidence * 0.7 + meta.confidence * 0.3 : meta.confidence;
  }

  const niveau = niveauGlobal(n);
  n.nextDue = aujourdHui() + INTERVALLES[Math.min(niveau, NIVEAU_MAX)] * JOUR;
  return n;
}

/** Exposition passive, sans test. Monte lentement la compréhension seulement. */
export function exposer(p) {
  const n = normaliserEntree(p);
  n.seen += 1;
  n.lastSeen = Date.now();
  if (n.seen % 2 === 0) n.comprehension = clamp(n.comprehension + 1);
  const niveau = niveauGlobal(n);
  n.nextDue = Math.max(n.nextDue, aujourdHui() + INTERVALLES[Math.min(niveau, NIVEAU_MAX)] * JOUR);
  return n;
}

/**
 * Fusion de deux progressions, locale et distante.
 * L'ancien moteur prenait le maximum champ par champ, y compris sur
 * l'échéance. Un mot ne redescendait jamais et la révision était
 * toujours repoussée au plus tard. Ici, la version la plus récente
 * fait foi, et l'échéance est recalculée à partir du niveau retenu.
 */
export function fusionner(local, distant) {
  const a = normaliserEntree(local);
  const b = normaliserEntree(distant);
  const recent = a.lastSeen >= b.lastSeen ? a : b;
  const autre = recent === a ? b : a;
  const f = {
    comprehension: recent.comprehension,
    production: recent.production,
    pronunciation: recent.pronunciation,
    seen: Math.max(a.seen, b.seen),
    errors: Math.max(a.errors, b.errors),
    confidence: recent.confidence || autre.confidence,
    lastSeen: Math.max(a.lastSeen, b.lastSeen),
    nextDue: 0
  };
  f.nextDue = aujourdHui() + INTERVALLES[Math.min(niveauGlobal(f), NIVEAU_MAX)] * JOUR;
  return f;
}
