/* ===================================================================
   PARCOURS RÉELS D'UN EXERCICE ORAL

   Ces tests exercent `restituer()`, la fonction que app.js appelle
   réellement. En GATE 2.1, les tests exerçaient machine.js isolément,
   dans un ordre qui n'était pas celui du produit. La transition
   PLAYING_PROMPT vers PLAYING_ECHO était refusée, l'écho ne pouvait
   jamais être joué, et 124 tests restaient verts.
   =================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { installer } from "./helpers/dom.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = (p) => pathToFileURL(join(RACINE, p)).href;
installer("", { lisibles: ["audio/mp4"] });

// Contexte audio qui démarre réellement, sinon la machine refuse tout.
globalThis.window.AudioContext = class {
  constructor() { this.state = "running"; }
  resume() { this.state = "running"; return Promise.resolve(); }
  createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  createAnalyser() { return { fftSize: 0, smoothingTimeConstant: 0, connect() {}, disconnect() {}, getFloatTimeDomainData() {} }; }
};
globalThis.AudioContext = globalThis.window.AudioContext;

const { creer, ETAT } = await import(url("src/audio/machine.js"));
const { restituer } = await import(url("src/core/restitution.js"));
const { LECTURE } = await import(url("src/audio/lecture.js"));

const ITEM = { id: "lx00000001", lb: "eent", fr: "un", ph: "ént", syl: 1, alt: [] };

/** Blob simulé, identifiable, pour vérifier que c'est bien LE bon. */
const blobDe = (marque) => ({ size: 2048, type: "audio/mp4", _marque: marque });

/**
 * Banc d'essai. Enregistre chaque état traversé et chaque appel de
 * lecture, avec le Blob réellement transmis.
 */
function banc({ resultatLecture = { etat: LECTURE.TERMINEE, demarree: true, dureeMs: 500 } } = {}) {
  const traversee = [];
  const lectures = [];
  const lecteur = async (blob) => { lectures.push(blob); return resultatLecture; };
  const m = creer({ onEtat: (e) => traversee.push(e), lecteur });
  return { m, traversee, lectures };
}

/** Reproduit exactement ce que fait app.js jusqu'au traitement. */
async function jusquAuTraitement(m) {
  const dep = await m.demarrer();
  await m.direConsigne("Comment dis-tu : un ?");
  await m.attendreUtilisateur(0);
  await m.capturerReponse({ profil: "calme" });
  return dep;
}

const resultat = (o = {}) => ({
  engine: "cloud", fiable: true, correct: false, blob: blobDe("actuel"),
  messageRythme: "", ...o
});

/* ---------- 3 · Mode local ---------- */

test("MODE LOCAL · la séquence complète est traversée sans refus", async () => {
  const { m, traversee, lectures } = banc();
  await jusquAuTraitement(m);
  assert.equal(m.etat(), ETAT.TRAITEMENT, "après capture : PROCESSING");

  const blob = blobDe("local");
  const r = await restituer({
    audio: m, item: ITEM, echoActive: true, vivant: () => true,
    resultat: resultat({ engine: "local", fiable: false, blob, messageRythme: "Ta réponse était courte." }),
    rejouer: (res) => m.rejouerVoix(res.blob)
  });

  assert.deepEqual(r.sequence, ["retour", "echo", "modele"]);
  assert.equal(m.etat(), ETAT.MODELE, "le modèle doit être le dernier son");
  assert.equal(r.echoJoue, true);
  assert.equal(lectures.length, 1, "l'écho doit être joué exactement une fois");
  assert.equal(lectures[0]._marque, "local", "ce n'est pas le Blob de la capture courante");

  const attendu = [ETAT.PREPARATION, ETAT.MODELE, ETAT.ATTENTE, ETAT.ECOUTE,
                   ETAT.ENREGISTREMENT, ETAT.TRAITEMENT, ETAT.RETOUR, ETAT.ECHO, ETAT.MODELE];
  let c = 0;
  for (const e of traversee) if (e === attendu[c]) c++;
  assert.equal(c, attendu.length, `parcours incomplet, arrêté à ${attendu[c]}. Traversée : ${traversee.join(" > ")}`);

  assert.deepEqual(m.transitionsRefusees(), [], "aucune transition ne doit être refusée");
  await m.terminer();
});

/* ---------- 4 · Cloud incorrect ---------- */

