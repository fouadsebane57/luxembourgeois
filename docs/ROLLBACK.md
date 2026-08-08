# RETOUR ARRIÈRE

Trois niveaux, du plus léger au plus lourd. Commence toujours par le niveau 1.

## Niveau 1 · Vider le cache de l'application

L'ancienne version peut rester en cache après une mise à jour.

1. Ouvre l'application.
2. Menu **Compte**, section Installation, clique sur **Chercher une mise à jour**.
3. Si un bandeau doré apparaît en haut, clique sur **Recharger maintenant**.

Sur iPhone, si rien ne change : Réglages, Safari, Effacer historique et données.
Sur Android : Chrome, menu, Historique, Effacer les données de navigation.

## Niveau 2 · Restaurer la progression d'avant migration

La migration v4 vers v5 conserve automatiquement une copie intacte sous la clé
`letz:v4:backup`. Elle n'est jamais écrasée.

Ouvre la console du navigateur sur la page de l'application, puis colle :

```js
const s = localStorage.getItem("letz:v4:backup");
if (s) { localStorage.setItem("letz:v4", JSON.parse(s).data && JSON.stringify(JSON.parse(s).data));
         localStorage.removeItem("letz:v5"); location.reload(); }
else console.log("Aucune sauvegarde trouvée.");
```

Tu peux aussi simplement réimporter ton dernier export JSON via
**Progression**, puis **Importer**. La v5 sait relire un export v4.

## Niveau 3 · Revenir entièrement à la version 4

La branche `sauvegarde-v4` a été créée à l'étape A1 du déploiement.

1. Sur GitHub, ouvre ton dépôt.
2. Onglet **Settings**, menu **Pages**.
3. Dans la section **Build and deployment**, change la branche de `main` vers `sauvegarde-v4`.
4. Clique sur **Save**.

L'ancienne version redevient en ligne en deux à trois minutes.
La progression v4 des utilisateurs est intacte, car la v5 ne l'a jamais supprimée.

## Ce qui ne nécessite jamais de retour arrière

Le côté serveur n'est jamais détruit par un retour arrière du frontend.

- Le schéma SQL est idempotent, il peut être relancé.
- Les Edge Functions peuvent être supprimées sans toucher aux données.
- La table `user_progress` conserve chaque instantané envoyé.

Pour désactiver la reconnaissance cloud sans rien supprimer :
Supabase, **Edge Functions**, ouvre `speech-transcribe`, clique sur **Delete function**.
L'application bascule automatiquement sur la reconnaissance de secours, et
aucune progression n'est pénalisée puisqu'une panne technique n'écrit rien.
