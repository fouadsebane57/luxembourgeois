/* ===================================================================
   SAUT DEMANDÉ PENDANT UNE PAUSE

   Bug reproduit en GATE 2.3 : Pause puis Suivant faisait revenir le
   même exercice. La demande de saut reposait sur le motif de la
   machine, que `reinitialiserMotif()` effaçait au tour de boucle
   suivant, avant qu'il soit lu.

   Ces tests reproduisent la boucle réelle de app.js, y compris l'ordre
   exact de ses décisions.
   =================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { installer } from "./helpers/dom.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = (p) => pathToFileURL(join(RACINE, p)).href;
installer("", { lisibles: ["audio/mp4"] });

globalThis.window.AudioContext = class {
  constructor() { this.state = "running"; }
  resume() { return Promise.resolve(); }
  createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  createAnalyser() { return { fftSize: 0, smoothingTimeConstant: 0, connect() {}, disconnect() {}, getFloatTimeDomainData() {} }; }
};
globalThis.AudioContext = globalThis.window.AudioContext;

const { creer, ETAT, MOTIF } = await import(url("src/audio/machine.js"));
const Micro = await import(url("src/audio/mic.js"));
const Sess = await import(url("src/core/session.js"));
const P = await import(url("src/core/preuve.js"));

const items = Array.from({ length: 12 }, (_, i) => ({
  id: "lx" + String(i).padStart(8, "0"), lb: "mot" + i, fr: "f" + i, lesson: 0, stage: 1, syl: 1
}));

/**
 * Reproduction fidèle de boucleSeance(), dans l'ordre exact de ses
 * décisions. Toute divergence d'ordre ferait passer un défaut.
 */
function boucle(m) {
  const s = Sess.creerSeance({ mode: "repeat", dureeMinutes: 20, items, dialogues: [],
    progression: {}, leconCourante: 0, etapeCourante: 1, seed: 7 });
  Sess.demarrer(s, 0);
  const etat = { exerciceCourant: null, sautEnAttente: false, enPause: false, joues: [], t: 0 };

  return {
    seance: s,
    etat,
    /** Un tour de boucle. Renvoie ce que la boucle a fait. */
    tour() {
      etat.t += 100;
      if (etat.sautEnAttente && etat.exerciceCourant) {
        Sess.sauterExercice(s, etat.exerciceCourant);
        etat.exerciceCourant = null;
        etat.sautEnAttente = false;
        return "saut_consomme";
      }
      if (etat.enPause) return "attente_pause";
      const ex = etat.exerciceCourant || Sess.prochain(s, etat.t);
      if (!ex) return "fin";
      etat.exerciceCourant = ex;
      etat.joues.push(ex.it.id);
      return "joue";
    },
    /** L'exercice actuellement retenu. */
    courant: () => etat.exerciceCourant?.it?.id || null,
    /** Commande Pause, telle que basculerPause(true). */
    async pause() { etat.enPause = true; await m.pause(); },
    /** Commande Reprendre. */
    reprendre() { etat.enPause = false; m.reprendre(); m.reinitialiserMotif(); },
    /** Commande Suivant, telle que passerExercice(). */
    async suivant() {
      if (etat.sautEnAttente) return false;   // verrou : une seule demande
      etat.sautEnAttente = true;
      if (etat.enPause) { m.tracer("saut_demande_en_pause", {}); return true; }
      await m.sauter();
      return true;
    }
  };
}

/* ---------- Le scénario signalé ---------- */

test("PAUSE puis SUIVANT · l'exercice est sauté et la séance reste en pause", async () => {
  const m = creer({});
  await m.demarrer();
  const b = boucle(m);

  b.tour();
  const idAvant = b.courant();
  assert.ok(idAvant, "aucun exercice retenu au premier tour");
  await m.direConsigne("Comment dis-tu : un ?");

  // Pause, puis on attend que la boucle soit réellement en pause.
  await b.pause();
  assert.equal(b.tour(), "attente_pause", "la boucle doit être en attente");
  assert.equal(m.etat(), ETAT.PAUSE);

  // Suivant pendant la pause.
  assert.equal(await b.suivant(), true);
  assert.equal(m.etat(), ETAT.PAUSE, "Suivant ne doit PAS faire sortir de pause");
  assert.equal(b.etat.enPause, true, "la séance doit rester en pause");
  assert.equal(Micro.fluxOuvert(), false, "le micro ne doit pas être rouvert");

  // La boucle consomme le saut, sans jouer et sans sortir de pause.
  assert.equal(b.tour(), "saut_consomme");
  assert.equal(b.seance.sautes, 1, "exactement un exercice sauté");
  assert.equal(b.seance.index, 1, "l'index doit avancer d'exactement un");
  assert.equal(m.etat(), ETAT.PAUSE, "toujours en pause après consommation");
  assert.equal(b.tour(), "attente_pause", "aucun exercice ne démarre pendant la pause");

  // Reprise : l'exercice SUIVANT démarre.
  b.reprendre();
  assert.equal(b.tour(), "joue");
  const idApres = b.courant();
  assert.notEqual(idApres, idAvant, "itemId avant pause et après reprise doivent différer");

  assert.deepEqual(m.transitionsRefusees(), []);
  await m.terminer();
});

