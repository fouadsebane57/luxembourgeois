/* ===================================================================
   GARDE-FOU D'ARCHITECTURE

   Ce test aurait fait échouer le GATE 2.

   La machine à états annonçait posséder le pipeline audio, alors que
   app.js appelait Voix.dire en direct et engine.js appelait capturer()
   en direct. Aucun test ne pouvait le voir : tous portaient sur des
   comportements, aucun sur la structure.

   Ici on analyse le code source lui-même. Si un module du parcours de
   séance contourne l'orchestrateur, le test échoue.
   =================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const lire = (p) => readFileSync(join(RACINE, p), "utf8");

/** Retire commentaires et chaînes, pour ne juger que du code exécuté. */
function codeSeul(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/`[^`]*`/g, "``")
    .replace(/"[^"\n]*"/g, '""')
    .replace(/'[^'\n]*'/g, "''");
}

/** Seuls ces modules ont le droit de piloter le matériel audio. */
const PROPRIETAIRES = ["src/audio/machine.js", "src/audio/recorder.js", "src/audio/mic.js",
                       "src/audio/vad.js", "src/audio/tts.js", "src/audio/lecture.js"];

/** Le diagnostic pilote son propre cycle, hors séance. Exception assumée. */
const EXCEPTIONS = ["src/ui/diagnostic.js"];

function fichiersSrc() {
  const out = [];
  (function scan(d) {
    for (const f of readdirSync(join(RACINE, d), { withFileTypes: true })) {
      const p = `${d}/${f.name}`;
      if (f.isDirectory()) { if (f.name !== "vendor") scan(p); continue; }
      if (f.name.endsWith(".js")) out.push(p);
    }
  })("src");
  return out;
}

test("ARCHITECTURE · le parcours de séance ne prononce rien en direct", () => {
  const fautifs = [];
  for (const f of fichiersSrc()) {
    if (PROPRIETAIRES.includes(f) || EXCEPTIONS.includes(f)) continue;
    const code = codeSeul(lire(f));
    // On tolère les usages hors séance, explicitement gardés par
    // une vérification d'occupation de la machine.
    for (const m of code.matchAll(/Voix\.dire\s*\(/g)) {
      const contexte = code.slice(Math.max(0, m.index - 400), m.index);
      const garde = /occupe\(\)|ecouterMot|voicePreview/.test(contexte);
      if (!garde) fautifs.push(`${f} : Voix.dire non gardé`);
    }
  }
  assert.deepEqual(fautifs, [],
    "un module du parcours prononce du son sans passer par l'orchestrateur");
});

test("ARCHITECTURE · le moteur vocal n'ouvre jamais le micro lui-même", () => {
  const engine = codeSeul(lire("src/speech/engine.js"));
  assert.ok(!/from\s+""\s*;?/.test("") , "sanity");
  // engine.js ne doit plus importer la fonction de capture.
  const imports = lire("src/speech/engine.js").match(/import\s+\{([^}]*)\}\s+from\s+"\.\.\/audio\/recorder\.js"/);
  const importes = imports ? imports[1].split(",").map((x) => x.trim()) : [];
  assert.ok(!importes.includes("capturer"),
    "engine.js importe encore capturer() : il contournerait l'orchestrateur");
  assert.ok(!/\bcapturer\s*\(/.test(engine.replace(/opt\.capturer\s*\(/g, "")),
    "engine.js appelle encore capturer() directement");
});

test("ARCHITECTURE · le moteur vocal exige une capture injectée", async () => {
  const src = lire("src/speech/engine.js");
  assert.ok(src.includes("typeof opt.capturer !== \"function\""),
    "engine.js doit refuser explicitement une capture absente");
});

test("ARCHITECTURE · seule la machine appelle la capture dans le parcours", () => {
  const fautifs = [];
  for (const f of fichiersSrc()) {
    if (PROPRIETAIRES.includes(f) || EXCEPTIONS.includes(f)) continue;
    const code = codeSeul(lire(f));
    if (/Rec\.capturer\s*\(|[^.]\bcapturer\s*\(/.test(code.replace(/capturerReponse\s*\(/g, ""))) {
      fautifs.push(f);
    }
  }
  assert.deepEqual(fautifs, [], "capture directe hors orchestrateur");
});

test("ARCHITECTURE · seules mic.js et la machine ouvrent le flux micro", () => {
  const fautifs = [];
  for (const f of fichiersSrc()) {
    if (PROPRIETAIRES.includes(f) || EXCEPTIONS.includes(f)) continue;
    const code = codeSeul(lire(f));
    if (/Micro\.ouvrir\s*\(/.test(code)) fautifs.push(f);
  }
  assert.deepEqual(fautifs, [], "ouverture directe du micro hors orchestrateur");
});

test("ARCHITECTURE · seul preuve.js écrit dans les dimensions de maîtrise", () => {
  const fautifs = [];
  for (const f of fichiersSrc()) {
    if (f === "src/core/preuve.js") continue;
    const code = codeSeul(lire(f));
    if (/dims\.[a-z]+\.n\s*=|dims\[[^\]]+\]\.n\s*=/.test(code)) fautifs.push(f);
  }
  assert.deepEqual(fautifs, [], "écriture directe d'une dimension hors du qualificateur de preuves");
});

test("ARCHITECTURE · aucune clé secrète dans le code livré", () => {
  const motifs = /sb_secret_[A-Za-z0-9]|service_role_key|sk_live_|whsec_[A-Za-z0-9]|BEGIN PRIVATE KEY/;
  const fautifs = fichiersSrc()
    .filter((f) => !f.includes("vendor"))
    .filter((f) => motifs.test(lire(f)));
  assert.deepEqual(fautifs, []);
});

test("ARCHITECTURE · une seule source de vérité pour le format audio", () => {
  const formats = lire("src/audio/formats.js");
  const recorder = lire("src/audio/recorder.js");
  // Le nom canonique est `relisible`. Aucun alias ne doit subsister.
  assert.ok(!/critere[ABC]/.test(formats), "formats.js expose encore des noms de critères redondants");
  assert.ok(!/critere[ABC]/.test(recorder), "recorder.js expose encore des noms redondants");
  assert.ok(formats.includes("relisible:"), "propriété canonique absente");
});

test("ARCHITECTURE · la séquence de restitution est partagée avec les tests", () => {
  const app = lire("src/app.js");
  // app.js ne doit pas réimplémenter la séquence : elle vit dans un
  // module unique, exercé tel quel par les tests d'intégration. Sinon
  // le testé et l'exécuté divergent, ce qui a laissé passer le défaut
  // de transition du GATE 2.1.
  assert.ok(app.includes("restituer({"), "app.js doit déléguer la restitution");

  // Contrôle réel : dans l'exercice oral, aucune relecture du modèle
  // ne doit exister en dehors de la restitution. Sinon le testé et
  // l'exécuté divergent, ce qui a laissé passer le défaut du GATE 2.1.
  // Bornes prises sur du CODE, pas sur des commentaires : codeSeul()
  // les supprime, et un repère effacé rendrait le contrôle inopérant.
  const code = codeSeul(app);
  const deb = code.indexOf("Moteur.evaluerReponse");
  const fin = code.indexOf("function peindreNiveau");
  assert.ok(deb > 0 && fin > deb, "bloc de l'exercice oral introuvable");
  const exercice = code.slice(deb, fin);
  const relectures = [...exercice.matchAll(/audio\.direModele\s*\(/g)].length;
  assert.equal(relectures, 0,
    `l'exercice oral rejoue le modèle ${relectures} fois hors de la restitution`);
  // On compte les INVOCATIONS de l'auxiliaire local, en excluant sa
  // déclaration et la méthode homonyme de la machine.
  const echos = [...exercice.matchAll(/(^|[^.\w])rejouerVoix\s*\(/g)]
    .filter((m) => !/function\s*$/.test(exercice.slice(0, m.index + m[1].length))).length;
  assert.ok(echos <= 1,
    `l'exercice oral invoque rejouerVoix ${echos} fois : risque de double lecture`);
});

