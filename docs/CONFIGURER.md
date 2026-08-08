# CORRIGER LA RECONNAISSANCE VOCALE

Suis ces étapes dans l'ordre. Ne saute rien.

---

## POURQUOI ÇA NE MARCHAIT PAS

Ton fichier `config.js` sur GitHub contient ceci :

```
supabaseUrl: ""
supabaseAnonKey: ""
functionsBaseUrl: ""
```

Trois valeurs vides. C'est le fichier d'origine de la version 4.
L'application disait donc la vérité en affichant « non configurée ».

Tu as probablement renseigné les valeurs dans `config.example.js`
sans renommer le fichier en `config.js`.

---

## ÉTAPE 1 · RÉCUPÉRER TES DEUX VALEURS SUPABASE

1. Ouvre `https://supabase.com/dashboard` et connecte-toi.
2. Clique sur ton projet.
3. Menu de gauche tout en bas, clique sur l'engrenage **Project Settings**.
4. Clique sur **API Keys**.
5. Tu vois une clé qui commence par `sb_publishable_`.
   Clique sur l'icône **Copier** à droite de cette clé.
6. Colle-la quelque part, dans une note ou un email brouillon.

Cette clé est **publique par conception**. Elle n'ouvre aucune porte,
la sécurité est assurée par les règles de la base. Tu peux la mettre
sur GitHub sans risque.

Ne prends jamais la clé marquée **secret** ou **service_role**.

---

## ÉTAPE 2 · REMPLIR LE FICHIER

1. Sur ton ordinateur, ouvre le dossier du ZIP.
2. Ouvre le fichier `config.example.js` avec le Bloc-notes,
   ou TextEdit sur Mac.
3. Cherche cette ligne :

```
  supabaseAnonKey: "",
```

4. Colle ta clé **entre les guillemets**. Tu dois obtenir :

```
  supabaseAnonKey: "sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx",
```

5. Vérifie que les deux autres lignes contiennent bien ton adresse :

```
  supabaseUrl: "https://htmodckxiqdrnrwnripp.supabase.co",
  functionsBaseUrl: "https://htmodckxiqdrnrwnripp.supabase.co/functions/v1",
```

6. Enregistre.
7. **Renomme le fichier** de `config.example.js` en `config.js`.

Sur Windows, si tu ne vois pas l'extension `.js`, ouvre l'Explorateur,
onglet **Affichage**, coche **Extensions de noms de fichiers**.

---

## ÉTAPE 3 · REMPLACER LE FICHIER SUR GITHUB

1. Ouvre `https://github.com/fouadsebane57/luxembourgeois`.
2. Clique sur le fichier `config.js` dans la liste.
3. En haut à droite du fichier, clique sur l'icône **crayon**.
4. Sélectionne tout le contenu et efface-le.
5. Ouvre ton `config.js` corrigé, copie tout, colle dans GitHub.
6. Descends en bas, clique sur le bouton vert **Commit changes**.
7. Dans la fenêtre, clique encore sur **Commit changes**.

Attends deux à trois minutes. GitHub republie le site.

---

## ÉTAPE 4 · VIDER LE CACHE DE TON IPHONE

Indispensable. Sans ça, ton téléphone garde l'ancien fichier.

1. Sur ton iPhone, supprime l'icône LULU Trajet de l'écran d'accueil
   si tu l'avais installée. Appui long, puis **Supprimer l'app**.
2. Réglages, Safari, descends, **Effacer historique, données de site**.
3. Rouvre `https://fouadsebane57.github.io/luxembourgeois/`

---

## ÉTAPE 5 · VÉRIFIER

Dans l'application, va dans l'onglet **Voix et micro**.

Regarde la ligne **Fichier config.js**.

| Ce que tu vois | Ce que ça veut dire |
|---|---|
| OK, les trois valeurs sont présentes | c'est bon, passe à l'étape 6 |
| supabaseAnonKey : VIDE | la clé n'a pas été collée, reprends l'étape 2 |
| format inattendu | tu as collé la mauvaise clé, reprends l'étape 1 |
| config.js n'a pas été chargé | le fichier n'existe pas sur GitHub, reprends l'étape 3 |

---

## ÉTAPE 6 · CRÉER TON COMPTE

La reconnaissance luxembourgeoise nécessite un compte, pour maîtriser
les coûts du service.

1. Onglet **Compte**.
2. Saisis ton email et un mot de passe d'au moins dix caractères.
3. Clique sur **Créer un compte**.
4. Ouvre ta boîte mail, clique sur le lien de confirmation.
5. Reviens dans l'application, connecte-toi.

---

## ÉTAPE 7 · LE TEST FINAL

1. Onglet **Voix et micro**.
2. Clique sur **Tester maintenant**.
3. Autorise le micro si on te le demande.
4. Attends d'entendre « Dis Moien maintenant ».
5. Dis **Moien**, une seule fois, normalement.

Tu dois voir :

```
Attendu     Moien
Entendu     Moien
Moteur      Google STT lb-LU
Temps       environ 700 ms
Résultat    Excellent
```

Si une ligne est rouge, elle indique maintenant **la cause exacte et
ce qu'il faut faire**. Suis l'instruction en doré.

Si tu ne comprends pas, clique sur **Copier** en haut du bloc
Diagnostic et envoie-moi le texte.

---

## SI LA RECONNAISSANCE CLOUD N'EST PAS ENCORE DÉPLOYÉE

Tant que la fonction serveur n'existe pas dans Supabase, la ligne
**Reconnaissance luxembourgeoise** affichera :

> Fonction serveur introuvable.
> Dans Supabase, menu Edge Functions, déploie une fonction nommée
> exactement speech-transcribe.

C'est normal. La marche à suivre complète est dans `docs/DEPLOIEMENT.md`,
phase C. Tant qu'elle n'est pas faite, l'application fonctionne pour
l'écoute et les leçons, mais elle ne peut pas juger ta prononciation.
