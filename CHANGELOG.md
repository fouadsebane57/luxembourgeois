# CHANGELOG

## 5.1.0 · GATE 2.5 · file de séance par candidatures

Version produit inchangée. Build de cache : `gate2-5`.

Corrigé :

- doublons accidentels dans la file, issus du recouvrement de `neufs`,
  `dus`, `enCours`, `leconItems` et `solides`. Le scénario
  `Pause → Suivant → Reprendre` ne peut plus ramener la même expression
  dès qu'une autre est disponible,
- mêmes doublons dans la réserve de recyclage,
- répétition possible au passage de la file au recyclage et à chaque
  bouclage de la réserve,
- occurrences perdues sans trace quand la fin de séance imposait un
  exercice plus court pris plus loin dans la file,
- saut d'une découverte qui laissait sa répétition soudée en place,
  donc ramenait aussitôt l'expression écartée.

Ajouté :

- `src/core/file.js`, construction de la file par candidatures :
  `itemId`, `source`, `raison`, `priorite`, `echeance`,
  `intentionnelle`, `adjacenceVoulue`,
- `src/core/rng.js`, aléa injectable. `Math.random()` a quitté le moteur
  de séance. Une graine redonne exactement la même file,
- `seance.diagnosticFile`, traçabilité des fusions, déplacements et
  adjacences subies,
- `tests/file.test.mjs`, 42 tests sur les graines 1, 2, 3, 10, 42, 100,
  999 et 2026,
- `docs/GATE2.5.md`.

Conservé :

- les répétitions pédagogiques voulues. Trois passages en mode chiffres,
  couple écoute puis répétition en mode voiture. Elles sont déplacées,
  jamais supprimées.

## 5.1.0 · 8 août 2026 · LULU Trajet

Changement de nom, nouvelle identité, écran d'accueil avec reprise, et
surtout deux pannes réelles corrigées, mesurées sur l'iPhone de
l'utilisateur.

### Cause n°1 · La reconnaissance cloud était réellement non configurée

Le fichier `config.js` déployé sur GitHub était celui de la version 4 :
`supabaseUrl`, `supabaseAnonKey` et `functionsBaseUrl` valaient chacun
la chaîne vide, et `appVersion` valait encore `4.0.0`. Les valeurs
avaient été saisies dans `config.example.js`, jamais renommé.

L'application avait donc raison. Elle était simplement incapable de le
dire utilement. Corrections :

- nouveau module `src/core/config.js` qui contrôle chaque champ,
  distingue une valeur vide d'un format inattendu, et affiche lequel,
- le diagnostic nomme désormais le champ fautif, pas seulement
  « non configurée dans config.js »,
- `config.example.js` porte un mode d'emploi en tête et indique
  explicitement où trouver la clé et comment renommer le fichier,
- `docs/CONFIGURER.md` reprend la procédure clic par clic.

### Cause n°2 · Le moteur audio d'iOS n'était jamais attendu

Sur iPhone, un `AudioContext` naît suspendu. La 5.0.0 appelait
`resume()` sans attendre le résultat. L'analyseur lisait donc du zéro,
la mesure partait vers moins l'infini, et le plancher adaptatif de la
détection de parole s'effondrait.

Valeurs relevées sur l'appareil de l'utilisateur, toutes physiquement
impossibles :

| Affiché | Plafond réel |
|---|---|
| bruit ambiant -150 dB | -100 dB |
| seuil de détection -527 dB | -58 dB |
| signal sur bruit 514 dB | 70 dB |
| 2520 ms de parole | sur du silence |

Le seuil étant absurde, tout le dépassait. La détection annonçait de la
parole sur du vide, l'enregistrement ne contenait rien, et la
comparaison n'avait rien à comparer. Corrections :

- `reveiller()` attend réellement l'état `running` avant toute mesure,
- la mesure en décibels est bornée entre -100 et 0, sans exception,
- le plancher de bruit reste dans un intervalle fixé par profil,
- le seuil ne descend jamais sous une valeur absolue,
- un pic sous -55 dBFS n'est jamais déclaré comme de la parole,
- une mesure obtenue moteur audio endormi est signalée non fiable et
  n'alimente aucune décision.

### Cause n°3 · La reconnaissance de secours se heurtait au micro

Sur iPhone, `Temps écoulé` systématique. La reconnaissance du navigateur
était lancée alors que le flux micro de l'exercice était encore ouvert.
Sur iOS, elle ne peut pas s'en emparer. Le micro est désormais libéré
avant l'appel.

### Mode autonome · l'application fonctionne enfin sans serveur