test("CLOUD INCORRECT · eent attendu, bonjour entendu, parcours complet", async () => {
  const { m, lectures } = banc();
  await jusquAuTraitement(m);

  const blob = blobDe("incorrect");
  const r = await restituer({
    audio: m, item: ITEM, echoActive: true, vivant: () => true,
    messageVerdict: "On réessaie. Écoute et répète.",
    // Attendu « eent », transcrit « bonjour » : verdict incorrect.
    resultat: resultat({ correct: false, blob }),
    rejouer: (res) => m.rejouerVoix(res.blob)
  });

  assert.deepEqual(r.sequence, ["retour", "echo", "modele"]);
  assert.equal(lectures.length, 1);
  assert.equal(lectures[0]._marque, "incorrect");
  assert.equal(m.etat(), ETAT.MODELE);
  assert.deepEqual(m.transitionsRefusees(), []);
  await m.terminer();
});

/* ---------- 5 · Cloud correct ---------- */

test("CLOUD CORRECT · aucune répétition inutile, comportement explicite", async () => {
  const { m, lectures } = banc();
  await jusquAuTraitement(m);

  const r = await restituer({
    audio: m, item: ITEM, echoActive: true, vivant: () => true,
    messageVerdict: "Excellent.",
    resultat: resultat({ correct: true, blob: blobDe("correct") }),
    rejouer: (res) => m.rejouerVoix(res.blob)
  });

  // Décision produit assumée : sur une réponse correcte confirmée par
  // un moteur fiable, ni écho ni relecture du modèle. On avance.
  assert.deepEqual(r.sequence, ["retour"]);
  assert.equal(r.echoJoue, false);
  assert.equal(lectures.length, 0, "aucune lecture ne doit avoir lieu sur une bonne réponse");
  assert.equal(m.etat(), ETAT.RETOUR);
  assert.deepEqual(m.transitionsRefusees(), []);

  // L'exercice suivant doit pouvoir démarrer immédiatement.
  assert.equal(await m.direConsigne("Comment dis-tu : deux ?"), true);
  assert.equal(m.etat(), ETAT.MODELE);
  await m.terminer();
});

/* ---------- 8 · Écho désactivé ---------- */

test("ÉCHO DÉSACTIVÉ · aucune lecture, aucune transition vers PLAYING_ECHO", async () => {
  const { m, traversee, lectures } = banc();
  await jusquAuTraitement(m);

  const r = await restituer({
    audio: m, item: ITEM, echoActive: false, vivant: () => true,
    messageVerdict: "Presque.",
    resultat: resultat({ correct: false, blob: blobDe("sans-echo") }),
    rejouer: (res) => m.rejouerVoix(res.blob)
  });

  assert.deepEqual(r.sequence, ["retour", "modele"]);
  assert.equal(r.echoDemande, false);
  assert.equal(lectures.length, 0, "aucune lecture ne doit être déclenchée");
  assert.ok(!traversee.includes(ETAT.ECHO), "PLAYING_ECHO ne doit pas être traversé");
  assert.equal(m.etat(), ETAT.MODELE, "la séance continue normalement");
  assert.deepEqual(m.transitionsRefusees(), []);
  await m.terminer();
});

/* ---------- 9 · Échec de lecture ---------- */

for (const [nom, res] of [
  ["refus du navigateur", { etat: LECTURE.BLOQUEE_IOS, demarree: false, dureeMs: 0 }],
  ["format non décodable", { etat: LECTURE.DECODAGE, demarree: false, dureeMs: 0 }],
  ["interruption générique", { etat: LECTURE.DEMARREE_INTERROMPUE, demarree: true, dureeMs: 120 }]
]) {
  test(`ÉCHEC D'ÉCHO · ${nom} : signalé, non bloquant, séance poursuivie`, async () => {
    const { m } = banc({ resultatLecture: res });
    await jusquAuTraitement(m);

    const r = await restituer({
      audio: m, item: ITEM, echoActive: true, vivant: () => true,
      messageVerdict: "Presque.",
      resultat: resultat({ correct: false, blob: blobDe("echec") }),
      rejouer: (x) => m.rejouerVoix(x.blob)
    });

    assert.equal(r.echoJoue, false, "un échec ne doit jamais passer pour un succès");
    assert.equal(r.echoResultat.etat, res.etat);
    // Le modèle est joué malgré l'échec : la séance ne s'arrête pas.
    assert.deepEqual(r.sequence, ["retour", "echo", "modele"]);
    assert.equal(m.etat(), ETAT.MODELE);
    // L'échec est tracé.
    assert.ok(m.journal().some((l) => l.evt === "echo" && l.resultat === res.etat),
      "l'échec doit apparaître dans le journal technique");
    assert.deepEqual(m.transitionsRefusees(), []);
    await m.terminer();
  });
}

/* ---------- 10 · Double lecture ---------- */

