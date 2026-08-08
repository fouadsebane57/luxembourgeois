# DÉPLOIEMENT v5.0.0

Une étape à la fois. Fais l'étape, dis-moi que c'est fait, je te donne la suivante.
Ne colle jamais une clé secrète dans le chat ni dans GitHub.

---

## PHASE A · METTRE EN LIGNE LE FRONTEND

### Étape A1 · Sauvegarder la version qui marche
Sur GitHub, ouvre ton dépôt `luxembourgeois`.
Clique sur le sélecteur de branche à gauche, celui qui affiche `main`.
Tape `sauvegarde-v4` dans le champ, puis clique sur **Créer une branche : sauvegarde-v4 à partir de main**.

Tu as maintenant un retour arrière garanti. Ne passe pas à la suite sans avoir fait ça.

### Étape A2 · Récupérer ton config.js actuel
Toujours sur GitHub, branche `main`, ouvre le fichier `config.js`.
Clique sur l'icône **Copier le contenu brut**.
Garde-le de côté. Il contient tes trois valeurs Supabase.

### Étape A3 · Déposer les fichiers v5
Décompresse le ZIP sur ton ordinateur.
Ouvre `config.example.js`, recopie dedans tes trois valeurs de l'étape A2, puis renomme le fichier en `config.js`.

Sur GitHub, branche `main`, bouton **Add file**, puis **Upload files**.

Glisse le contenu du dossier, y compris les sous-dossiers `src`, `supabase`,
`tests`, `docs`, `scripts`. Glisse bien les **dossiers entiers**, pas les
fichiers un par un : GitHub conserve l'arborescence.

Message de validation : `v5.0.0 correctifs P0 et nouveau moteur vocal`.
Clique sur **Commit changes**.

Ensuite, supprime l'ancien fichier `app.js` resté à la racine. Il date de la v4
et n'est plus utilisé. Ouvre-le sur GitHub, clique sur l'icône corbeille, puis
**Commit changes**.

Vérifie enfin que ces fichiers sont bien présents à la racine du dépôt :
`cours.js`, `cours.legacy-map.json`, `config.js`, `index.html`, `sw.js`,
et le dossier `src` avec ses cinq sous-dossiers.

### Étape A4 · Vérifier
Ouvre `https://fouadsebane57.github.io/luxembourgeois/`.
Sur ton téléphone, va dans **Réglages** puis vide le cache du navigateur, sinon l'ancienne version reste affichée.

À vérifier :
- la page s'affiche,
- ta progression est toujours là, un message indique combien d'expressions ont été migrées,
- l'onglet **S'entraîner** : les boutons Dialogues et Mes erreurs réagissent au clic,
- l'onglet **Voix et micro** : le diagnostic se remplit.

Si quelque chose ne va pas, applique `docs/ROLLBACK.md`.

---

## PHASE B · BASE DE DONNÉES SUPABASE

Ton projet existe déjà, région `eu-central-1` (Francfort). Rien à recréer.

### Étape B1 · Exécuter le schéma
Ouvre `https://supabase.com/dashboard`, choisis ton projet.
Menu de gauche, clique sur **SQL Editor**, puis **New query**.
Ouvre le fichier `supabase/schema.sql` du ZIP, copie tout le contenu, colle-le, clique sur **Run**.

Tu dois voir `Success. No rows returned`.

### Étape B2 · Vérifier la sécurité
Toujours dans **SQL Editor**, nouvelle requête, colle ceci puis **Run** :

```sql
select tablename, rowsecurity from pg_tables
 where schemaname = 'public'
   and tablename in ('profiles','user_progress','subscriptions','speech_usage','speech_events','rate_limits');
```

Les six lignes doivent afficher `true` dans la colonne `rowsecurity`.
Si une seule affiche `false`, arrête-toi et dis-le-moi.

### Étape B3 · Confirmation d'email
Menu de gauche, **Authentication**, puis **Sign In / Providers**, section **Email**.
Vérifie que **Confirm email** est activé.
Section **URL Configuration** : mets `https://fouadsebane57.github.io/luxembourgeois/` dans **Site URL**, et ajoute la même adresse dans **Redirect URLs**.

### Étape B4 · Tester un compte
Retourne sur l'application, onglet **Compte**.
Crée un compte avec ton adresse. Ouvre l'email de confirmation. Connecte-toi.

Vérifie ensuite dans Supabase, menu **Table Editor** :
- table `profiles` : une ligne avec ton identifiant,
- table `subscriptions` : une ligne avec `status = inactive`.

Si les deux lignes existent, l'authentification et les déclencheurs fonctionnent.

### Étape B5 · T'accorder Premium pour tester

Un compte gratuit est limité à 30 reconnaissances cloud par mois. Tu épuiseras
ce quota dès ta première séance de tests en voiture.

Ouvre **SQL Editor**, nouvelle requête. Ouvre le fichier
`supabase/admin-outils.sql` du ZIP, copie le **bloc 1**, retire les `--` en
début de ligne, remplace l'adresse email par la tienne, puis clique sur **Run**.