Défaut majeur de la 5.0.0, corrigé ici. Sans `config.js` valide et sans
Edge Function déployée, la boucle « écoute, répète, retour » était
morte : l'application se contentait d'annoncer une panne.

Elle dispose désormais d'une analyse locale, sans réseau, sans compte,
sans configuration.

Ce qu'elle mesure réellement :
l'utilisateur a-t-il parlé, pendant combien de temps, avec combien de
groupes d'énergie, à quel débit. Le nombre de syllabes attendu est
déduit du guide de prononciation déjà présent dans les données, et
ajouté au fichier de contenu sous le champ `syl`. Il est mesurable pour
247 des 255 expressions ; les 8 restantes sont explicitement écartées
plutôt que mal jugées.

Ce qu'elle ne mesure pas, et ne prétend jamais mesurer :
les phonèmes, l'accent, la justesse. « fënnef » et « bébé » ont deux
syllabes et sont indiscernables par cette méthode. Un test le vérifie
et le documente.

Conséquence assumée : en mode autonome, **rien ne s'écrit
automatiquement dans la progression**. La séance joue le modèle, rejoue
l'enregistrement de l'utilisateur, puis lui demande de juger. C'est le
fonctionnement des méthodes orales éprouvées, et c'est honnête.

Nouveau mode `Écoute et répète`, annoncé comme fonctionnant hors ligne.
Le diagnostic affiche `Mode autonome · actif` comme un état sain, pas
comme un pis-aller.

Neuf tests supplémentaires, dont un intitulé « limite assumée » qui fixe
noir sur blanc ce que la méthode ne sait pas faire.

### Diagnostics

Fin des « À régler » muets. Quatorze causes distinctes, chacune avec un
titre, une explication et l'action exacte à faire :

configuration absente, configuration incomplète, compte requis, fonction
serveur introuvable, requête bloquée par le navigateur, serveur
injoignable, authentification refusée, quota atteint, erreur serveur,
format audio refusé, enregistrement trop long, délai dépassé,
transcription vide, aucun moteur disponible.

Le code HTTP seul ne suffisant pas, la traduction tient compte du corps
de la réponse : un quota renvoyé en 403 n'est plus confondu avec un refus
d'authentification.

### Identité

- Nom `LULU Trajet` partout : interface, manifeste, pages légales,
  documentation, titres, métadonnées, messages.
- Nouveau logo : voiture de profil sous trois arcs aux couleurs du
  drapeau luxembourgeois, redressés en ondes sonores. Testé à 48 pixels.
- Icônes 192, 512, 180 pour iPhone, 32, plus deux versions maskable
  pour Android.
- Clés de stockage `lulu:v5`. L'ancienne `letz:v5` est reprise
  automatiquement, aucune progression perdue.

### Écran d'accueil et reprise

- Salutation selon l'heure, en luxembourgeois le matin et le soir.
- Anneau de progression, leçons terminées, expressions solides, temps
  d'écoute, jours consécutifs.
- Bouton unique et très large : `Reprendre mon trajet`.
- La position est mémorisée **après chaque exercice**. Une fermeture
  brutale, un appel entrant ou une batterie vide ne fait donc perdre au
  maximum qu'un exercice.
- L'application ne recommence jamais au début quand une progression
  existe.
- La position la plus récente gagne lors d'une synchronisation entre
  deux appareils.

### Mode voiture

- Cibles tactiles de 64 pixels minimum, deux colonnes sur téléphone.
- Boutons du volant et de l'autoradio via la Media Session : lecture,
  pause, piste suivante pour passer, piste précédente pour répéter.
- Commandes vocales `Répète`, `Suivant`, `Précédent`, `Pause`,
  `Continue`, désactivées par défaut et **volontairement indisponibles
  sur iPhone**. La reconnaissance continue y exige un geste utilisateur
  à chaque relance et bloque le micro de l'exercice. L'application le dit
  au lieu de faire semblant.

### Synthèse vocale

Recherche par ordre de préférence : `lb-LU`, puis `de-LU`, puis allemand
standard, puis néerlandais. La voix réellement utilisée est nommée dans
le diagnostic, avec son niveau de fidélité. Aucune promesse de voix
luxembourgeoise quand il n'y en a pas.

### Retours de prononciation

Quatre niveaux lisibles : `Excellent`, `Bien`, `Presque`,
`À réessayer`. Les quatre états techniques restants n'écrivent toujours
rien dans la progression.

### Service worker