test("ARCHITECTURE · le modèle est joué en dernier dans la restitution", () => {
  const r = lire("src/core/restitution.js");
  const iEcho = r.indexOf("rapport.echoDemande");
  const iModele = r.indexOf("audio.direModele");
  assert.ok(iEcho > 0 && iModele > 0, "séquence introuvable");
  assert.ok(iModele > iEcho,
    "le modèle doit venir APRÈS l'écho : c'est la forme cible qui doit rester en mémoire");
});

test("ARCHITECTURE · la table de transitions reste stricte", () => {
  const m = lire("src/audio/machine.js");
  const i = m.indexOf("const TRANSITIONS");
  const bloc = m.slice(i, m.indexOf("\n};", i));
  // Une table permissive accepterait tout et ne protégerait de rien.
  assert.ok(!/\[ETAT\.MODELE\]:[^\n]*ETAT\.ECHO/.test(bloc),
    "PLAYING_PROMPT vers PLAYING_ECHO ne doit pas être ouvert : corriger l'ordre du produit, pas la table");
  assert.ok(!/\[ETAT\.TRAITEMENT\]:[^\n]*ETAT\.ECHO/.test(bloc),
    "le retour pédagogique doit toujours précéder la réécoute");
});

test("ARCHITECTURE · les commandes de séance ne touchent pas la voix directement", () => {
  const app = lire("src/app.js");
  const code = codeSeul(app);
  const fautifs = [];

  // Ces quatre commandes sont déclenchées pendant une séance. Si l'une
  // d'elles appelait Voix directement, l'orchestrateur cesserait d'être
  // propriétaire du son et Pause ne garantirait plus rien.
  for (const nom of ["basculerPause", "passerExercice", "arreterSeance"]) {
    const i = code.indexOf("function " + nom + "(");
    assert.ok(i > 0, `commande ${nom} introuvable`);
    const bloc = code.slice(i, code.indexOf("\n}", i));
    for (const m of bloc.matchAll(/Voix\.(\w+)/g)) fautifs.push(`${nom} : Voix.${m[1]}`);
  }

  // repeter() garde une branche hors séance, obligatoirement protégée
  // par une vérification d'occupation de l'orchestrateur.
  const i = code.indexOf("function repeter(");
  const bloc = code.slice(i, code.indexOf("\n}", i));
  const appels = [...bloc.matchAll(/Voix\.(\w+)/g)].map((m) => m[1]);
  if (appels.length && !/audio\?\.occupe\(\)/.test(bloc)) {
    fautifs.push("repeter : Voix appelé sans garde d'occupation");
  }

  assert.deepEqual(fautifs, [],
    "une commande de séance contourne l'orchestrateur audio");
});

