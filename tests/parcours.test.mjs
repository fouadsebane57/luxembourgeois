/* ===================================================================
   PARCOURS COMPLET D'UN EXERCICE ORAL

   Vérifie l'état de la machine APRÈS CHAQUE ÉTAPE. C'est le test qui
   manquait : en GATE 2, la machine restait en PREPARING pendant que
   le micro et l'enregistrement se déroulaient ailleurs.
   =================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { installer } from "./helpers/dom.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = (p) => pathToFileURL(join(RACINE, p)).href;
installer("", { lisibles: ["audio/mp4"] });

const { creer, ETAT } = await import(url("src/audio/machine.js"));
const Micro = await import(url("src/audio/mic.js"));

/** Journal des états traversés, pour vérifier le parcours entier. */
function machineTracee() {
  const traversee = [];
  const m = creer({ onEtat: (e) => traversee.push(e) });
  return { m, traversee };
}

test("parcours complet : chaque étape place la machine dans le bon état", async () => {
  const { m, traversee } = machineTracee();
  assert.equal(m.etat(), ETAT.REPOS);

  // 1. Démarrage. Sans AudioContext, la machine doit refuser proprement.
  const dep = await m.demarrer();
  assert.equal(dep.ok, false, "sans moteur audio, le démarrage doit échouer");
  assert.equal(dep.cause, "contexte_audio_endormi");
  assert.equal(m.etat(), ETAT.ERREUR);
  assert.equal(m.occupe(), false, "la machine ne doit pas rester occupée après un échec");
  assert.ok(traversee.includes(ETAT.PREPARATION));
});

test("parcours complet avec moteur audio disponible", async () => {
  // Contexte audio qui démarre réellement.
  globalThis.window.AudioContext = class {
    constructor() { this.state = "running"; }
    resume() { this.state = "running"; return Promise.resolve(); }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createAnalyser() { return { fftSize: 0, smoothingTimeConstant: 0, connect() {}, disconnect() {}, getFloatTimeDomainData() {} }; }
  };
  globalThis.AudioContext = globalThis.window.AudioContext;

  const { m, traversee } = machineTracee();

  const dep = await m.demarrer();
  assert.equal(dep.ok, true, "le démarrage doit réussir");
  assert.equal(m.etat(), ETAT.PREPARATION, "après démarrage : PREPARING");
  assert.equal(m.occupe(), true);

  assert.equal(await m.direModele("Moien", "lb"), true);
  assert.equal(m.etat(), ETAT.MODELE, "modèle prononcé : PLAYING_PROMPT");

  assert.equal(await m.attendreUtilisateur(0), true);
  assert.equal(m.etat(), ETAT.ATTENTE, "temps de réponse : WAITING_FOR_USER");

  // Capture. Sans micro réel, elle échoue, mais la machine doit avoir
  // traversé LISTENING puis RECORDING puis PROCESSING.
  const capture = await m.capturerReponse({ profil: "calme" });
  assert.ok(capture, "la capture doit renvoyer un objet exploitable");
  assert.equal(m.etat(), ETAT.TRAITEMENT, "après capture : PROCESSING");
  assert.ok(traversee.includes(ETAT.ECOUTE), "LISTENING jamais traversé");
  assert.ok(traversee.includes(ETAT.ENREGISTREMENT), "RECORDING jamais traversé");
  assert.equal(Micro.fluxOuvert(), false, "le micro doit être refermé après la capture");

  // Séquence canonique depuis GATE 2.2 : le retour vient AVANT toute
  // relecture, et le modèle est joué en dernier. La table refuse
  // volontairement PROCESSING vers PLAYING_ECHO.
  assert.equal(await m.direRetour("Presque."), true);
  assert.equal(m.etat(), ETAT.RETOUR, "retour : GIVING_FEEDBACK");

  const echo = await m.rejouerVoix(null);
  assert.ok(echo.etat, "l'écho doit rendre compte de son résultat");
  assert.equal(m.etat(), ETAT.ECHO, "réécoute : PLAYING_ECHO");

  assert.equal(await m.direModele("eent", "lb", 0.85), true);
  assert.equal(m.etat(), ETAT.MODELE, "le modèle est joué en dernier");

  await m.terminer("fin_test");
  assert.equal(m.etat(), ETAT.REPOS);
  assert.equal(m.occupe(), false);
  assert.equal(Micro.fluxOuvert(), false);

  // Le parcours attendu a bien été traversé, dans l'ordre.
  const attendu = [ETAT.PREPARATION, ETAT.MODELE, ETAT.ATTENTE, ETAT.ECOUTE,
                   ETAT.ENREGISTREMENT, ETAT.TRAITEMENT, ETAT.RETOUR, ETAT.ECHO, ETAT.MODELE];
  let curseur = 0;
  for (const e of traversee) if (e === attendu[curseur]) curseur++;
  assert.equal(curseur, attendu.length,
    `parcours incomplet, arrêté à ${attendu[curseur]}. Traversée : ${traversee.join(" > ")}`);
});