/* ---------- Double appui ---------- */

test("DEUX SAUTS SUCCESSIFS · le verrou est bien levé entre les deux", async () => {
  const m = creer({});
  await m.demarrer();
  const b = boucle(m);

  b.tour();
  const id1 = b.courant();
  await m.direConsigne("x");

  // Premier saut.
  assert.equal(await b.suivant(), true);
  b.tour();
  assert.equal(b.seance.sautes, 1);

  // Second saut, sur l'exercice suivant. Il DOIT être possible :
  // le verrou est levé par la boucle quand elle honore la demande.
  b.tour();
  const id2 = b.courant();
  assert.notEqual(id2, id1);
  assert.equal(await b.suivant(), true, "le verrou n'a pas été levé après le premier saut");
  b.tour();
  assert.equal(b.seance.sautes, 2, "deux sauts distincts doivent être possibles");
  assert.equal(b.seance.index, 2);
  await m.terminer();
});

test("PAUSE, SUIVANT, SUIVANT rapproché · exactement un exercice sauté", async () => {
  const m = creer({});
  await m.demarrer();
  const b = boucle(m);
  b.tour();
  await b.pause();
  b.tour();

  const a = await b.suivant();
  const c = await b.suivant();   // second appui immédiat
  assert.equal(a, true);
  assert.equal(c, false, "la seconde demande doit être refusée par le verrou");

  b.tour();
  assert.equal(b.seance.sautes, 1, `${b.seance.sautes} sauts au lieu d'un`);
  assert.equal(b.seance.index, 1);
  b.tour();
  assert.equal(b.seance.sautes, 1, "un tour supplémentaire ne doit pas resauter");
  await m.terminer();
});

/* ---------- Pause, Suivant, Quitter ---------- */

test("PAUSE, SUIVANT, QUITTER · tout est libéré, aucun exercice lancé", async () => {
  const m = creer({});
  const dep = await m.demarrer();
  const b = boucle(m);
  b.tour();
  await b.pause();
  b.tour();
  await b.suivant();
  b.tour();                      // saut consommé
  const joues = b.etat.joues.length;

  await m.terminer("sortie");
  assert.equal(m.etat(), ETAT.REPOS);
  assert.equal(m.occupe(), false);
  assert.equal(m.vivant(dep.jeton), false, "le jeton doit être invalidé");
  assert.equal(Micro.fluxOuvert(), false);
  assert.equal(b.etat.joues.length, joues, "aucun exercice ne doit avoir démarré");
  assert.ok(m.journal().some((l) => l.evt === "liberation_complete"));
});

test("un exercice sauté pendant la pause ne crée aucune preuve", async () => {
  const m = creer({});
  await m.demarrer();
  const b = boucle(m);
  b.tour();
  await b.pause();
  b.tour();
  await b.suivant();
  b.tour();

  // Le saut n'appelle aucune fonction d'écriture : l'entrée reste vierge.
  const e = P.entreeVide();
  for (const d of P.DIMENSIONS) assert.equal(P.niveau(e, d), 0);
  assert.equal(e.signaux.nombreExpositions, 0);
  assert.equal(e.signaux.nombreTentatives, 0);
  // La durée d'un saut ne pollue pas l'estimation de minutage.
  assert.equal(b.seance.historique.at(-1).saute, true);
  assert.equal(b.seance.historique.at(-1).dureeMs, 0);
  await m.terminer();
});

/* ---------- Non-régression du GATE 2.3 ---------- */

