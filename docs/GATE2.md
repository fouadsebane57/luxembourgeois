# GATE 2.4 · SAUT DEMANDÉ PENDANT UNE PAUSE

## Bug reproduit avant correction

```
tour 1  : joue lx00000001
pause   : attente
suivant : motif = suivant
tour 2  : reinitialiserMotif() efface le motif
          itemId avant  : lx00000001
          itemId après  : lx00000001
          index         : 0
BUG REPRODUIT
```

La demande de saut reposait sur le motif de la machine. La boucle
effaçait ce motif au début du tour suivant, avant de l'avoir lu. Le
saut était perdu.

Second défaut mis au jour par la reproduction : `passerExercice()`
appelait `basculerPause(false)` et faisait donc SORTIR de pause, ce qui
n'est pas le comportement voulu.

## Correction

Une demande de saut n'est plus un motif transitoire mais une commande
en attente, consommée par la boucle. Un motif d'opération audio ne peut
plus l'effacer.

La boucle retient aussi explicitement son exercice courant. Elle reste
la seule source de vérité pour `completed`, `paused`, `skipped` et
`aborted`.

Ordre des décisions, désormais figé par un test d'architecture :

```
1. saut en attente et exercice retenu  -> consommer, sans jouer
2. en pause                            -> attendre
3. reprendre l'exercice retenu, sinon en prendre un nouveau
4. jouer, puis décider selon l'issue
```

La consommation vient AVANT le test de pause. C'est ce qui permet
d'honorer un saut demandé pendant une pause sans en sortir.

## Comportement obtenu

```
tour 1  : joue lx00000009
pause   : attente          état PAUSE
suivant : demande posée    état PAUSE, micro fermé
tour 2  : saut consommé    état PAUSE, index 1, sautés 1
tour 3  : attente          aucun exercice démarré
reprise : joue lx00000004
```

Les neuf points demandés sont tenus : on reste en pause, aucune voix
n'est relancée, aucun micro rouvert, exactement un item avancé, aucune
preuve écrite, et l'exercice suivant ne démarre qu'à la reprise.

## Verrou de double appui

Une seule demande peut être en attente. Le verrou est levé par la
boucle au moment où elle honore la demande, jamais par un minuteur qui
pourrait expirer trop tôt ou trop tard. Deux tests couvrent les deux
chemins de levée.

---

# GATE 2.3 · COMMANDES DE SÉANCE

## 1 · Pause ne fait plus sauter d'exercice

`boucleSeance()` appelait `Sess.terminerExercice()` sans condition, y
compris quand l'exercice s'était interrompu sur une pause. L'index
avançait, l'exercice était perdu, et la reprise repartait sur le suivant.

Un exercice renvoie désormais une issue explicite :

| Issue | Effet sur la boucle |
|---|---|
| `completed` | comptée, index avancé, position mémorisée |
| `paused` | **rien du tout**, le même exercice sera rejoué |
| `skipped` | index avancé, **aucune écriture pédagogique** |
| `aborted` | sortie de boucle |

La machine porte un motif d'interruption typé, posé AVANT le silence,
pour que l'opération en cours sache pourquoi elle s'arrête.

## 2 · Suivant a une vraie sémantique

`passerExercice()` se contentait d'arrêter la voix. La capture pouvait
continuer derrière. Elle annule désormais par l'orchestrateur, libère le
micro, n'écrit aucune preuve, et pose un motif que la boucle traduit en
un seul saut.

Verrou anti double appui : deux clics rapprochés ne sautent jamais deux
exercices.

`Sess.sauterExercice()` fait avancer l'index sans alimenter l'estimation
de durée : un exercice sauté dure une seconde et fausserait la moyenne
mobile, donc le minutage de toute la séance.

## 3 · Répéter ne peut plus parler sur le micro

Refusée pendant `LISTENING`, `RECORDING` et `PROCESSING`.