test("P0.8 · une seconde séance est refusée avant de démarrer", async () => {
  const m = creer({});
  const a = await m.demarrer();
  assert.equal(a.ok, true);
  const b = await m.demarrer();
  assert.equal(b.ok, false);
  assert.equal(b.cause, "session_deja_active");
  await m.terminer();
});

test("P0.5 · Pause coupe réellement et libère le micro", async () => {
  const m = creer({});
  await m.demarrer();
  await m.direModele("Moien");
  assert.equal(await m.pause(), true);
  assert.equal(m.etat(), ETAT.PAUSE);
  assert.equal(Micro.fluxOuvert(), false, "le micro doit être coupé en pause");
  assert.equal(m.reprendre(), true);
  assert.equal(m.etat(), ETAT.ATTENTE);
  assert.deepEqual(m.transitionsRefusees(), [], "aucune transition refusée sur ce parcours");
  await m.terminer();
});

test("P0.6 · Quitter libère tout et invalide la séance en cours", async () => {
  const m = creer({});
  const dep = await m.demarrer();
  assert.equal(m.vivant(dep.jeton), true);
  await m.terminer("sortie");
  assert.equal(m.vivant(dep.jeton), false, "l'ancien jeton doit être invalidé");
  assert.equal(m.occupe(), false);
  assert.equal(Micro.fluxOuvert(), false);
});

test("une capture demandée dans un état incohérent est refusée, pas subie", async () => {
  const m = creer({});
  // Aucune séance démarrée : la capture doit être refusée.
  const r = await m.capturerReponse({});
  assert.equal(r.ok, false);
  assert.equal(r.errorKind, "etat");
  assert.ok(r.error.includes("refusée"));
});

test("le journal technique conserve la trace des transitions", async () => {
  const m = creer({});
  await m.demarrer();
  await m.direModele("Moien");
  await m.terminer();
  const j = m.journal();
  assert.ok(j.length > 3, "journal trop pauvre");
  assert.ok(j.some((l) => l.evt === "transition"));
  assert.ok(j.some((l) => l.evt === "liberation_complete"));
  // Aucun secret ne doit transiter par le journal.
  assert.ok(!JSON.stringify(j).includes("sb_publishable"));
});

test("P0 · une séance sans contenu libère la machine avant de sortir", async () => {
  // Reproduction du défaut : la machine était démarrée avant le
  // contrôle de la file, et restait occupée quand la file était vide.
  const m = creer({});
  const dep = await m.demarrer();
  assert.equal(dep.ok, true);
  assert.equal(m.occupe(), true);

  // Chemin de sortie « aucun contenu ».
  await m.terminer("aucun_contenu");
  assert.equal(m.occupe(), false, "la machine reste occupée : aucune séance ne pourra démarrer");
  assert.equal(m.etat(), ETAT.REPOS);

  // Une nouvelle séance doit pouvoir démarrer immédiatement.
  const suivante = await m.demarrer();
  assert.equal(suivante.ok, true, "la machine est restée bloquée après une séance sans contenu");
  await m.terminer();
});

test("REGRESSION · le code de sortie sans contenu appelle bien terminer()", () => {
  // Contrôle structurel : le chemin de sortie doit libérer la machine.
  const app = readFileSync(join(RACINE, "src/app.js"), "utf8");
  const i = app.indexOf("Aucun contenu disponible");
  assert.ok(i > 0, "message de sortie introuvable");
  const bloc = app.slice(Math.max(0, i - 500), i + 200);
  assert.ok(/audio\.terminer\("aucun_contenu"\)/.test(bloc),
    "la machine n'est pas libérée sur le chemin « aucun contenu »");
});
