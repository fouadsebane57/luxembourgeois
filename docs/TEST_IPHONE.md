# TESTS SUR TON IPHONE

Coche au fur et à mesure. Note ce qui échoue.

## Avant de commencer

☐ Cache Safari vidé, voir `docs/CONFIGURER.md` étape 4
☐ Application rouverte depuis `https://fouadsebane57.github.io/luxembourgeois/`

## Série A · Configuration

| Test | Attendu | ☐ |
|---|---|---|
| Onglet Voix et micro, ligne Fichier config.js | OK, trois valeurs présentes | ☐ |
| Ligne Version de l'application | LULU Trajet 5.1.0 | ☐ |
| Onglet Compte, connexion | ton email s'affiche | ☐ |

## Série B · Le bug corrigé

C'est le point le plus important de cette version.

| Test | Attendu | ☐ |
|---|---|---|
| Bouton Tester maintenant, ligne Moteur audio | OK, en fonctionnement | ☐ |
| Ligne Bruit ambiant | une valeur entre -70 et -30 dB | ☐ |
| Ligne Bruit ambiant, valeur absurde ? | plus jamais -150 dB | ☐ |
| Reste silencieux pendant le test | Rien détecté, avec une explication | ☐ |
| Dis Moien, ligne Détection de parole | seuil entre -58 et -40 dB, SNR sous 70 dB | ☐ |
| Bouton Réécouter mon enregistrement | tu t'entends distinctement | ☐ |

Si le SNR dépasse encore 70 dB ou si le seuil descend sous -100 dB,
le correctif n'est pas actif : ton téléphone sert encore l'ancien code.
Refais l'étape 4 de `docs/CONFIGURER.md`.

## Série C · Reprise de la progression

| Test | Attendu | ☐ |
|---|---|---|
| Lance une séance, fais trois exercices | | ☐ |
| Ferme complètement l'application, double appui puis balaye vers le haut | | ☐ |
| Rouvre l'application | Content de te revoir, avec ta leçon | ☐ |
| Appuie sur Reprendre mon trajet | reprend à la bonne leçon, pas au début | ☐ |
| Redémarre le téléphone, rouvre | la progression est toujours là | ☐ |

## Série D · Mode voiture

Prépare et lance toujours à l'arrêt.

| Test | Attendu | ☐ |
|---|---|---|
| Séance de 10 minutes sans toucher l'écran | se déroule seule | ☐ |
| Durée réelle | entre 9 et 10 minutes | ☐ |
| Boutons Répéter, Suivant, Pause | atteignables sans regarder | ☐ |
| Bouton suivant du volant | passe à l'exercice suivant | ☐ |
| Bouton précédent du volant | répète l'expression | ☐ |
| Écran verrouillé | la voix s'arrête, limite connue d'iOS | ☐ |

## Série E · Installation

| Test | Attendu | ☐ |
|---|---|---|
| Safari, bouton Partager, Sur l'écran d'accueil | icône voiture et arcs tricolores | ☐ |
| Icône lisible parmi les autres applications | oui | ☐ |
| Ouvrir depuis l'icône | plein écran, sans barre Safari | ☐ |
| Mode avion pendant une séance | la séance continue | ☐ |

## Série F · En voiture

Ne fais jamais cette série seul au volant.

| Test | Attendu | ☐ |
|---|---|---|
| Profil Voiture activé, onglet Voix et micro | seuil relevé au diagnostic | ☐ |
| Moteur tournant, ventilation en marche | parole détectée | ☐ |
| Téléphone sur support, à distance normale | parole détectée | ☐ |
| Micro Bluetooth de la voiture | avertissement affiché | ☐ |
| Sur 20 réponses, combien reconnues ? | noter le chiffre réel : ____ / 20 | ☐ |

## Si quelque chose échoue

Onglet Voix et micro, bouton **Copier** en haut du bloc Diagnostic.
Colle le texte dans un message, avec :
- ce que tu faisais,
- ce que tu attendais,
- ce qui s'est passé.
