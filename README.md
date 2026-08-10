# LULU Trajet · 5.1.0

Apprendre le luxembourgeois **en audio, pendant les trajets**.
Écoute. Répète. Progresse. Le moins d'écran possible.

---

## À FAIRE EN PREMIER

Ta reconnaissance vocale ne marchait pas parce que `config.js` contenait
trois valeurs vides. Ouvre **`docs/CONFIGURER.md`** et suis les sept
étapes, clic par clic. C'est le seul document nécessaire pour la remettre
en marche.

Ensuite, `docs/TEST_IPHONE.md` pour vérifier sur ton téléphone.

---

## Les autres documents

| Fichier | À quoi il sert |
|---|---|
| `docs/CONFIGURER.md` | remettre la reconnaissance vocale en marche |
| `docs/TEST_IPHONE.md` | vérifier sur iPhone, case par case |
| `docs/DEPLOIEMENT.md` | Supabase et Google Cloud, une étape à la fois |
| `docs/PIPELINE_VOCAL.md` | comment fonctionne la chaîne audio |
| `docs/ROLLBACK.md` | revenir en arrière, trois niveaux |
| `CHANGELOG.md` | tout ce qui change dans cette version |

---

## Structure

```
index.html                coquille, 8 vues
config.example.js         modèle à remplir puis renommer en config.js
cours.js                  contenu, identifiants permanents, table de migration
cours.legacy-map.json     table de migration, copie de secours
styles.css                feuille de style
sw.js                     service worker, config.js jamais mis en cache
manifest.webmanifest      manifeste PWA
assets/logo.svg           source du logo
icon-*.png                icônes générées

src/
  app.js                  orchestration, séance, reprise
  core/
    config.js             contrôle de la configuration, champ par champ
    content.js            accès au contenu par identifiant
    state.js              état, sauvegarde locale, position de reprise
    scheduler.js          répétition espacée à trois dimensions
    session.js            moteur de séance piloté par le temps
    migrate.js            migration des anciennes progressions
  audio/
    mic.js                permission, appareil, moteur audio, niveau borné
    vad.js                détection de parole, seuils bornés
    recorder.js           enregistrement piloté par la détection
    tts.js                synthèse vocale, recherche réelle de lb-LU
  speech/
    normalize.js          normalisation adaptée au luxembourgeois
    score.js              comparaison et verdict
    engine.js             pipeline complet, causes d'échec précises
    erreurs.js            quatorze causes, chacune avec son action
  data/
    supabase.js           comptes, droits, progression
    sync.js               synchronisation, file hors ligne
  ui/
    render.js             rendu de la vue active
    diagnostic.js         diagnostic détaillé et mode test
    commandes.js          commandes vocales, avec limites iOS assumées
  vendor/
    supabase.esm.js       client Supabase 2.112.2, local, sans CDN

supabase/
  schema.sql              tables, RLS, déclencheurs, quota
  admin-outils.sql        Premium de test, suivi de consommation
  functions/speech-transcribe/index.ts
  functions/delete-account/index.ts

tests/                    63 tests de non-régression
scripts/                  génération des identifiants de contenu
```

Modules ES natifs. Aucun outil de construction. Les fichiers se déposent
tels quels sur GitHub Pages.

---

## Ce qui fonctionne sans rien configurer

**La boucle complète d'apprentissage oral.** Le modèle est prononcé, tu
répètes, l'application mesure ta tentative, rejoue le modèle, rejoue ta
voix, et te laisse juger. Ta progression avance.

Également : les 35 leçons, les séances minutées, la répétition espacée,
le lexique, les favoris, les statistiques, la reprise exacte,
l'enregistrement, le mode hors ligne, l'installation sur l'écran
d'accueil, le diagnostic complet.

### Ce que l'analyse locale mesure vraiment

Elle compte les groupes d'énergie de ta voix et les compare au nombre de
syllabes attendu, déduit du guide de prononciation. Elle sait donc dire
si tu as parlé, combien de temps, et à quel rythme.

Elle ne sait **pas** juger tes phonèmes. « fënnef » et « bébé » ont deux
syllabes et lui paraissent identiques. C'est pourquoi elle n'écrit jamais
seule dans ta progression : c'est ton propre jugement, après avoir
entendu le modèle puis ta voix, qui fait avancer.

Pour une vraie évaluation des mots prononcés, il faut la reconnaissance
`lb-LU`, donc `docs/CONFIGURER.md` puis `docs/DEPLOIEMENT.md`.

## Ce qui nécessite Supabase

Les comptes, la synchronisation entre appareils, la reconnaissance
luxembourgeoise `lb-LU`, les droits Premium, l'export et la suppression
des données.

---

## Sécurité

`config.js` est public. Il ne doit contenir que :
l'adresse Supabase, la clé **publiable**, l'adresse des fonctions.

Ne jamais y mettre, ni sur GitHub :
`sb_secret_`, `service_role`, une clé Stripe secrète, un secret de
webhook, la clé privée du compte de service Google.

Ces valeurs vont uniquement dans les secrets des Edge Functions.

Le statut Premium est décidé par le serveur. Modifier le stockage local
ne débloque rien.

---

## Tests

```
npm test
```

Aucune dépendance à installer. Node 20 ou plus récent suffit.

Ils couvrent les identifiants permanents, la migration sans perte, la
normalisation luxembourgeoise, les seuils de comparaison, la durée réelle
des séances, les bornes de la mesure audio, la sélection du format,
la détection d'une configuration incomplète, le parcours audio complet
état par état, et un garde-fou d'architecture qui échoue si un module
contourne l'orchestrateur audio.

Régénérer les identifiants après modification du contenu :

```
npm run contenu
```

Le script est idempotent : il conserve les identifiants existants.

---

## Limites assumées

- **iPhone écran verrouillé** : la synthèse vocale s'arrête. La promesse
  « pose le téléphone » n'est donc pas tenue écran éteint. Garde l'écran
  allumé, ou utilise un support alimenté.
- **Commandes vocales indisponibles sur iPhone.** Volontaire. La
  reconnaissance continue y est trop peu fiable et bloque le micro de
  l'exercice. Les boutons du volant les remplacent.
- **`lb-LU` sur `chirp_3`** : annoncé en Preview par Google, pas en
  disponibilité générale.
- **Transcription et prononciation sont deux choses différentes.**
  L'application ne prétend pas noter un accent.
- **Aucune expression validée linguistiquement.** Les 255 portent
  `st: "unverified"`. Bloquant avant commercialisation.
- **Stripe non implémenté.**

---

Rédigé et conçu par :
Fouad SEBANE