Trois stratégies étaient possibles. La mise en file ferait parler à un
moment imprévisible. L'annulation de la capture ferait perdre la réponse
déjà prononcée. On ignore la commande, on la trace, et on le dit à
l'utilisateur.

## 4 · Les commandes passent par l'orchestrateur

Plus aucun `Voix.stopper()` ni `Voix.dire()` direct dans `basculerPause`,
`passerExercice` et `arreterSeance`. La seule branche restante est dans
`repeter()`, hors séance, et un test vérifie qu'elle est gardée par une
vérification d'occupation.

## 5 · Ce qui n'a pas bougé

`restitution.js`, l'ordre retour puis écho puis modèle, le modèle de
preuves, la migration, les formats audio, le diagnostic et la
progression historique sont inchangés.

---

# GATE 2.2 · SÉQUENCE AUDIO RÉELLE

## Cause exacte

Confrontation de la table de transitions aux cinq parcours réellement
produits par `app.js` :

| Parcours | Résultat en GATE 2.1 |
|---|---|
| Local, écho actif | **PLAYING_PROMPT vers PLAYING_ECHO refusée** |
| Cloud incorrect, écho actif | **même refus** |
| Cloud incorrect, sans écho | ok |
| Cloud correct | ok |
| Exercice suivant | ok |

L'ordre du produit était : retour, modèle, ta voix, modèle. Il exigeait
une transition que la machine refusait, précisément dans les deux seuls
cas où l'écho devait être joué. L'écho ne pouvait donc jamais être
entendu, et 124 tests restaient verts parce qu'ils exerçaient la
machine isolément, dans un ordre qui n'était pas celui du produit.

## Décision d'orchestration

La transition n'a PAS été ouverte. C'est l'ordre du produit qui était
mauvais.

Nouvelle séquence canonique :

```
PROCESSING
  -> GIVING_FEEDBACK    le verdict d'abord
  -> PLAYING_ECHO       ta voix, si l'écho est activé
  -> PLAYING_PROMPT     le modèle, en dernier
  -> exercice suivant
```

Trois raisons.

1. La comparaison est plus informative juste après le verdict : on sait
   ce qui est jugé au moment où on s'entend.
2. Le dernier son entendu est la forme cible, pas sa propre erreur.
   Terminer sur la production fautive travaille contre l'objectif.
3. Chaque état n'apparaît qu'une fois. Trois segments audio au lieu de
   quatre, ce qui compte en conduite.

Une seule transition a été ajoutée, et elle a un sens clair :
`GIVING_FEEDBACK` vers `PLAYING_ECHO`. Deux ont été RETIRÉES pour
resserrer la table : `PROCESSING` vers `PLAYING_ECHO` et `PROCESSING`
vers `PLAYING_PROMPT`. Le retour précède désormais toujours toute
relecture.

## Comportement sur réponse correcte, décidé explicitement

Sur une réponse jugée correcte par un moteur fiable : ni écho, ni
relecture du modèle. Répéter ce qui est acquis coûte du temps de séance
sans rien apporter. Ce comportement est testé comme tel, il n'est pas
laissé ambigu.

## La séquence est partagée, plus dupliquée

`src/core/restitution.js` contient la séquence. `app.js` l'appelle, les
tests d'intégration l'exercent telle quelle. C'est la correction de fond :
en GATE 2.1, le testé et l'exécuté divergeaient. Un test d'architecture
échoue désormais si `app.js` réimplémente la séquence.

---

# GATE 2.1 · CORRECTIONS APRÈS VÉRIFICATION INDÉPENDANTE

Dix incohérences ont été trouvées dans le ZIP du GATE 2 par une
vérification extérieure. Aucune n'avait été détectée par mes tests.
La raison est instructive : tous mes tests portaient sur des
comportements, aucun sur la structure du code.

## 1 · Décompte des tests

Annoncé : 107. Réellement exécuté dans le ZIP livré : 96, dont 1 ignoré,
faute de jsdom absent du paquet.

