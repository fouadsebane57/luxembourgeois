/* Migration 5 vers 6 : aucune perte silencieuse, retour arrière possible. */
import test from "node:test";
import assert from "node:assert/strict";
import { migrerProgression, verifierMigration, migrerLocalV6, restaurerV5,
         CLE_V5, CLE_V6, CLE_SAUVEGARDE_V5 } from "../src/core/migration6.js";
import * as P from "../src/core/preuve.js";

function stockage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    lire: (k) => m.get(k) ?? null,
    ecrire: (k, v) => m.set(k, v),
    supprimer: (k) => m.delete(k),
    contenu: () => Object.fromEntries(m)
  };
}

const progression5 = {
  lx00000001: { comprehension: 6, production: 5, pronunciation: 2, seen: 30, errors: 1, nextDue: 0 },
  lx00000002: { comprehension: 1, production: 0, pronunciation: 0, seen: 2, errors: 0 },
  lx00000003: { comprehension: 7, production: 7, pronunciation: 7, seen: 90, errors: 0 }
};

test("l'héritage est copié à l'identique, sans altération", () => {
  const { progression } = migrerProgression(progression5);
  const v = verifierMigration(progression5, progression);
  assert.equal(v.ok, true, JSON.stringify(v.problemes));
  assert.equal(progression.lx00000001.legacy.comprehension, 6);
  assert.equal(progression.lx00000001.legacy.production, 5);
  assert.equal(progression.lx00000001.legacy.seen, 30);
  assert.equal(progression.lx00000001.legacy.errors, 1);
});

test("REGLE 4 · aucune dimension n'est préremplie par la migration", () => {
  const { progression, rapport } = migrerProgression(progression5);
  assert.equal(rapport.dimensionsPromues, 0);
  for (const id of Object.keys(progression5)) {
    for (const d of P.DIMENSIONS) {
      assert.equal(P.niveau(progression[id], d), 0, `${id} ${d} prérempli`);
    }
    assert.equal(P.estSolide(progression[id]), false);
  }
});

test("la progression historique reste consultable séparément", () => {
  const { progression } = migrerProgression(progression5);
  assert.equal(P.niveauHistorique(progression.lx00000003, P.DIM.COMPREHENSION), 7);
  assert.equal(P.etaitSolideHistoriquement(progression.lx00000003), true);
  assert.equal(P.aHistorique(progression.lx00000002), true);
  // Elle ordonne la file sans valoir maîtrise.
  assert.equal(P.familiariteHistorique(progression.lx00000003), 2);
  assert.equal(P.familiariteHistorique(progression.lx00000002), 1);
});

test("toutes les entrées sont migrées, aucune perdue", () => {
  const { progression, rapport } = migrerProgression(progression5);
  assert.equal(rapport.entrees, 3);
  assert.equal(rapport.heritagePerdu, 0);
  assert.equal(Object.keys(progression).length, 3);
});

test("la migration est idempotente", () => {
  const a = migrerProgression(progression5).progression;
  const b = migrerProgression(a);
  assert.equal(b.rapport.dejaV6, 3);
  assert.equal(P.niveauHistorique(b.progression.lx00000001, P.DIM.COMPREHENSION), 6);
  assert.equal(P.niveau(b.progression.lx00000001, P.DIM.COMPREHENSION), 0);
});

test("REGLE : une sauvegarde est écrite avant toute transformation", () => {
  const st = stockage({ [CLE_V5]: JSON.stringify({ schema: 5, progress: progression5 }) });
  const { etat, rapport } = migrerLocalV6(st.lire, st.ecrire);
  assert.equal(rapport.sauvegarde, true);
  assert.equal(rapport.effectuee, true);
  assert.ok(st.lire(CLE_SAUVEGARDE_V5), "sauvegarde absente");
  assert.equal(etat.schema, 6);
});

test("REGLE : un héritage altéré bloque la migration", () => {
  const avant = { a: { comprehension: 5 } };
  const casse = { a: { schema: 6, dims: {}, legacy: { comprehension: 2 } } };
  const v = verifierMigration(avant, casse);
  assert.equal(v.ok, false);
  assert.equal(v.problemes[0].cause, "héritage altéré");
});

test("REGLE : une dimension préremplie bloque la migration", () => {
  const avant = { a: { comprehension: 5, production: 5, pronunciation: 0, seen: 0, errors: 0 } };
  const triche = { a: { schema: 6,
    dims: { production: { n: 5 } },
    legacy: { comprehension: 5, production: 5, pronunciation: 0, seen: 0, errors: 0 } } };
  const v = verifierMigration(avant, triche);
  assert.equal(v.ok, false);
  assert.ok(v.problemes.some((x) => x.cause === "dimension préremplie par la migration"));
});

test("une entrée disparue est détectée", () => {
  const v = verifierMigration({ a: { comprehension: 3 } }, {});
  assert.equal(v.ok, false);
  assert.equal(v.problemes[0].cause, "entrée disparue");
});

test("le retour arrière restaure exactement l'état précédent", () => {
  const st = stockage({ [CLE_V5]: JSON.stringify({ schema: 5, progress: progression5 }) });
  migrerLocalV6(st.lire, st.ecrire);
  st.ecrire(CLE_V6, JSON.stringify({ schema: 6, progress: {} }));

  const r = restaurerV5(st.lire, st.ecrire, st.supprimer);
  assert.equal(r.ok, true);
  const restaure = JSON.parse(st.lire(CLE_V5));
  assert.deepEqual(restaure.progress, progression5);
  assert.equal(st.lire(CLE_V6), null, "l'état 6 doit être retiré");
});

test("sans progression antérieure, la migration ne fabrique rien", () => {
  const st = stockage();
  const { etat, rapport } = migrerLocalV6(st.lire, st.ecrire);
  assert.equal(etat, null);
  assert.equal(rapport.effectuee, false);
});
