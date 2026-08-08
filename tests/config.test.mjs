/* La configuration vide était la cause réelle du blocage cloud.
   Ces tests garantissent qu'elle est détectée et expliquée. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = (p) => pathToFileURL(join(RACINE, p)).href;

function poser(config) {
  Object.defineProperty(globalThis, "window", { value: { LULU_CONFIG: config }, configurable: true, writable: true });
}

const Cfg = await import(url("src/core/config.js"));
const { CAUSE } = await import(url("src/speech/erreurs.js"));

test("configuration absente : cause identifiée", () => {
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true, writable: true });
  const v = Cfg.verifier();
  assert.equal(v.ok, false);
  assert.equal(v.cause, CAUSE.CONFIG_ABSENTE);
});

test("REGRESSION : trois valeurs vides, exactement le cas rencontré", () => {
  poser({ supabaseUrl: "", supabaseAnonKey: "", functionsBaseUrl: "" });
  const v = Cfg.verifier();
  assert.equal(v.ok, false);
  assert.equal(v.cause, CAUSE.CONFIG_INCOMPLETE);
  assert.equal(v.manquants.length, 3);
  // Le message doit NOMMER les champs, pas dire « non configurée ».
  for (const cle of ["supabaseUrl", "supabaseAnonKey", "functionsBaseUrl"]) {
    assert.ok(v.resume.includes(cle), `${cle} absent du message`);
  }
});

test("une seule valeur vide est signalée nommément", () => {
  poser({
    supabaseUrl: "https://abcdefgh.supabase.co",
    supabaseAnonKey: "",
    functionsBaseUrl: "https://abcdefgh.supabase.co/functions/v1"
  });
  const v = Cfg.verifier();
  assert.equal(v.ok, false);
  assert.deepEqual(v.manquants.map((m) => m.cle), ["supabaseAnonKey"]);
});

test("un format inattendu est distingué d'une valeur vide", () => {
  poser({
    supabaseUrl: "htp://mauvaise-adresse",
    supabaseAnonKey: "sb_publishable_aaaaaaaaaaaaaaaaaaaaaaaa",
    functionsBaseUrl: "https://abcdefgh.supabase.co/functions/v1"
  });
  const v = Cfg.verifier();
  assert.equal(v.ok, false);
  assert.equal(v.manquants.length, 0);
  assert.equal(v.malformes[0].cle, "supabaseUrl");
});

test("configuration complète : validée", () => {
  poser({
    supabaseUrl: "https://abcdefgh.supabase.co",
    supabaseAnonKey: "sb_publishable_aaaaaaaaaaaaaaaaaaaaaaaa",
    functionsBaseUrl: "https://abcdefgh.supabase.co/functions/v1"
  });
  const v = Cfg.verifier();
  assert.equal(v.ok, true, v.resume);
  assert.equal(Cfg.configureeSupabase(), true);
});

test("l'ancienne clé anon eyJ reste acceptée", () => {
  poser({
    supabaseUrl: "https://abcdefgh.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.exemple.signature",
    functionsBaseUrl: "https://abcdefgh.supabase.co/functions/v1"
  });
  assert.equal(Cfg.verifier().ok, true);
});

test("le rapport ne révèle jamais une clé entière", () => {
  const cle = "sb_publishable_" + "z".repeat(60);
  poser({
    supabaseUrl: "https://abcdefgh.supabase.co",
    supabaseAnonKey: cle,
    functionsBaseUrl: "https://abcdefgh.supabase.co/functions/v1"
  });
  const champ = Cfg.verifier().champs.find((c) => c.cle === "supabaseAnonKey");
  assert.ok(!champ.apercu.includes(cle), "la clé complète apparaît dans l'aperçu");
  assert.ok(champ.apercu.includes("caractères"));
});

test("le fichier config.example.js livré est syntaxiquement valide", () => {
  const s = { window: {} };
  vm.createContext(s);
  vm.runInContext(readFileSync(join(RACINE, "config.example.js"), "utf8"), s);
  assert.ok(s.window.LULU_CONFIG, "LULU_CONFIG non défini");
  assert.equal(s.window.LULU_CONFIG.appVersion, "5.1.0");
  // Compatibilité avec la version précédente.
  assert.equal(s.window.LETZ_CONFIG, s.window.LULU_CONFIG);
});
