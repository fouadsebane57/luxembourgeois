# CHANGELOG

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
