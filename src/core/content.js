/* ===================================================================
   ACCÈS AU CONTENU

   Source unique. Toute lecture du cours passe par ici.
   Une expression est identifiée par son `id`, jamais par sa position.
   =================================================================== */

const C = () => window.LETZ_CONTENT || { ETAPES: [], COURS: [], DIALOGUES: [], BLOCS: [], contentVersion: "0" };

export const ETAPES = () => C().ETAPES;
export const COURS = () => C().COURS;
export const DIALOGUES = () => C().DIALOGUES;
export const BLOCS = () => C().BLOCS;
export const versionContenu = () => C().contentVersion;

let _items = null;
let _parId = null;

/** Liste à plat. Une entrée par occurrence, l'id peut être partagé. */
export function items() {
  if (_items) return _items;
  _items = [];
  COURS().forEach((lesson, li) => {
    lesson.i.forEach((it, ii) => {
      _items.push({ ...it, lesson: li, lid: lesson.lid, stage: lesson.e, pos: ii });
    });
  });
  return _items;
}

/** Expressions distinctes, dédoublonnées par identifiant. */
export function itemsUniques() {
  const vus = new Set();
  return items().filter((i) => (vus.has(i.id) ? false : (vus.add(i.id), true)));
}

export function parId(id) {
  if (!_parId) {
    _parId = new Map();
    items().forEach((i) => { if (!_parId.has(i.id)) _parId.set(i.id, i); });
  }
  return _parId.get(id) || null;
}

export function itemsDeLecon(li) {
  return items().filter((i) => i.lesson === li);
}

/** Vocabulaire d'une leçon, utilisé pour le biasing de la reconnaissance. */
export function vocabulaireLecon(li, max = 40) {
  return itemsDeLecon(li).map((i) => i.lb).slice(0, max);
}

export function reinitialiserCaches() { _items = null; _parId = null; }
