# GATE 2.5 · FILE DE SÉANCE PAR CANDIDATURES

Version produit inchangée : 5.1.0. Build de cache : `gate2-5`.

## 1. Le défaut

La file était construite en concaténant des listes qui se recouvrent,
puis en mélangeant le tout.

```
neufs   ⊂ leconItems        par construction
dus     ∩ enCours ≠ ∅       un item dû peut être en cours
dus     ∩ solides ≠ ∅       un item solide redevient dû
```

Le même `itemId` apparaissait donc plusieurs fois sans qu'aucune règle
pédagogique ne l'ait demandé. Le mélange pouvait produire `A A B C`.

Conséquence visible sur le terrain :

```
expression A → Pause → Suivant → Reprendre → A revenait
```

La réserve de recyclage souffrait du même défaut, et le passage de la
file au recyclage n'était protégé par rien.

## 2. Pourquoi pas une déduplication

Supprimer les doublons aurait fait disparaître des répétitions utiles.
Le mode chiffres fait trois passages voulus sur le même nombre. Le mode
voiture fait écouter puis répéter la même expression. Ces occurrences
doivent être conservées.

Le problème n'était pas la répétition. C'était la répétition **subie**.

## 3. La solution

Chaque occurrence est une **candidature** explicite :

| champ | rôle |
|---|---|
| `itemId` | l'expression concernée |
| `source` | d'où vient l'occurrence : `du`, `neuf`, `lecon`, `solide`… |
| `raison` | pourquoi : `decouverte`, `rappel`, `ancrage`, `drill`… |
| `priorite` | 0 = à traiter en premier |
| `echeance` | date de révision, 0 si sans objet |
| `intentionnelle` | répétition voulue par une règle pédagogique |
| `adjacenceVoulue` | doit suivre immédiatement l'occurrence précédente |

Trois étapes ensuite.

**Fusion.** Deux candidatures NON intentionnelles portant le même couple
`(itemId, type)` viennent forcément d'un recouvrement de listes. Elles
sont fusionnées en une seule, qui garde la priorité la plus forte et
l'échéance la plus proche. Le nombre de fusions est compté dans
`seance.diagnosticFile`. Rien ne disparaît en silence.

**Blocs.** Une candidature marquée `adjacenceVoulue` est soudée à la
précédente. Le bloc devient l'unité déplaçable : l'écoute et la
répétition d'un même mot ne peuvent plus être séparées.

**Espacement.** À chaque pas, on retient le bloc dont l'expression a le
plus d'occurrences restantes parmi celles qui diffèrent de la
précédente. À égalité, l'ordre d'origine tranche.

Prendre simplement le premier bloc différent ne suffit pas : sur
`A B C A A`, cette méthode finit sur `A A` alors que `A B A C A`
existe. L'algorithme retenu trouve toujours une disposition sans
adjacence quand il en existe une.

Quand il ne reste que l'expression courante, l'adjacence est produite
et comptée comme **inévitable**, jamais comme accidentelle.

## 4. Aléa injectable

`Math.random()` a disparu du moteur de séance. Il ne subsiste que dans
`src/core/rng.js`, seul module autorisé, et dans `state.js` pour un
identifiant. Un test d'architecture le vérifie.

```js
// production
creerSeance({ mode, items, ... })              // aléa normal

// test
creerSeance({ mode, items, ..., seed: 42 })    // file reproductible
```

Graines contrôlées : 1, 2, 3, 10, 42, 100, 999, 2026.
Changer la graine change l'ordre. Aucune graine ne casse un invariant.

## 5. Invariants garantis

1. Si au moins deux expressions distinctes sont disponibles, deux
   occurrences de la même expression ne se suivent jamais, sauf
   `adjacenceVoulue`.
2. Aucune occurrence intentionnelle n'est supprimée. Elle est déplacée.
3. Une même graine reconstruit exactement la même file.
4. `Pause → Suivant → Reprendre` donne une autre expression dès qu'une
   autre existe.
5. Une seule expression disponible : `A A` est accepté et signalé.

## 6. Défauts annexes corrigés

- **Recyclage.** La réserve contenait les mêmes doublons de listes. Elle
  passe désormais par la même chaîne.
- **Bord file / recyclage.** Au passage de la file au recyclage, puis à
  chaque bouclage, l'expression suivante ne peut plus être celle qui
  vient d'être consommée.
- **Remplacement de fin de séance.** Quand le temps restant imposait un
  exercice plus court pris plus loin, l'index sautait jusqu'à lui et les
  occurrences intermédiaires étaient perdues sans trace. L'occurrence
  retenue est maintenant retirée à sa place, l'index ne bouge pas.
- **Saut d'une découverte.** Sauter une écoute de découverte laissait
  sa répétition soudée en place : l'expression écartée revenait
  immédiatement. Les deux occurrences sont écartées ensemble, et
  comptées comme UNE expression sautée.
- **Filet de lecture.** `prochain()` vérifie une dernière fois qu'il ne
  sert pas l'expression qui vient d'être consommée, et déplace le bloc
  suivant si besoin.

## 7. Diagnostic exposé

`seance.diagnosticFile` :

```
brutes                   candidatures avant fusion
fusionnees               occurrences accidentelles absorbées
occurrences              taille finale de la file
intentionnelles          occurrences voulues conservées
deplacements             blocs déplacés par l'espacement
adjacencesInevitables    répétitions subies, faute d'alternative
adjacencesAccidentelles  doit toujours valoir 0
```

## 8. Ce que ce lot ne couvre pas

Aucun test ici ne remplace un essai sur iPhone réel. Restent à vérifier
sur appareil : lecture de l'écho, libération effective du micro,
comportement du verrouillage écran, et interruption par un appel.
