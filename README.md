# Lëtzebuergesch am Auto · REVOLUTION 4.0

Cette version transforme le prototype en base de produit commercial.

Elle fonctionne immédiatement en mode local sur GitHub Pages. Les fonctions commerciales sont séparées du frontend pour qu'aucun secret Stripe ou Google ne soit exposé dans le navigateur.

## Ce qui fonctionne sans aucun compte

- PWA installable.
- 35 leçons et 255 expressions actuelles.
- Mode trajet intelligent.
- Révisions espacées.
- Sprint oral.
- Chiffres.
- Écoute libre.
- Lexique, favoris et recherche.
- Progression et statistiques.
- Export et import.
- Synthèse vocale locale.
- Écho de la voix.
- Reconnaissance du navigateur en secours.
- Migration de la progression des versions précédentes.

## Ce qui devient disponible après configuration du backend

- Création de comptes.
- Synchronisation multi-appareils.
- Abonnement Premium mensuel et annuel.
- Stripe Checkout.
- Portail client Stripe.
- Mise à jour automatique de l'accès Premium par webhook.
- Reconnaissance cloud du luxembourgeois avec Google Cloud Speech-to-Text V2, modèle Chirp 2, locale lb-LU.
- Quota d'essai cloud pour les comptes gratuits.

## Architecture

Frontend : GitHub Pages ou autre hébergeur statique.

Backend : Supabase Auth, Postgres, RLS et Edge Functions.

Paiement : Stripe Billing + Checkout + Customer Portal.

Reconnaissance cloud : Google Cloud Speech-to-Text V2.

Contenu linguistique : `cours.js` reste la source actuelle. Pour une commercialisation, chaque expression doit être relue et validée avec une source linguistique fiable, notamment le Lëtzebuerger Online Dictionnaire du Zenter fir d'Lëtzebuerger Sprooch.

## Ordre de mise en ligne recommandé

1. Tester cette version en local sur ton téléphone.
2. Remplacer les fichiers du dépôt GitHub par ceux de ce dossier.
3. Vérifier la PWA, les leçons, le micro et les sessions.
4. Créer Supabase et exécuter `supabase/schema.sql`.
5. Créer Stripe en mode test et créer deux prix récurrents.
6. Créer Google Cloud Speech-to-Text.
7. Déployer les Edge Functions.
8. Renseigner uniquement les valeurs publiques dans `config.js`.
9. Tester comptes, abonnement et reconnaissance cloud.
10. Compléter les pages juridiques.
11. Vérifier les prix, la TVA et les règles consommateurs applicables.
12. Passer Stripe en production seulement après les tests.

Lis `docs/DEPLOIEMENT_COMPLET.md` pour les étapes exactes.

## Sécurité importante

Ne mets jamais dans `config.js` :

- la clé secrète Stripe ;
- le secret du webhook Stripe ;
- la clé Supabase service role ;
- la clé privée du compte de service Google.

Ces valeurs vont uniquement dans les secrets des Edge Functions.

## Statut de cette version

Le frontend est un prototype avancé et fonctionnel. L'architecture de paiement et de reconnaissance cloud est fournie, mais elle doit être configurée avec tes propres comptes de services avant de pouvoir encaisser de vrais abonnements.

Les pages `legal.html`, `privacy.html` et `terms.html` sont des modèles de travail, pas des textes juridiques finaux.
