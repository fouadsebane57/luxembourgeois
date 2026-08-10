# TEST IPHONE · GATE 2.5

Onze points à vérifier. Coche, et note ce qui échoue.

## Avant de commencer

☐ `config.js` NON remplacé, celui de votre dépôt est déjà bon
☐ Fichiers du ZIP envoyés sur GitHub, **sauf `config.js` qui n'y est pas**
☐ iPhone : Réglages, Safari, Effacer historique et données de site
☐ Si l'application était installée : la supprimer, puis la réinstaller

Sans le vidage du cache, votre téléphone continuera de servir l'ancien code
et aucun de ces tests n'aura de sens.

---

## 1 · Micro autorisé

☐ Onglet **Voix et micro**, bouton **Tester maintenant**
☐ L'autorisation est demandée, puis la ligne passe à **OK**

## 2 · Format réellement choisi

☐ Ligne **Enregistrement audio** : noter le format affiché : ______________
☐ Ligne **Lecture locale du format** : compatible ou non compatible ? ______
☐ Ligne **Format accepté par la transcription** : ______________

Ces trois lignes sont mesurées sur VOTRE appareil. Si la lecture locale
est annoncée non compatible, l'application vous prévient à l'avance
plutôt que de vous laisser face à un silence.

## 3 · Voix enregistrée

☐ Le test dit « Dis Moien maintenant »
☐ Ligne **Détection de parole** : durée et seuil affichés, valeurs plausibles
☐ Aucune valeur absurde du type -527 dB ou 514 dB de rapport signal sur bruit

## 4 · Micro libéré

Point renforcé en 2.1 : la libération est désormais garantie par un
`finally`, y compris si l'enregistrement échoue.


☐ Après l'enregistrement, l'indicateur orange du micro **s'éteint**
☐ Il ne reste pas allumé pendant toute la séance

## 5 · Écho réellement audible

L'ordre a changé en 2.2. Vous devez entendre, dans cet ordre :

1. le retour, par exemple « Presque »
2. **votre propre voix**
3. le modèle en luxembourgeois

Le modèle vient en dernier : c'est la forme correcte qui doit rester.
Sur une réponse jugée correcte, ni écho ni modèle : la séance enchaîne.


☐ Bouton **Réécouter mon enregistrement** : vous vous entendez
☐ Si vous ne vous entendez pas, un message rouge apparaît et dit pourquoi

C'est le point le plus important de ce lot. Un silence sans message
signifie que la correction n'a pas fonctionné : signalez-le avec le
format noté au point 2.

## 6 · Pause éteint le micro et ne perd pas l'exercice

☐ Pendant une consigne, appuyer sur **Pause**
☐ L'indicateur orange du micro s'éteint immédiatement
☐ Appuyer sur **Reprendre**
☐ **La MÊME expression est rejouée**, pas la suivante

C'est le point ajouté en 2.3. Si une autre expression démarre, la
correction n'a pas fonctionné.

## 6 bis · Pause puis Suivant

☐ Pendant une expression, appuyer sur **Pause**
☐ Appuyer sur **Suivant**
☐ **L'application RESTE en pause**, aucune voix ne repart
☐ L'indicateur orange du micro reste éteint
☐ Appuyer sur **Reprendre**
☐ **Une expression DIFFÉRENTE démarre**, pas celle d'avant

C'est le point ajouté en 2.4. Si l'ancienne expression revient, la
correction n'a pas fonctionné.

## 6 ter · Suivant saute exactement un exercice

☐ Noter l'expression en cours
☐ Appuyer **deux fois très vite** sur Suivant
☐ Une seule expression est passée, pas deux

## 6 quater · Répéter pendant l'enregistrement

☐ Pendant que l'application écoute, appuyer sur **Répéter**
☐ **Aucune voix ne se superpose à votre enregistrement**
☐ Un message court peut apparaître

## 6 quinquies · Pause éteint le micro

☐ Lancer une séance, appuyer sur **Pause**
☐ L'indicateur orange du micro **s'éteint immédiatement**
☐ La mention « Micro coupé » apparaît
☐ **Reprendre** relance la séance normalement

## 7 · Quitter libère tout

☐ Quitter la séance
☐ L'indicateur orange est éteint
☐ Aucune voix ne continue
☐ Rouvrir une séance fonctionne du premier coup

## 8 · Aucun double enregistrement

☐ Appuyer deux fois de suite très vite sur **Reprendre mon trajet**
☐ Une seule séance démarre
☐ Le message « Une séance est déjà en cours » peut apparaître : c'est voulu

## 9 · Aucune montée par simple écoute

☐ Noter le nombre affiché sous **maîtrise vérifiée** : ______
☐ Lancer **Écoute libre** pendant 5 minutes sans jamais parler
☐ Revenir à l'accueil : le nombre doit être **identique**
☐ Le compteur d'expositions, lui, a bien augmenté

## 10 · Rythme séparé de la transcription

☐ Faire un exercice oral sans reconnaissance cloud
☐ Le texte affiché commence par **« Rythme mesuré, les mots ne sont pas analysés »**
☐ Il n'y a **jamais** « Entendu : » sans transcription réelle

## 11 · Aucun double enregistrement, version renforcée

☐ Pendant une séance, appuyer sur **Répéter** puis immédiatement **Suivant**
☐ Une seule voix parle à la fois, jamais deux superposées

## 12 · Progression historique conservée

☐ Sur l'accueil, un bloc **progression historique** apparaît si vous aviez
  déjà progressé
☐ Le nombre correspond à votre ancienne progression
☐ Rien n'a disparu

---

## À prévoir : un chiffre va baisser

Le compteur **maîtrise vérifiée** repart de zéro. Ce n'est pas une perte.

L'ancienne application augmentait le niveau sur simple écoute, et il est
impossible de distinguer après coup ce qui venait d'une vraie réussite.
Votre progression est intégralement conservée sous **progression
historique**, et chaque bonne réponse la reconvertit en maîtrise vérifiée.

Un retour arrière complet reste possible : `docs/ROLLBACK.md`.

---

## En cas d'échec

Onglet **Voix et micro**, bouton **Copier** en haut du bloc Diagnostic.
Envoyez le texte avec : ce que vous faisiez, ce que vous attendiez,
ce qui s'est passé.


---

## AJOUT GATE 2.5 · file de séance

À vérifier sur appareil réel, en plus des points ci-dessus.

1. Lancer une séance « Écoute et répète ».
2. Noter l'expression en cours.
3. Appuyer sur Pause.
4. Appuyer sur Suivant.
5. Vérifier que la séance reste en pause et que le micro ne se rouvre pas.
6. Appuyer sur Reprendre.
7. Vérifier que l'expression est DIFFÉRENTE de celle notée à l'étape 2.

Répéter en mode « Mode voiture ». À l'étape 6, l'expression doit aussi
être différente : la répétition soudée à l'écoute est écartée avec elle.

Répéter en mode « Chiffres ». Chaque nombre doit revenir trois fois dans
la séance, mais jamais deux fois de suite tant qu'un autre nombre reste
disponible.

Laisser enfin tourner une séance longue sur peu de contenu, jusqu'à
épuisement de la file. Le recyclage doit prendre le relais sans jamais
répéter deux fois de suite la même expression.