test("ARCHITECTURE · la boucle ne compte un exercice que selon son issue", () => {
  const code = codeSeul(lire("src/app.js"));
  const i = code.indexOf("async function boucleSeance");
  assert.ok(i > 0, "boucleSeance introuvable");
  const bloc = code.slice(i, code.indexOf("function noterPosition", i));

  // Contrôle structurel, pas textuel : un `if (false && ...)` contient
  // encore le bon texte tout en neutralisant la branche. On vérifie
  // donc la CONDITION exacte, telle qu'elle sera évaluée.
  const gardePause = /if\s*\(\s*issue\s*===\s*ISSUE\.PAUSE\s*\)/.test(bloc);
  assert.ok(gardePause,
    "la boucle ne teste pas proprement l'issue « pause » avant de compter l'exercice");
  const gardeSaut = /if\s*\(\s*issue\s*===\s*ISSUE\.SAUTE\s*\)/.test(bloc);
  assert.ok(gardeSaut, "la boucle ne distingue pas un exercice sauté");

  // La branche pause doit sortir du tour sans rien consommer.
  const iPause = bloc.search(/if\s*\(\s*issue\s*===\s*ISSUE\.PAUSE\s*\)/);
  const apresPause = bloc.slice(iPause, iPause + 260);
  assert.ok(/continue\s*;/.test(apresPause),
    "la branche pause ne relance pas le tour sans consommer l'exercice");

  const iTerminer = bloc.indexOf("Sess.terminerExercice");
  assert.ok(iTerminer > iPause,
    "terminerExercice est appelé avant d'avoir écarté le cas de la pause");
});

test("ARCHITECTURE · un exercice renvoie toujours une issue explicite", () => {
  const code = codeSeul(lire("src/app.js"));
  // Bornes serrées sur jouerExercice seule : la prochaine déclaration
  // de fonction de premier niveau marque la fin. Une borne trop large
  // engloberait des auxiliaires et rendrait le contrôle faux.
  const i = code.indexOf("async function jouerExercice");
  assert.ok(i > 0, "jouerExercice introuvable");
  const suite = code.slice(i + 20);
  const rel = suite.search(/\n(?:async )?function /);
  const bloc = code.slice(i, rel > 0 ? i + 20 + rel : code.length);
  // Aucun retour nu : chacun doit dire pourquoi il sort.
  const nus = [...bloc.matchAll(/return\s*;/g)].length;
  assert.equal(nus, 0, `${nus} retour(s) sans issue explicite dans jouerExercice`);
  assert.ok(bloc.includes("issueCourante()"), "aucune traduction d'état en issue");
});

test("ARCHITECTURE · la capture garantit la libération du micro", () => {
  const src = lire("src/audio/recorder.js");
  const bloc = src.slice(src.indexOf("export async function capturer"));
  assert.ok(bloc.includes("} finally {"), "capturer() doit utiliser try/finally");
  assert.ok(/finally\s*\{[\s\S]{0,200}liberer\(\)/.test(bloc),
    "la libération du micro doit être dans un finally");
});
