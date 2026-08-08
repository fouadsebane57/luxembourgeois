# Lëtzebuergesch am Auto · v5.0.0

Apprentissage oral du luxembourgeois, conçu pour les trajets.

Ce lot corrige les blocages P0 et refait entièrement la chaîne vocale.
Aucun contenu luxembourgeois n'a été ajouté, modifié ou inventé.

**Le contenu reste volontairement à 35 leçons et 255 expressions.**
Une application orale avec 255 expressions et une reconnaissance qui fonctionne
vaut mieux qu'une application avec 5 000 expressions qui comprend mal.

---

## Par où commencer

1. `docs/DEPLOIEMENT.md` : mise en ligne, une étape à la fois.
2. `docs/PIPELINE_VOCAL.md` : pourquoi le micro échouait, chiffres à l'appui.
3. `docs/TESTS_TERRAIN.md` : protocole de tests sur téléphone et en voiture.
4. `docs/ROLLBACK.md` : retour arrière, trois niveaux.
5. `CHANGELOG.md` : tout ce qui change.

**Ne remplace pas ton `config.js` par celui du ZIP.**
Recopie tes trois valeurs Supabase dans `config.example.js`, puis renomme-le.

---

## Structure

```
index.html              coquille, 8 vues
config.example.js       modèle de configuration publique
cours.js                contenu, identifiants permanents
cours.legacy-map.json   table de migration des anciennes clés
styles.css              feuille de style
sw.js                   service worker
manifest.webmanifest    manifeste PWA

src/
  app.js                point d'entrée et orchestration
  core/
    content.js          accès au contenu par identifiant
    state.js            état, sauvegarde, file de synchronisation
    scheduler.js        répétition espacée à trois dimensions
    session.js          moteur de séance piloté par le temps
    migrate.js          migration des anciennes progressions
  audio/
    mic.js              permission, appareil, niveau, Bluetooth
    vad.js              détection de parole, plancher de bruit adaptatif
    recorder.js         enregistrement piloté par la détection
    tts.js              synthèse vocale
  speech/
    normalize.js        normalisation adaptée au luxembourgeois
    score.js            comparaison et verdict pédagogique
    engine.js           orchestration du pipeline complet
  data/
    supabase.js         authentification, profil, droits, progression
    sync.js             synchronisation, file hors ligne, conflits
  ui/
    render.js           rendu de la vue active
    diagnostic.js       diagnostic micro et mode test
  vendor/
    supabase.esm.js     client Supabase 2.112.2, local, pas de CDN

supabase/
  schema.sql            tables, index, RLS, policies, triggers, quota
  admin-outils.sql      Premium de test, suivi de consommation, contrôles
  functions/speech-transcribe/index.ts
  functions/delete-account/index.ts

tests/                  47 tests de non-régression
scripts/                génération des identifiants de contenu
docs/                   déploiement, migration, rollback, tests
```

Modules ES natifs. Aucun outil de construction. Les fichiers se déposent tels
quels sur GitHub Pages.

---

## Ce qui fonctionne sans backend

PWA installable, 35 leçons, séances minutées, répétition espacée, lexique,
favoris, statistiques, export et import, synthèse vocale, enregistrement,
écho de sa propre voix, reconnaissance de secours, hors ligne, diagnostic.

## Ce qui nécessite Supabase

Comptes, synchronisation multi-appareils, reconnaissance cloud `lb-LU`,
droits Premium, export RGPD, suppression de compte.

---

## Sécurité

Ne jamais placer dans `config.js` ni sur GitHub :

- `sb_secret_...` ou la clé `service_role`
- une clé secrète Stripe ou un secret de webhook
- la clé privée du compte de service Google

Ces valeurs vont uniquement dans les secrets des Edge Functions.
La clé publiable `sb_publishable_` est publique par conception, protégée par la RLS.

Le statut Premium est décidé par le serveur. Modifier `localStorage` ne débloque
plus rien.

---

## Tests

```
node --test "tests/*.test.mjs"
```

47 tests. Ils couvrent les identifiants permanents, la migration, la
normalisation luxembourgeoise, les seuils de comparaison, la règle selon
laquelle une panne technique n'écrit jamais, et la durée réelle des séances.

Douze d'entre eux vérifient que l'application démarre réellement : contenu
chargé, modules importés, vues rendues, migration effective, dégradation propre
sans micro ni réseau. Ils nécessitent jsdom :

```
npm install --no-save jsdom
node --test "tests/*.test.mjs"
```

Sans jsdom, ces douze tests sont ignorés et les 35 autres tournent normalement.

Régénérer les identifiants après modification du contenu :

```
node scripts/build-content-ids.mjs cours.js cours.js cours.legacy-map.json
```

Le script est idempotent. Il conserve les identifiants existants.

---

## Limites assumées

- **iOS écran verrouillé** : la synthèse vocale s'arrête. La promesse « pose le
  téléphone » n'est pas encore tenue sur iPhone écran éteint.
- **`lb-LU` sur `chirp_3`** : annoncé en Preview par Google au 7 août 2026, pas
  en disponibilité générale. À revérifier avant mise en vente.
- **Transcription et prononciation restent deux choses différentes.**
  L'application ne prétend pas noter un accent.
- **Aucune expression validée linguistiquement.** Le champ `st` vaut
  `unverified` sur les 255 expressions. Bloquant avant commercialisation.
- **Stripe non implémenté.** Volontaire, après stabilisation vocale.
- **Contenu servi en clair** dans `cours.js`. Le verrou Premium sur les leçons
  reste cosmétique tant que la distribution serveur n'existe pas.

---

Rédigé et conçu par :
Fouad SEBANE
