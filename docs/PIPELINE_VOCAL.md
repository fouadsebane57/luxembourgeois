# PIPELINE VOCAL · POURQUOI L'ANCIEN ÉCHOUAIT

Chiffres obtenus en exécutant le code de la v4 sur le contenu réel du cours.

## Cause 1 · La langue envoyée était l'allemand

`browserRecognize(ms, "de-DE")`. La valeur `de-DE` était écrite en dur à chaque
appel. Chrome transcrivait donc de l'allemand, puis le résultat était comparé à
du luxembourgeois écrit.

## Cause 2 · La normalisation détruisait les voyelles enseignées

L'ancienne fonction supprimait tous les diacritiques, puis appliquait des
substitutions phonétiques agressives : `sch` vers `sh`, `ch` vers `h`, `w` vers
`v`, `z` vers `ts`, et le dédoublement des lettres répétées.

Résultat mesuré, les paires suivantes devenaient strictement identiques :

| Attendu | Confondu avec | Après normalisation v4 |
|---|---|---|
| `gär` | `gar` | `gar` |
| `méi` | `mei` | `mei` |
| `wäit` | `wait` | `vait` |
| `fënnef` | `fennef` | `fenef` |
| `zwee` | `tswe` | `tsve` |

Ces voyelles sont exactement ce que l'étape 2 du cours enseigne. Le moteur ne
pouvait donc pas évaluer la prononciation qu'il prétendait corriger.

## Cause 3 · Un seuil unique de 0,78 pour toutes les longueurs

| Attendu | Entendu | Similarité v4 | Verdict v4 | Problème |
|---|---|---|---|---|
| `Wann ech gelift` | `Wann ich geliebt` | 0,786 | validé | faux positif, phrase allemande acceptée |
| `Villmools merci` | `Fielmals merci` | 0,786 | validé | faux positif |
| `jo` | `yo` | 0,500 | refusé | faux négatif, mot correct rejeté |
| `Wat kascht dat ?` | `Was kostet das` | 0,643 | presque | transcription allemande tolérée |

Sur une phrase longue, 0,78 est atteint presque par accident. Sur un mot de deux
lettres, une seule erreur fait tomber à 0,50.

## Cause 4 · Aucune détection de parole

Fenêtre fixe de six secondes. Réponse en une seconde : cinq secondes de silence.
Réflexion de sept secondes : coupé au milieu.

## Cause 5 · Aucune mesure du niveau sonore

Micro coupé, mauvais appareil sélectionné, téléphone trop loin : échec silencieux,
sans aucun message permettant de comprendre.

## Cause 6 · Aucune adaptation au bruit

Seuil absolu. En voiture, le plancher de bruit monte de vingt décibels et rien
n'était prévu pour cela.

## Cause 7 · Deux boucles de séance simultanées

Le bouton Suivant incrémentait le jeton de session puis relançait la boucle,
pendant que la précédente attendait encore sur un `await`. Double lecture audio
et progression écrite deux fois.

---

# LE NOUVEAU PIPELINE

```
micro → contrôle du signal → détection de parole → enregistrement
      → STT luxembourgeois → normalisation → comparaison
      → décision pédagogique → retour utilisateur
```

| Étape | Module | Ce qui change |
|---|---|---|
| Autorisation, appareil, niveau | `src/audio/mic.js` | permission tracée, choix du micro, mesure en décibels, détection du Bluetooth mains libres |
| Détection de parole | `src/audio/vad.js` | plancher de bruit calibré à chaque question, seuil relatif, profil voiture |
| Enregistrement | `src/audio/recorder.js` | piloté par la détection, format négocié, durée et taille bornées |
| Transcription | `src/speech/engine.js` | Google STT V2, `chirp_3`, `lb-LU`, région `eu`, biasing sur le vocabulaire de la leçon, réducteur de bruit activé |
| Normalisation | `src/speech/normalize.js` | deux niveaux, les voyelles luxembourgeoises sont conservées |
| Comparaison | `src/speech/score.js` | seuil dépendant de la longueur, alignement au mot, alternatives validées |
| Décision | `src/speech/score.js` | huit états distincts, effet explicite sur la progression |

## Les huit états

| État | Effet sur la progression |
|---|---|
| Correct | montée forte |
| Probablement correct | montée simple, moteur navigateur uniquement |
| Réponse proche | maintien, on retravaille sans punir |
| À retravailler | descente d'un niveau |
| Reconnaissance incertaine | aucun effet |
| Aucune parole détectée | aucun effet |
| Micro indisponible | aucun effet |
| Service vocal indisponible | aucun effet |

Les quatre derniers états n'écrivent rien du tout. Une panne technique ne peut
donc jamais faire baisser la progression. Cette règle est couverte par le test
`REGLE ABSOLUE` dans `tests/score.test.mjs`.

## Ce qui reste ouvert, honnêtement

**Transcription et prononciation restent deux choses différentes.**
Un moteur qui renvoie le bon mot prouve que la parole a été comprise. Il ne
mesure pas la qualité de l'articulation. La dimension `pronunciation` ne monte
donc que sur une reconnaissance cloud exacte, et l'application ne prétend jamais
noter un accent.

**Google annonce `lb-LU` sur `chirp_3` en Preview, pas en disponibilité
générale.** Vérifié le 7 août 2026. Un service en Preview peut changer.
À revérifier avant toute mise en vente.

**La confiance renvoyée par `chirp_3` n'est pas un vrai score de confiance.**
C'est écrit dans la documentation Google. Elle est transmise pour information et
n'entre dans aucune décision.

**iOS verrouillé.** `SpeechSynthesis` s'arrête quand l'écran s'éteint sur iPhone.
La promesse « pose le téléphone » n'est donc pas encore tenue sur iOS écran
verrouillé. Le contournement durable est l'audio pré-enregistré lu par un élément
`audio`, piloté par la Media Session API. Les contrôles Media Session sont déjà
en place dans cette version, l'audio pré-enregistré viendra ensuite.
