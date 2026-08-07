# Lëtzebuergesch am Auto, version 2.0.0

Application progressive de luxembourgeois pensée pour l'écoute et la révision orale.

Contenu actuel : 35 leçons, 255 expressions, 65 astuces de mémoire et 10 dialogues.

Conçu par Fouad SEBANE.

## Ce qui change dans la V2

1. Installation PWA plus claire sur Android et iPhone.
2. Fonctionnement hors ligne renforcé.
3. Gestion des mises à jour plus fiable.
4. Diagnostic technique plus complet.
5. Les erreurs JavaScript récentes sont conservées pour faciliter le dépannage.
6. La reconnaissance vocale devient facultative et expérimentale.
7. Une mauvaise reconnaissance vocale ne fait plus baisser la progression.
8. L'écho de la voix reste disponible quand le navigateur le permet.
9. Recherche d'une vraie voix Lëtzebuergesch sur l'appareil avant le recours à une voix allemande.
10. Objectif quotidien réglable de 5 à 60 minutes.
11. Bilan à la fin de chaque séance.
12. Favoris dans le lexique.
13. Filtres Tout, À revoir, Solides et Favoris.
14. Sauvegarde V2 avec progression, réglages et favoris.
15. Pause automatique si l'application passe en arrière plan pendant une séance.
16. Indication En ligne ou Hors ligne sur l'écran principal.

## Important sur le contenu linguistique

Le moteur de l'application et le contenu linguistique sont séparés.

Le fichier `cours.js` contient le cours. C'est le seul fichier à modifier pour corriger un mot, une traduction, une prononciation approchée, une astuce ou pour ajouter une leçon.

Avant une utilisation professionnelle, vérifie le contenu concerné sur `lod.lu`, le dictionnaire du Zenter fir d'Lëtzebuerger Sprooch.

La synthèse vocale dépend des voix installées sur le téléphone. La V2 cherche d'abord une voix dont la langue est Lëtzebuergesch. Si elle n'en trouve pas, elle utilise une voix allemande comme approximation. L'audio de `lod.lu` reste utile pour contrôler la prononciation d'un mot.

## Les fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Structure de l'application |
| `styles.css` | Présentation et affichage mobile |
| `cours.js` | Contenu du cours |
| `app.js` | Progression, séances, voix, micro, diagnostic et interface |
| `sw.js` | Hors ligne et cache |
| `manifest.webmanifest` | Installation comme application |
| `icon-192.png` | Petite icône |
| `icon-512.png` | Grande icône |
| `README.md` | Mode d'emploi |

Tous ces fichiers doivent être placés directement à la racine du dépôt GitHub `luxembourgeois`.

## Mettre la V2 sur ton GitHub actuel

Ton dépôt existe déjà. Tu n'as pas besoin d'en créer un autre.

1. Ouvre ton dépôt `luxembourgeois` sur GitHub.
2. Clique sur `Add file`, puis `Upload files`.
3. Dépose les fichiers de cette V2 directement dans la page.
4. GitHub détectera les fichiers modifiés et le nouveau fichier `styles.css`.
5. Clique sur `Commit changes`.
6. Attends environ une minute.
7. Ouvre ton application GitHub Pages.
8. Dans l'application, va dans `Installer`, puis `Vérifier les mises à jour`.
9. Choisis `Recharger`.

GitHub Pages doit rester configuré sur la branche principale, avec le dossier racine.

## Installer sur Android

1. Ouvre l'adresse GitHub Pages dans Chrome.
2. Va dans l'onglet `Installer` de l'application.
3. Si le bouton direct est disponible, touche `Installer l'application`.
4. Si Chrome ne propose pas le bouton direct, ouvre le menu à trois points.
5. Choisis `Installer l'application` ou `Ajouter à l'écran d'accueil` selon ce que Chrome affiche.

Le bouton d'installation n'est pas garanti sur tous les téléphones. L'application indique maintenant la procédure adaptée au navigateur.

## Installer sur iPhone

1. Ouvre l'adresse dans Safari.
2. Touche `Partager`.
3. Choisis `Sur l'écran d'accueil`.
4. Confirme avec `Ajouter`.

Sur iPhone, il est normal que la page ne présente pas toujours un bouton d'installation automatique.

## Diagnostic technique

Va dans `Voix et micro`, puis lance `Lancer le diagnostic complet` à l'arrêt.

Le diagnostic contrôle notamment :

1. La version de l'application.
2. L'adresse sécurisée.
3. La connexion.
4. Le mode installé.
5. Le stockage de la progression.
6. Le service worker.
7. La synthèse vocale.
8. La voix utilisée pour le luxembourgeois.
9. La voix française.
10. La permission du micro.
11. L'enregistrement audio.
12. La reconnaissance vocale.
13. La dernière erreur JavaScript enregistrée, s'il y en a une.

Le bouton `Copier le diagnostic` permet d'envoyer facilement le résultat en cas de problème.

## La reconnaissance vocale

La reconnaissance vocale des navigateurs n'est pas considérée comme une mesure fiable de la prononciation luxembourgeoise.

Dans la V2 :

1. Elle est facultative.
2. Elle sert uniquement de retour indicatif.
3. Un mauvais résultat vocal ne fait plus perdre de niveau à une expression.
4. Le test écrit continue à avoir un effet sur la progression, car la réponse y est explicite.
5. L'écho vocal permet de s'entendre puis de comparer avec le modèle.

## Objectif quotidien

Dans `Voix et micro`, règle l'objectif entre 5 et 60 minutes.

L'écran principal affiche :

1. Les minutes réalisées aujourd'hui.
2. L'objectif choisi.
3. Le pourcentage atteint.

## Favoris et lexique

Dans le lexique, touche l'étoile à côté d'une expression pour l'ajouter aux favoris.

Quatre filtres sont disponibles :

1. Tout.
2. À revoir.
3. Solides.
4. Favoris.

## Sauvegarde de la progression

Dans `Suivi` :

1. `Exporter ma progression` crée un fichier JSON.
2. `Importer une sauvegarde` restaure la progression.

La sauvegarde V2 contient la progression, les leçons validées, l'historique, les réglages et les favoris.

Les anciennes sauvegardes V1 restent acceptées si elles contiennent les données principales attendues.

## Modifier uniquement le cours plus tard

Pour corriger un mot ou ajouter une leçon :

1. Modifie uniquement `cours.js`.
2. Vérifie la syntaxe du bloc modifié.
3. Sur GitHub, remplace `cours.js` par la nouvelle version.
4. Valide avec `Commit changes`.
5. Dans l'application, ouvre `Installer`.
6. Touche `Vérifier les mises à jour`.
7. Choisis `Recharger`.

Le service hors ligne utilise le réseau en priorité quand il est disponible. Si le téléphone est hors ligne, il utilise la dernière version mise en cache.

## Sécurité pendant un trajet

Lance la séance avant de démarrer. Pendant le trajet, ne manipule pas l'écran.

Si l'application passe en arrière plan pendant une séance, la V2 met automatiquement la séance en pause. Il faut la reprendre volontairement à l'écran.

## En cas de bug

1. Ouvre `Voix et micro`.
2. Lance le diagnostic.
3. Touche `Copier le diagnostic`.
4. Note aussi le modèle du téléphone et le navigateur utilisé.
5. Si le problème est apparu après une mise à jour, va dans `Installer`, puis `Vérifier les mises à jour`, puis `Recharger`.

Ne réinitialise la progression qu'en dernier recours. Exporte une sauvegarde avant toute remise à zéro si tu veux conserver les données.