Corrigé à la source plutôt que dans le discours : le test de démarrage
ne dépend plus d'aucune bibliothèque. Un DOM minimal, écrit pour l'usage
et livré dans `tests/helpers/dom.mjs`, fournit exactement ce dont les
modules ont besoin. Plus aucun test n'est ignoré.

Commande unique : `npm test`, sans installation préalable.

## 2 · La machine n'était pas propriétaire du pipeline

C'était le point le plus grave, et l'affirmation venait de moi.

`machine.js` déclarait : « propriétaire UNIQUE du micro, de
l'enregistreur, de la voix et de la lecture ». Dans les faits, `app.js`
contenait treize appels directs à `Voix.dire` et `engine.js` appelait
`capturer()` en direct. La machine restait donc en PREPARING pendant
que le micro et l'enregistrement se déroulaient ailleurs. Pause et
Interruption ne pouvaient rien garantir.

Option A retenue : la machine devient réellement propriétaire.

| Ajout | Rôle |
|---|---|
| `direConsigne()` | consigne parlée, passe en PLAYING_PROMPT |
| `attendreUtilisateur()` | temps de réponse, passe en WAITING_FOR_USER |
| `capturerReponse()` | traverse LISTENING, RECORDING, PROCESSING et referme le micro |
| `repeter()` | répétition sans quitter l'état courant |

`engine.js` n'importe plus la fonction de capture. Elle lui est injectée
par l'appelant. Sans elle, il refuse explicitement au lieu de contourner.

## 3 · Test d'intégration du parcours

`tests/parcours.test.mjs` vérifie l'état après CHAQUE étape :
démarrage, modèle, attente, écoute, enregistrement, libération du micro,
traitement, écho, retour, exercice suivant. Il contrôle aussi que la
traversée s'est faite dans l'ordre.

## 4 · Plus aucun son direct dans la séance

Écoute, chiffres, dialogues et exercice oral passent tous par
l'orchestrateur. Les deux usages restants sont hors séance, écouter un
mot du lexique et l'aperçu de voix, et sont explicitement bloqués quand
une séance tourne.

## 5 · Micro sous try/finally

`capturer()` place tout le travail sous `try` et la libération dans
`finally`. Aucun chemin d'erreur ne peut laisser un flux actif : ni un
enregistreur qui lève une exception, ni une détection interrompue, ni un
format non supporté.

## 6 · Séance sans contenu

La machine était démarrée avant le contrôle de la file. Quand la file
était vide, le code sortait sans libérer, et la machine restait occupée :
plus aucune séance ne pouvait démarrer. Corrigé, avec deux tests, dont un
contrôle structurel du chemin de sortie.

## 7 · Nommage du format

`recorder.js` exposait `relisible` pendant que `choisir()` renvoyait un
autre nom pour la même donnée. Une seule propriété canonique désormais :
`enregistrable`, `relisible`, `transcription`.

## 8 et 9 · Garde-fou d'architecture

`tests/architecture.test.mjs` analyse le code source. Il échoue si un
module du parcours prononce du son en direct, ouvre le micro lui-même,
appelle la capture sans passer par l'orchestrateur, ou écrit dans une
dimension de maîtrise hors du qualificateur de preuves.

Validation de ce garde-fou : les deux défauts du GATE 2 ont été
volontairement réintroduits. Trois tests ont échoué. Le code a ensuite
été restauré. Un test qui ne peut pas échouer ne prouve rien.

## 10 · Identifiant de build

`gate2-1`. La version applicative reste 5.1.0.

---

# GATE 2 · CE QUI A ÉTÉ FAIT

Aucun déploiement. Aucune modification de `config.js`. Version affichée
inchangée : 5.1.0. Seul le nom du cache du service worker change, sans
quoi l'ancien code resterait servi.

## Modèle de preuves · la règle centrale