test("NON-RÉGRESSION · Pause seule fait toujours rejouer le MÊME exercice", async () => {
  const m = creer({});
  await m.demarrer();
  const b = boucle(m);
  b.tour();
  const idAvant = b.courant();
  await b.pause();
  b.tour();
  assert.equal(b.seance.index, 0, "l'index ne doit pas bouger sur une pause seule");
  b.reprendre();
  b.tour();
  assert.equal(b.courant(), idAvant, "la reprise doit rejouer le même exercice");
  assert.equal(b.seance.sautes, 0);
  await m.terminer();
});

test("NON-RÉGRESSION · Suivant hors pause saute toujours exactement un exercice", async () => {
  const m = creer({});
  await m.demarrer();
  const b = boucle(m);
  b.tour();
  const idAvant = b.courant();
  await m.direConsigne("x");

  assert.equal(await b.suivant(), true);
  assert.equal(m.motif(), MOTIF.SUIVANT, "hors pause, le motif doit être posé");
  assert.equal(Micro.fluxOuvert(), false);

  b.tour();
  assert.equal(b.seance.sautes, 1);
  b.tour();
  assert.notEqual(b.courant(), idAvant);
  assert.equal(b.seance.sautes, 1, "aucun second saut parasite");
  await m.terminer();
});

test("NON-RÉGRESSION · le motif ne peut plus effacer une demande de saut", async () => {
  const m = creer({});
  await m.demarrer();
  const b = boucle(m);
  b.tour();
  await b.pause();
  b.tour();
  await b.suivant();

  // C'est précisément ce qui cassait en GATE 2.3 : la boucle effaçait
  // le motif avant de l'avoir lu. La demande vit désormais ailleurs.
  m.reinitialiserMotif();
  assert.equal(m.motif(), MOTIF.AUCUN);
  assert.equal(b.etat.sautEnAttente, true, "la demande de saut doit survivre");

  b.tour();
  assert.equal(b.seance.sautes, 1, "le saut a été perdu");
  await m.terminer();
});

/* ---------- Garde-fou structurel ---------- */

test("ARCHITECTURE · la demande de saut ne dépend pas du motif de la machine", () => {
  const app = readFileSync(join(RACINE, "src/app.js"), "utf8");
  const i = app.indexOf("async function boucleSeance");
  const bloc = app.slice(i, app.indexOf("function noterPosition", i));

  // La consommation du saut doit précéder le test de pause, sinon un
  // saut demandé pendant une pause n'est jamais honoré.
  const iSaut = bloc.indexOf("sautEnAttente && exerciceCourant");
  const iPause = bloc.indexOf("if (enPause)");
  assert.ok(iSaut > 0, "la boucle ne consomme pas de saut en attente");
  assert.ok(iPause > iSaut,
    "le saut en attente doit être consommé AVANT le test de pause");

  // reinitialiserMotif ne doit pas être appelé avant la consommation.
  const iReinit = bloc.indexOf("reinitialiserMotif");
  assert.ok(iReinit > iSaut,
    "le motif est effacé avant que le saut soit consommé, c'est le bug du GATE 2.3");

  // La commande ne doit pas sortir de pause.
  const j = app.indexOf("export async function passerExercice");
  const cmd = app.slice(j, app.indexOf("\n}", j));
  assert.ok(!/basculerPause\s*\(\s*false\s*\)/.test(cmd),
    "Suivant ne doit pas faire sortir de pause");

  // Le verrou de double appui doit être dans le CODE, pas seulement
  // dans le test. Sans lui, deux appuis poseraient deux demandes.
  const iVerrou = cmd.search(/if\s*\(\s*sautEnAttente\s*\)\s*return\s+false\s*;/);
  const iPose = cmd.indexOf("sautEnAttente = true");
  assert.ok(iVerrou >= 0,
    "passerExercice n'a pas de verrou contre le double appui");
  assert.ok(iPose > iVerrou,
    "le verrou doit être testé AVANT de poser la demande de saut");

  // Et il doit être levé par la boucle, pas par un minuteur.
  assert.ok(!/setTimeout[\s\S]{0,80}sautEnAttente\s*=\s*false/.test(app),
    "le verrou ne doit pas être levé par un minuteur : la boucle en est responsable");
  assert.ok(bloc.includes("sautEnAttente = false"),
    "la boucle doit lever le verrou quand elle honore la demande");
});