Retourne dans l'application, onglet **Compte**. Le plan doit afficher
**Premium**. Si ce n'est pas le cas, déconnecte-toi et reconnecte-toi.

Ce fichier contient aussi de quoi suivre ta consommation, remettre ton compteur
à zéro et mesurer le taux d'échec réel de la reconnaissance. Tu en auras besoin
pendant les tests terrain.

---

## PHASE C · GOOGLE CLOUD SPEECH-TO-TEXT

Ne fais cette phase qu'après la validation complète de la phase B.

### Étape C1 · Créer le projet
Ouvre `https://console.cloud.google.com`.
En haut, clique sur le sélecteur de projet, puis **NOUVEAU PROJET**.
Nom : `letzebuergesch-stt`. Clique sur **CRÉER**.

### Étape C2 · Activer la facturation
Menu de gauche, **Facturation**. Associe un compte de facturation.
C'est obligatoire même avec les crédits gratuits.

### Étape C3 · Activer l'API
Barre de recherche en haut, tape `Cloud Speech-to-Text API`.
Ouvre le résultat, clique sur **ACTIVER**.

### Étape C4 · Créer le compte de service
Menu, **IAM et administration**, puis **Comptes de service**.
Clique sur **CRÉER UN COMPTE DE SERVICE**.
Nom : `stt-edge-function`. Clique sur **CRÉER ET CONTINUER**.
Rôle : cherche et sélectionne **Utilisateur Cloud Speech-to-Text**. Clique sur **CONTINUER**, puis **OK**.

### Étape C5 · Créer la clé
Dans la liste, clique sur le compte `stt-edge-function`.
Onglet **CLÉS**, bouton **AJOUTER UNE CLÉ**, puis **Créer une clé**.
Choisis **JSON**, clique sur **CRÉER**. Un fichier se télécharge.

Ce fichier est un secret. Il ne va jamais sur GitHub, jamais dans le chat, jamais dans `config.js`.

Note simplement le **numéro du projet** affiché en haut de la console. Ce numéro n'est pas secret.

### Étape C6 · Enregistrer les secrets dans Supabase
Retourne sur Supabase. Menu de gauche, **Edge Functions**, puis onglet **Secrets**.
Clique sur **Add new secret** et crée les entrées suivantes, une par une.

| Nom | Valeur à saisir |
|---|---|
| `GOOGLE_PROJECT_ID` | le champ `project_id` du fichier JSON |
| `GOOGLE_CLIENT_EMAIL` | le champ `client_email` du fichier JSON |
| `GOOGLE_PRIVATE_KEY` | le champ `private_key` du fichier JSON, en entier, y compris `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----` |
| `SPEECH_REGION` | `eu` |
| `SPEECH_MODEL` | `chirp_3` |
| `SPEECH_MAX_PER_MONTH_FREE` | `30` |
| `SPEECH_MAX_PER_MONTH_PREMIUM` | `4000` |
| `SPEECH_MAX_PER_MINUTE` | `12` |
| `ALLOWED_ORIGIN` | `https://fouadsebane57.github.io` |

Ouvre le fichier JSON avec le Bloc-notes pour lire ces champs. Ne le laisse pas dans ton dossier de téléchargements ensuite.

### Étape C7 · Déployer les deux fonctions

Toujours dans **Edge Functions**, clique sur **Deploy a new function**, puis **Via Editor**.

Première fonction. Nom exact : `speech-transcribe`.
Efface le code d'exemple. Colle le contenu de
`supabase/functions/speech-transcribe/index.ts`. Clique sur **Deploy function**.

Deuxième fonction. Refais **Deploy a new function**, puis **Via Editor**.
Nom exact : `delete-account`.
Colle le contenu de `supabase/functions/delete-account/index.ts`.
Clique sur **Deploy function**.

La seconde gère la suppression de compte, obligatoire au titre du RGPD. Elle ne
demande aucun secret supplémentaire.

### Étape C8 · Tester
Sur l'application, onglet **Voix et micro**, connecté à ton compte.
Clique sur **Tester maintenant** et dis « Moien ».

Tu dois voir apparaître, ligne par ligne :

```
Attendu                     Moien
Entendu                     Moien
Moteur                      Google STT lb-LU
Temps                       620 ms
Résultat                    Correct
```

Si le résultat est faux, clique sur **Réécouter mon enregistrement**.
- Tu t'entends bien et le texte est faux : le problème vient du moteur de transcription.
- Tu ne t'entends pas ou très mal : le problème vient du micro ou de sa position.

Dans les deux cas, clique sur **Copier** dans le bloc Diagnostic et envoie-moi le résultat.

---

## Rappel de sécurité

Ne place jamais dans GitHub ni dans `config.js` :
la clé secrète Supabase `sb_secret_`, la clé `service_role`, une clé Stripe secrète,
un secret de webhook, ou le fichier JSON du compte de service Google.

La clé publiable `sb_publishable_` est publique par conception. Elle est protégée par la RLS.