Une donnée n'est une preuve de compétence que si elle démontre cette
compétence. Tout le reste est un signal, rangé à part.

| Source | Ce qu'elle écrit | Dimensions |
|---|---|---|
| Écoute | `nombreExpositions`, `dateDerniereExposition` | **aucune** |
| Auto-évaluation | `selfAssessment`, `confidenceDeclared` | **aucune** |
| Analyse du rythme | `attemptDetected`, `speechDurationMs`, `rhythmSimilarity`, `syllabicGroups`, `localAudioQuality` | **aucune** |
| Transcription fiable | preuve de production lexicale | production, rappel |

`SOURCES_PROBANTES` ne contient qu'une seule entrée : la transcription.
Toute autre source est refusée avec la raison `source_non_probante`.

## Prononciation · non mesurée, assumé

`MESURABLE[prononciation] = false`. Toute écriture y est refusée avec la
raison `dimension_non_mesurable`.

Une transcription correcte prouve que le mot a été dit et qu'il était
assez intelligible pour le moteur. Elle ne prouve pas une prononciation
juste : un moteur reconnaît souvent le bon mot malgré un accent marqué.
Tant qu'aucun instrument acoustique adapté n'existe, cette dimension
reste vide. Un score serait faux.

## Héritage · conservé, jamais promu

| Ce qui est fait | Ce qui n'est pas fait |
|---|---|
| Copie intégrale sous `legacy` | aucune promotion en maîtrise |
| Affichage sous « progression historique » | aucun `max(legacy, nouveau)` |
| Utilisé pour ordonner la file | aucune suppression |

L'héritage sert uniquement à ne pas présenter comme une découverte une
expression déjà travaillée. C'est une information de file d'attente,
pas une affirmation de compétence.

Deux contrôles bloquants avant écriture : l'héritage doit être copié à
l'identique, et aucune dimension ne doit être préremplie. Si l'un des
deux échoue, rien n'est écrit.

## Format audio · détection, pas déduction

Aucune règle du type « si Safari alors MP4 ». Trois critères mesurés à
l'exécution :

| Critère | Méthode |
|---|---|
| A · enregistrable | `MediaRecorder.isTypeSupported()` |
| B · relisible | `canPlayType()` sur un élément audio |
| C · transcriptible | compatibilité documentée du service |

`WEBM_OPUS`, `MP4_AAC`, `M4A_AAC` et `OGG_OPUS` figurent parmi les
formats officiellement pris en charge par la détection automatique du
service de transcription. Le statut « non vérifié » sur `WEBM_OPUS` est
retiré. Ce qui reste à vérifier, c'est le fichier réellement produit par
un appareil donné, pas le format en tant que tel.

Le résultat peut différer d'un téléphone à l'autre. Le diagnostic
affiche les trois critères séparément.

## Lecture de la voix · six états

`terminee`, `interrompue`, `bloquee_navigateur`, `erreur_decodage`,
`inaudible`, `aucun_audio`. Aucun n'est confondu avec un succès.
`audio.play().catch(fin)` a disparu.

## Machine à états audio

Propriétaire unique du micro, de l'enregistreur, de la voix et de la
lecture. Treize états, table de transitions explicite. Un enchaînement
impossible est refusé et journalisé.

| Correctif | Effet |
|---|---|
| Micro | fermé dès la fin de l'enregistrement |
| Pause | coupe voix, micro et détection |
| Quitter | libère tout, invalide le jeton de séance |
| Double séance | refusée avant démarrage |
| Interruptions | appel, Siri, arrière-plan déclenchent une pause |

## Modes séparés

**Au volant** : aucune interaction visuelle demandée après le lancement.
**À l'arrêt** : auto-évaluation, phonétique, découverte.

## Tests

107 tests, aucun échec. Un bug réel trouvé pendant l'écriture des tests :
la fusion des signaux entre appareils tranchait sur une seule date et
perdait les mesures récentes d'une autre famille.