test("AUCUNE DOUBLE LECTURE · un même enregistrement n'est jamais rejoué deux fois", async () => {
  const { m, lectures } = banc();
  await jusquAuTraitement(m);
  const blob = blobDe("unique");
  await restituer({
    audio: m, item: ITEM, echoActive: true, vivant: () => true,
    messageVerdict: "Presque.",
    resultat: resultat({ correct: false, blob }),
    rejouer: (res) => m.rejouerVoix(res.blob)
  });
  assert.equal(lectures.length, 1, `${lectures.length} lectures au lieu d'une`);
  assert.equal(lectures[0], blob, "le Blob rejoué n'est pas celui de la capture");
  await m.terminer();
});

/* ---------- 11 · Pause pendant l'écho ---------- */

test("PAUSE PENDANT L'ÉCHO · lecture stoppée, machine en pause, micro libéré", async () => {
  const Micro = await import(url("src/audio/mic.js"));
  const { m } = banc();
  await jusquAuTraitement(m);
  await m.direRetour("Presque.");
  await m.rejouerVoix(blobDe("pause"));
  assert.equal(m.etat(), ETAT.ECHO);

  assert.equal(await m.pause(), true, "la pause doit être acceptée depuis PLAYING_ECHO");
  assert.equal(m.etat(), ETAT.PAUSE);
  assert.equal(Micro.fluxOuvert(), false, "aucune ressource micro ne doit rester active");
  assert.deepEqual(m.transitionsRefusees(), []);

  assert.equal(m.reprendre(), true);
  await m.terminer();
});

/* ---------- 12 · Quitter pendant l'écho ---------- */

test("QUITTER PENDANT L'ÉCHO · tout est libéré, aucune ressource restante", async () => {
  const Micro = await import(url("src/audio/mic.js"));
  const { m } = banc();
  const dep = await jusquAuTraitement(m);
  await m.direRetour("Presque.");
  await m.rejouerVoix(blobDe("quitter"));
  assert.equal(m.etat(), ETAT.ECHO);

  await m.terminer("sortie");
  assert.equal(m.etat(), ETAT.REPOS);
  assert.equal(m.occupe(), false);
  assert.equal(m.vivant(dep.jeton), false, "l'ancien jeton doit être invalidé");
  assert.equal(Micro.fluxOuvert(), false);
  assert.ok(m.journal().some((l) => l.evt === "liberation_complete"));
});

/* ---------- 6 · Assertion transversale ---------- */

test("AUCUN PARCOURS NORMAL NE PRODUIT DE TRANSITION REFUSÉE", async () => {
  const cas = [
    { nom: "local avec écho", engine: "local", fiable: false, correct: false, echo: true },
    { nom: "local sans écho", engine: "local", fiable: false, correct: false, echo: false },
    { nom: "cloud incorrect avec écho", engine: "cloud", fiable: true, correct: false, echo: true },
    { nom: "cloud incorrect sans écho", engine: "cloud", fiable: true, correct: false, echo: false },
    { nom: "cloud correct avec écho", engine: "cloud", fiable: true, correct: true, echo: true },
    { nom: "cloud correct sans écho", engine: "cloud", fiable: true, correct: true, echo: false }
  ];
  for (const c of cas) {
    const { m } = banc();
    await jusquAuTraitement(m);
    await restituer({
      audio: m, item: ITEM, echoActive: c.echo, vivant: () => true,
      messageVerdict: "Retour.",
      resultat: resultat({ engine: c.engine, fiable: c.fiable, correct: c.correct, blob: blobDe(c.nom), messageRythme: "Ta réponse était courte." }),
      rejouer: (res) => m.rejouerVoix(res.blob)
    });
    // Enchaînement vers l'exercice suivant, comme le fait la boucle.
    await m.direConsigne("Comment dis-tu : deux ?");
    await m.attendreUtilisateur(0);

    assert.deepEqual(m.transitionsRefusees(), [],
      `${c.nom} : ${JSON.stringify(m.transitionsRefusees())}`);
    await m.terminer();
  }
});

test("la restitution s'arrête proprement si la séance est quittée en cours", async () => {
  const { m, lectures } = banc();
  await jusquAuTraitement(m);
  let vivant = true;
  const r = await restituer({
    audio: m, item: ITEM, echoActive: true, vivant: () => vivant,
    messageVerdict: "Presque.",
    resultat: resultat({ correct: false, blob: blobDe("quitte") }),
    rejouer: async (res) => { vivant = false; return m.rejouerVoix(res.blob); }
  });
  assert.equal(r.interrompu, true);
  assert.ok(!r.sequence.includes("modele"), "rien ne doit être joué après la sortie");
  assert.equal(lectures.length, 1);
  await m.terminer();
});
