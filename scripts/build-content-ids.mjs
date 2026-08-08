#!/usr/bin/env node
/**
 * Génère les identifiants permanents des expressions et la table de migration.
 *
 * Règle : id = "lx" + 8 hexa du SHA-1 de la forme luxembourgeoise normalisée.
 *  - Déterministe. Le même mot donne toujours le même identifiant.
 *  - Indépendant de la position dans cours.js.
 *  - Deux occurrences du même mot dans deux leçons partagent le même identifiant,
 *    donc la même progression. C'est voulu.
 *
 * Le script est idempotent : si un identifiant existe déjà dans la source, il est conservé.
 * Il n'invente aucun contenu luxembourgeois. Il ne fait qu'ajouter des identifiants.
 *
 * Usage : node scripts/build-content-ids.mjs <cours-source.js> <sortie.js> <map.json>
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const [, , SRC, OUT, MAP] = process.argv;
if (!SRC || !OUT || !MAP) {
  console.error("Usage: node scripts/build-content-ids.mjs <src> <out> <map>");
  process.exit(1);
}

/** Normalisation utilisée uniquement pour le calcul de l'identifiant. */
function idKey(lb) {
  return String(lb)
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC\u0060\u00B4]/g, "'")
    .replace(/[.,;:!?…«»"()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeId(lb) {
  return "lx" + createHash("sha1").update(idKey(lb), "utf8").digest("hex").slice(0, 8);
}

/**
 * Nombre de syllabes, déduit du guide de prononciation.
 * Le champ ph découpe explicitement par des traits d'union, par exemple
 * « faï-er » ou « draï-tsèng ». On s'appuie sur ce découpage quand il
 * existe, sinon sur les groupes de voyelles.
 *
 * Renvoie null quand le guide ne couvre pas toute l'expression, cas de
 * onze entrées où la formule répétée est abrégée. Mieux vaut ne rien
 * mesurer que mesurer faux.
 */
const VOYELLES = /[aeiouyàâäéèêëïîôöùûüœ]+/gi;
function compterSyllabes(lb, ph) {
  const motsLb = String(lb).replace(/[…\.]{1,3}/g, " ").trim().split(/\s+/).filter(Boolean);
  const motsPh = String(ph || "").trim().split(/\s+/).filter(Boolean);
  if (!motsPh.length) return null;
  if (motsPh.length < motsLb.length) return null;   // guide incomplet

  let n = 0;
  for (const mot of motsPh) {
    const parts = mot.split("-").filter(Boolean);
    if (parts.length > 1) { n += parts.length; continue; }
    const groupes = mot.match(VOYELLES);
    n += groupes ? groupes.length : 1;
  }
  return Math.max(1, n);
}

const src = readFileSync(SRC, "utf8");
// Le script est idempotent : il doit pouvoir relire sa propre sortie,
// qui affecte window.LETZ_CONTENT et window.LETZ_LEGACY_MAP.
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(src + ";globalThis.__o={ETAPES,COURS,DIALOGUES,BLOCS};", sandbox);
const { ETAPES, COURS, DIALOGUES, BLOCS } = sandbox.__o;

const legacyMap = {};
const idIndex = new Map();
const collisions = [];
let assigned = 0;
let kept = 0;

COURS.forEach((lesson, li) => {
  lesson.lid = lesson.lid || "ls" + createHash("sha1").update(`${lesson.e}|${lesson.t}`, "utf8").digest("hex").slice(0, 6);
  lesson.i.forEach((item, ii) => {
    if (item.id) { kept++; } else { item.id = makeId(item.lb); assigned++; }
    legacyMap[`${li}-${ii}`] = item.id;
    if (idIndex.has(item.id)) {
      const prev = idIndex.get(item.id);
      if (idKey(prev.lb) !== idKey(item.lb)) collisions.push([prev.lb, item.lb, item.id]);
      else prev.occurrences.push(`${li}-${ii}`);
    } else {
      idIndex.set(item.id, { lb: item.lb, occurrences: [`${li}-${ii}`] });
    }
    // Champs de traçabilité. Vides tant qu'aucune vérification n'a eu lieu.
    if (item.alt === undefined) item.alt = [];
    if (item.src === undefined) item.src = "";
    if (item.ver === undefined) item.ver = "";
    if (item.by === undefined) item.by = "";
    if (item.st === undefined) item.st = "unverified";
    // Recalculé à chaque génération : dépend uniquement de lb et ph.
    item.syl = compterSyllabes(item.lb, item.ph);
  });
});

// Identifiants de leçon uniques
const lidSeen = new Set();
COURS.forEach((l, li) => {
  let lid = l.lid, n = 1;
  while (lidSeen.has(lid)) lid = l.lid + "-" + ++n;
  l.lid = lid; lidSeen.add(lid);
});

DIALOGUES.forEach((d) => {
  if (!d.id) d.id = "dg" + createHash("sha1").update(`${d.e}|${d.t}`, "utf8").digest("hex").slice(0, 6);
});

const shared = [...idIndex.entries()].filter(([, v]) => v.occurrences.length > 1);

// ---- Écriture ----
const esc = (s) => JSON.stringify(String(s));
const itemLine = (it) => {
  const parts = [`id:${esc(it.id)}`, `lb:${esc(it.lb)}`, `fr:${esc(it.fr)}`, `ph:${esc(it.ph || "")}`];
  if (it.tr) parts.push(`tr:${esc(it.tr)}`);
  if (it.alt && it.alt.length) parts.push(`alt:${JSON.stringify(it.alt)}`);
  if (it.src) parts.push(`src:${esc(it.src)}`);
  if (it.ver) parts.push(`ver:${esc(it.ver)}`);
  if (it.by) parts.push(`by:${esc(it.by)}`);
  if (it.syl != null) parts.push(`syl:${it.syl}`);
  parts.push(`st:${esc(it.st)}`);
  return " {" + parts.join(",") + "}";
};

let out = `/* =====================================================================
   COURS DE LUXEMBOURGEOIS — DONNÉES
   Généré par scripts/build-content-ids.mjs. Ne pas réordonner à la main
   sans relancer le script.

   Champs :
     id  identifiant permanent, ne jamais modifier ni réutiliser
     lb  luxembourgeois
     fr  français
     ph  prononciation approchée
     tr  astuce mémoire, aide, pas une règle de langue
     alt réponses orales également acceptées, VALIDÉES uniquement
     src source de vérification
     ver date de vérification
     by  personne ayant validé
     syl nombre de syllabes déduit de ph, absent si non mesurable
     st  unverified | reviewing | verified

   Tout contenu doit être vérifié sur lod.lu, dictionnaire du Zenter fir
   d'Lëtzebuerger Sprooch, puis relu par un locuteur compétent avant vente.
   Aucun contenu de ce fichier n'a été inventé ou traduit automatiquement.
   ===================================================================== */

const ETAPES = ${JSON.stringify(ETAPES, null, 2)};

const COURS = [
`;

COURS.forEach((l, li) => {
  out += `{lid:${esc(l.lid)},e:${l.e},t:${esc(l.t)},note:${esc(l.note)},i:[\n`;
  out += l.i.map(itemLine).join(",\n");
  out += `]},\n`;
});
out += `];\n\nconst DIALOGUES = [\n`;
DIALOGUES.forEach((d) => {
  out += `{id:${esc(d.id)},e:${d.e},t:${esc(d.t)},l:[\n`;
  out += d.l.map((x) => ` {q:${esc(x.q)},lb:${esc(x.lb)},fr:${esc(x.fr)}}`).join(",\n");
  out += `]},\n`;
});
out += `];\n\nconst BLOCS = ${JSON.stringify(BLOCS, null, 2)};\n`;
out += `\nwindow.LULU_CONTENT = { ETAPES, COURS, DIALOGUES, BLOCS, contentVersion: "5.1.0" };\n`;
out += `window.LETZ_CONTENT = window.LULU_CONTENT;   // compatibilité 5.0.0\n`;

// La table de migration est embarquée ici, pas seulement dans un fichier
// séparé. Un échec de chargement réseau au démarrage ferait croire à une
// progression perdue. Le fichier .json reste livré, comme référence et
// comme secours.
out += `\n/* Table de migration des anciennes clés "leçon-item" vers les identifiants\n   permanents. Générée avec le contenu. Ne pas modifier à la main. */\n`;
out += `window.LETZ_LEGACY_MAP = ${JSON.stringify(legacyMap)};\n`;

writeFileSync(OUT, out, "utf8");
writeFileSync(
  MAP,
  JSON.stringify({ generatedAt: new Date().toISOString(), scheme: "sha1(lb)[0:8]", legacy: legacyMap }, null, 0),
  "utf8"
);

console.log(`Leçons        : ${COURS.length}`);
console.log(`Expressions   : ${Object.keys(legacyMap).length}`);
console.log(`Identifiants uniques : ${idIndex.size}`);
console.log(`Nouveaux ids  : ${assigned}   conservés : ${kept}`);
const avecSyl = COURS.flatMap((l) => l.i).filter((i) => i.syl != null).length;
console.log(`Syllabes mesurables : ${avecSyl} / ${Object.keys(legacyMap).length}`);
console.log(`Ids partagés par plusieurs occurrences : ${shared.length}`);
shared.forEach(([id, v]) => console.log(`  ${id}  ${v.lb}  <- ${v.occurrences.join(", ")}`));
if (collisions.length) {
  console.error("COLLISIONS RÉELLES, à traiter à la main :");
  collisions.forEach((c) => console.error("  ", c));
  process.exit(2);
}
