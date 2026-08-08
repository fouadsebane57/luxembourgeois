import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStrict, normalizeLoose, charSimilarity } from "../src/speech/normalize.js";

test("la casse, la ponctuation et les espaces sont neutralisés", () => {
  assert.equal(normalizeStrict("  Moien,  wéi   geet et ?  "), "moien wéi geet et");
  assert.equal(normalizeStrict("Wat kascht dat?"), "wat kascht dat");
});

test("les apostrophes typographiques sont unifiées", () => {
  assert.equal(normalizeStrict("d\u2019Auer"), "d'auer");
  assert.equal(normalizeStrict("d\u02BCAuer"), "d'auer");
  assert.equal(normalizeStrict("d ' Auer"), "d'auer");
});

test("REGRESSION P1-2 : les voyelles luxembourgeoises sont conservées", () => {
  assert.equal(normalizeStrict("fënnef"), "fënnef");
  assert.equal(normalizeStrict("schéin"), "schéin");
  assert.equal(normalizeStrict("gär"), "gär");
});

test("REGRESSION P1-2 : gär et gar ne sont plus confondus", () => {
  assert.notEqual(normalizeStrict("gär"), normalizeStrict("gar"));
  assert.notEqual(normalizeStrict("méi"), normalizeStrict("mei"));
  assert.notEqual(normalizeStrict("wäit"), normalizeStrict("wait"));
  assert.notEqual(normalizeStrict("fënnef"), normalizeStrict("fennef"));
});

test("le niveau souple replie les accents, et lui seul", () => {
  assert.equal(normalizeLoose("gär"), "gar");
  assert.equal(normalizeLoose("fënnef"), "fennef");
  assert.equal(normalizeLoose("Lëtzebuerg"), "letzebuerg");
});

test("la similarité caractère est bornée entre 0 et 1", () => {
  assert.equal(charSimilarity("moien", "moien"), 1);
  assert.ok(charSimilarity("moien", "xxxxx") >= 0);
  assert.ok(charSimilarity("moien", "moin") < 1);
});
