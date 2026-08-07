# Lëtzebuergesch am Auto

Cours oral de luxembourgeois pour les trajets en voiture.
35 leçons, 255 expressions, 10 dialogues, plan de 100 heures.

Conçu par Fouad SEBANE.

---

## AVERTISSEMENT

Le contenu vient de connaissances générales, **pas d'une source officielle**.
Avant de travailler une leçon, vérifie ses mots sur **lod.lu**, le dictionnaire
officiel du Zenter fir d'Lëtzebuerger Sprooch. Chaque mot a un lien direct dans
l'application.

Aucune voix luxembourgeoise n'existe dans les téléphones. La voix utilisée est
allemande. **La prononciation entendue est approximative.** Le modèle sonore de
référence reste l'audio natif de lod.lu.

---

## LES FICHIERS

| Fichier | Rôle |
|---|---|
| `index.html` | L'interface et les styles |
| `cours.js` | **Tout le contenu du cours.** C'est le seul fichier à éditer pour ajouter ou corriger du vocabulaire |
| `app.js` | Le moteur : séances, mémoire espacée, voix, micro |
| `sw.js` | Rend l'application utilisable hors ligne |
| `manifest.webmanifest` | Fait de la page une vraie application installable |
| `icon-192.png`, `icon-512.png` | L'icône sur l'écran d'accueil |

Les six fichiers doivent rester **dans le même dossier**, sans sous-dossier.

---

## ÉTAPE 1 · SUR L'ORDINATEUR, PUBLIER LA PAGE

Le micro n'est autorisé par les navigateurs que sur une adresse en **HTTPS**.
C'est la seule raison pour laquelle la correction vocale ne fonctionnait pas.
Il faut donc publier la page. C'est gratuit et définitif.

### 1. Créer un compte GitHub
Va sur `github.com`, clique **Sign up**. Adresse e-mail, mot de passe, nom
d'utilisateur. Confirme l'e-mail.

### 2. Créer le dépôt
En haut à droite, bouton **+**, puis **New repository**.
- Repository name : `luxembourgeois`
- Coche **Public**
- Ne coche rien d'autre
- **Create repository**

### 3. Envoyer les fichiers
Sur la page du dépôt, clique **uploading an existing file**
(ou **Add file** puis **Upload files**).
Glisse les **six fichiers** dans la zone. Pas le dossier, les fichiers.
En bas, bouton vert **Commit changes**.

### 4. Activer la publication
Onglet **Settings** en haut du dépôt, puis **Pages** dans la colonne de gauche.
- Source : **Deploy from a branch**
- Branch : **main**, dossier **/ (root)**
- **Save**

### 5. Récupérer l'adresse
Attends une à deux minutes, puis recharge la page Settings > Pages.
Une adresse apparaît, de la forme :

```
https://TON-NOM.github.io/luxembourgeois/
```

Ouvre-la sur l'ordinateur pour vérifier que tout s'affiche.
Envoie-toi l'adresse par mail ou par message, tu en auras besoin sur le téléphone.

---

## ÉTAPE 2 · SUR LE TÉLÉPHONE, INSTALLER

### Android, avec Chrome
1. Ouvre l'adresse dans **Chrome**.
2. Menu à trois points, puis **Installer l'application**. Si l'option n'apparaît
   pas, prends **Ajouter à l'écran d'accueil**.
3. Lance l'application depuis l'icône.

### iPhone, avec Safari
1. Ouvre l'adresse dans **Safari**, pas dans une autre application.
2. Bouton **Partager**, puis **Sur l'écran d'accueil**.
3. Lance l'application depuis l'icône.

---

## ÉTAPE 3 · PRÉPARER LA VOIX ET LE MICRO

### Installer les voix, une seule fois
**Android** : Réglages > Système > Langues et saisie > Synthèse vocale >
Installer les données vocales > **Allemand** et **Français**.

**iPhone** : Réglages > Accessibilité > Contenu énoncé > Voix >
télécharger une voix **allemande** et une voix **française**.

Sans ces voix, l'application reste muette hors ligne.

### Lancer le diagnostic
Dans l'application, onglet **Voix et micro**, bouton **Lancer le diagnostic**.
Fais-le **à l'arrêt**. Autorise le micro quand le téléphone le demande.

Le diagnostic vérifie sept points et te dit exactement lequel bloque.
Toutes les lignes doivent être vertes, sauf éventuellement la reconnaissance
vocale si tu n'as pas de réseau.

---

## ÉTAPE 4 · LA PREMIÈRE SÉANCE

Ne commence pas par soixante minutes.

- **Jour 1** : 10 minutes, leçon 1, les chiffres de zéro à cinq.
- **Jour 2 à 5** : 20 minutes le matin, 20 minutes le soir en mode Retour.
- **À partir de la semaine 2** : 60 minutes à l'aller, 60 au retour.

Lance la séance **avant de démarrer la voiture**. Ensuite tu ne touches plus
le téléphone jusqu'à l'arrivée.

---

## LES CINQ MODES

| Mode | Quand |
|---|---|
| **Aller** | Séance principale. Nouveaux mots et rappels |
| **Retour** | Le soir. Consolidation de la journée, aucun mot nouveau |
| **Jeu** | 5 minutes de série rapide, score annoncé |
| **Chiffres au hasard** | Entraînement pur sur les nombres |
| **Écoute libre** | Jour de fatigue ou trafic dense. Rien à dire |

---

## CORRIGER OU AJOUTER DU VOCABULAIRE

Ouvre `cours.js` dans un éditeur de texte. Chaque expression a cette forme :

```js
{lb:"Moien", fr:"bonjour, salut", ph:"mo-ï-eune", tr:"Moien contient moi."}
```

- `lb` : le luxembourgeois, tel qu'il s'écrit
- `fr` : la traduction française
- `ph` : la prononciation approchée pour un francophone
- `tr` : astuce de mémoire, facultative

Pour ajouter une leçon, copie un bloc existant et modifie-le.
Réenvoie ensuite le fichier sur GitHub, **Add file > Upload files**, et
**augmente le numéro de version dans `sw.js`** (`lux-v1` devient `lux-v2`),
sinon les téléphones garderont l'ancienne version en cache.

---

## SAUVEGARDER LA PROGRESSION

La progression vit sur l'appareil. Onglet **Suivi**, bas de page :
**Exporter ma progression** produit un fichier JSON.
**Importer une sauvegarde** le restaure, y compris sur un autre téléphone.

Fais-le une fois par mois. Vider les données du navigateur efface tout.

---

## APRÈS LES 100 HEURES

Inscription à l'**Institut national des langues Luxembourg**, `inll.lu`.
Tu n'y arriveras pas débutant total, mais avec une base. La différence est
considérable.

L'INLL publie aussi **Poterkëscht**, un podcast en luxembourgeois pour
apprenants. Radio 100,7 diffuse en luxembourgeois toute la journée.
Ces deux ressources complètent bien les trajets.