- `config.js` n'est **jamais** mis en cache. Une configuration périmée
  rend tout diagnostic impossible ; c'est exactement ce qui empêchait de
  voir l'effet d'une correction sur iPhone.
- Chargement initial avec `cache: reload`, pour ne jamais reprendre une
  copie intermédiaire du navigateur.
- Nom de cache versionné, purge complète à l'activation.
- Les onglets ouverts sont prévenus qu'une nouvelle version est active.

### Tests

72 tests, aucun échec. Vingt-cinq ajoutés dans cette version :

- le plancher de bruit ne peut plus s'effondrer,
- la mesure en décibels est bornée des deux côtés,
- un pic trop faible n'est jamais de la parole,
- un rapport signal sur bruit de 514 dB est impossible,
- trois valeurs de configuration vides sont détectées et nommées,
- une valeur vide se distingue d'un format inattendu,
- le rapport de diagnostic ne révèle jamais une clé entière,
- chaque cause d'échec porte un titre, un message et une action,
- les codes HTTP donnent des causes distinctes,
- un quota en 403 n'est pas confondu avec un refus d'authentification.

### Connu et non résolu

- Sur iPhone, la synthèse vocale s'arrête écran verrouillé. La solution
  durable est l'audio pré-enregistré, prévue après cette version.
- `lb-LU` sur `chirp_3` reste annoncé en Preview par Google.
- Les 255 expressions portent toujours `st: "unverified"`. Aucune n'a été
  validée par un locuteur natif. Bloquant avant commercialisation.
- Stripe n'est pas implémenté.
- Le contenu reste servi en clair dans `cours.js`.

## 5.0.0 · 7 août 2026 · Correctifs P0 et refonte du moteur vocal

Lot centré sur la fiabilité. Aucun contenu luxembourgeois ajouté, modifié ou
inventé. Le cours reste à 35 leçons et 255 expressions, volontairement.

### Corrigé · bloquant

- **Identifiants permanents des expressions.** La clé passait de la position
  `"leçon-item"` à un identifiant stable `lxXXXXXXXX` dérivé du contenu. Ajouter
  une expression au milieu d'une leçon ne détruit plus la progression.
  255 occurrences, 248 identifiants uniques.
- **Sept doublons fusionnés.** `zwee`, `fënnef`, `gëschter`, `jo`, `Haus`,
  `Ech si midd`, `d'Kanner` apparaissaient dans deux leçons et comptaient deux
  fois. Ils partagent désormais un identifiant, donc une seule progression. Les
  deux occurrences restent dans leurs leçons respectives.
- **Migration automatique.** Table `cours.legacy-map.json`. Les clés v3 et v4
  sont traduites au premier lancement. Une copie intacte est conservée sous
  `letz:v4:backup`.
- **Deux boutons morts.** « Dialogues immersifs » et « Mes erreurs » utilisaient
  l'attribut `data-premium-feature`, jamais traité. Ils lancent maintenant les
  modes correspondants. Le mode « Mes erreurs » a été implémenté.
- **Durée réelle des séances.** Le moteur ne construit plus une liste fixe
  d'exercices. Il décide à chaque tour selon le temps restant, avec estimation
  ajustée sur le réel. Écart mesuré : moins de 0,5 minute pour 10, 20, 30, 45 et
  60 minutes.
- **Sessions parallèles.** Le bouton Suivant relançait une seconde boucle pendant
  que la première attendait. Provoquait double lecture audio et progression
  écrite deux fois.
- **Premium décidé par le navigateur.** `isPremium()` lisait `localStorage`.
  Les droits sont maintenant lus exclusivement depuis la table `subscriptions`,
  en lecture seule côté client. Sans compte, jamais Premium.

### Refait · chaîne vocale complète

- Nouveau pipeline en sept étapes. Voir `docs/PIPELINE_VOCAL.md`.
- Gestion du micro : permission, sélection de l'appareil, mesure du niveau en
  décibels, détection des kits Bluetooth mains libres.
- Détection de début et de fin de parole, avec plancher de bruit recalibré à
  chaque question. Profils Calme et Voiture.
- Enregistrement piloté par la détection, format négocié, durée bornée à 10
  secondes et taille à 900 Ko.
- Reconnaissance Google STT V2, modèle `chirp_3`, langue `lb-LU`, région `eu`.
  Biasing alimenté par l'attendu, les alternatives validées et le vocabulaire de
  la leçon. Réducteur de bruit activé.
- Normalisation adaptée au luxembourgeois. Les voyelles `ë`, `é`, `ä` sont
  conservées. La v4 les supprimait, ce qui rendait `gär` et `gar` identiques.
- Seuil de validation dépendant de la longueur. La v4 utilisait 0,78 pour tout,
  ce qui validait « Wann ich geliebt » pour « Wann ech gelift » et refusait un
  « jo » correctement prononcé.
- Huit états de verdict. Les quatre états techniques n'écrivent rien du tout.
- Diagnostic complet, maillon par maillon, avec réécoute de son enregistrement.
- Mode test : attendu, entendu, moteur, latence, résultat.

### Corrigé après revue, second passage

- **Perte de progression possible au démarrage.** La table de migration était
  chargée par un appel réseau. Si `cours.legacy-map.json` manquait, arrivait en
  404 ou restait bloqué par un ancien service worker, la migration traduisait
  zéro expression, écrivait un état vide, et ne retentait jamais. La progression
  paraissait effacée. Corrigé sur deux plans : la table est désormais embarquée
  dans `cours.js`, il n'y a donc plus d'appel réseau ; et si aucune table n'est
  disponible, la migration est refusée et l'ancienne progression laissée intacte.
  Trouvé par le test de démarrage, couvert par deux tests de non-régression.
- **Bouton « Supprimer mon compte » sans fonction derrière.** Le frontend
  appelait `/delete-account`, jamais livrée. Exactement le défaut reproché à la
  v4. La fonction est désormais fournie : effacement explicite des cinq tables,
  refus si un abonnement Stripe est encore actif, suppression du compte.

### Ajouté

- Test de démarrage réel dans un DOM simulé, 12 vérifications. Les 35 tests
  précédents ne couvraient que la logique pure : une erreur au chargement aurait
  produit une page blanche, détectable seulement après déploiement.
- `supabase/admin-outils.sql` : s'accorder Premium pour tester, suivre la
  consommation vocale, remettre un compteur à zéro, mesurer le taux d'échec réel
  de la reconnaissance jour par jour, vérifier que la RLS est active.
- Répétition espacée à trois dimensions : compréhension, production,
  prononciation. La prononciation ne monte que sur une mesure cloud fiable.
- Schéma Supabase complet, RLS activée sur les six tables, déclencheurs de
  création de profil, fonction de quota vocal serveur.
- Edge Function `speech-transcribe` avec authentification, quota mensuel,
  limitation par minute, bornage de la durée, journalisation sans audio.
- Synchronisation avec file d'attente hors ligne et arbitrage de conflit par
  date, plus fenêtre de choix explicite à la première connexion.
- Export complet des données et suppression de compte, obligations RGPD.
- Contrôles Media Session : boutons du volant et de l'autoradio.
- 47 tests de non-régression.

### Modifié

- Client Supabase vendorisé en local, version 2.112.2. La v4 l'important depuis
  un CDN tiers à l'exécution : panne possible, hors ligne cassé, adresse IP
  transmise à un tiers non déclaré.
- Service worker : stratégies différenciées au lieu d'une règle unique.
- Manifeste : orientation libérée. La v4 verrouillait en portrait, alors que les
  supports de voiture sont souvent en paysage.
- Accessibilité : vues inactives réellement masquées, focus visible, cibles
  tactiles à 44 pixels, respect de `prefers-reduced-motion`.
- Fusion de progression : arbitrage par date au lieu du maximum champ par champ,
  qui empêchait tout niveau de redescendre et repoussait toujours les révisions.
- Mode Chiffres : filtre par étape au lieu de la position dans le fichier.
- Version unique. La v4 écrivait `4.0.0` en dur à 18 endroits.

### Retiré

- Sélecteur mensuel et annuel sur la page Premium. Il ne pilotait rien tant que
  Stripe n'est pas branché. Un bouton décoratif est un bouton mort.

### Connu et non résolu

- `SpeechSynthesis` s'arrête écran verrouillé sur iOS. La promesse « pose le
  téléphone » n'est pas tenue sur iPhone écran éteint. Résolution prévue par
  audio pré-enregistré.
- `lb-LU` sur `chirp_3` est annoncé en Preview par Google, pas en disponibilité
  générale. À revérifier avant mise en vente.
- Aucune expression du cours n'a été validée par un locuteur natif. Le champ
  `st` vaut `unverified` partout. Bloquant avant commercialisation.
- Stripe n'est pas implémenté. Volontaire : à faire après stabilisation vocale.
- Le contenu reste servi en clair dans `cours.js`. Le verrou Premium sur les
  leçons est donc encore cosmétique. À traiter avec la distribution serveur.

## 4.0.0 · version précédente

Prototype fonctionnel. Voir l'audit dans `AUDIT_V4.md`.
