# PROTOCOLE DE TESTS RÉELS

Les tests automatiques couvrent la logique. Ils ne peuvent pas couvrir un micro,
une voiture ou un moteur de transcription. Ce protocole complète.

Critère de validation général : ouvrir l'application, lancer un exercice,
entendre une expression, la répéter normalement, obtenir une réaction cohérente
sans devoir recommencer cinq fois.

## Tests automatiques

```
node --test "tests/*.test.mjs"
```

Attendu : 35 tests, 0 échec.

## Série 1 · Chrome sur Android, au calme

| Test | Attendu | Résultat |
|---|---|---|
| Autorisation micro demandée une seule fois | oui | ☐ |
| Diagnostic : neuf lignes affichées | oui | ☐ |
| Test « Moien » prononcé correctement | Correct | ☐ |
| Test « Moien » prononcé volontairement faux | À retravailler ou Réponse proche | ☐ |
| Silence complet pendant le test | Aucune parole détectée, progression inchangée | ☐ |
| Réécoute de l'enregistrement | audible et net | ☐ |
| Latence affichée | inférieure à 1500 ms | ☐ |

## Série 2 · Safari sur iPhone, au calme

| Test | Attendu | Résultat |
|---|---|---|
| Format audio détecté | `audio/mp4` | ☐ |
| Test « Moien » | Correct | ☐ |
| Séance de 10 minutes, écran allumé | se déroule sans interruption | ☐ |
| Séance écran verrouillé | limite connue, la synthèse s'arrête | ☐ |
| Installation sur l'écran d'accueil | fonctionne | ☐ |

## Série 3 · En voiture, à l'arrêt moteur tournant

Prépare et lance toujours la séance à l'arrêt. Ne manipule jamais l'écran en roulant.

| Test | Attendu | Résultat |
|---|---|---|
| Profil Voiture activé | seuil relevé, visible au diagnostic | ☐ |
| Bruit ambiant mesuré | affiché en décibels | ☐ |
| Téléphone sur support, à distance normale | parole détectée | ☐ |
| Ventilation à fond | parole toujours détectée | ☐ |
| Micro Bluetooth de la voiture | avertissement de qualité réduite affiché | ☐ |
| Comparaison micro téléphone contre micro Bluetooth | noter lequel donne le meilleur taux | ☐ |

## Série 4 · En roulant, passager au volant

Ne fais jamais cette série seul au volant.

| Test | Attendu | Résultat |
|---|---|---|
| Séance de 20 minutes sans toucher l'écran | se déroule seule | ☐ |
| Bouton suivant sur le volant | passe à l'exercice suivant | ☐ |
| Bouton précédent sur le volant | répète l'expression | ☐ |
| Pause depuis l'écran de la voiture | suspend la séance | ☐ |
| Taux de reconnaissance sur 20 réponses | noter le chiffre réel | ☐ |

## Série 5 · Durée des séances

| Durée choisie | Durée mesurée | Écart accepté |
|---|---|---|
| 10 min | ☐ | moins d'une minute |
| 20 min | ☐ | moins d'une minute |
| 30 min | ☐ | moins d'une minute |
| 45 min | ☐ | moins d'une minute |
| 60 min | ☐ | moins d'une minute |

## Série 6 · Comptes et synchronisation

| Test | Attendu | Résultat |
|---|---|---|
| Création de compte, email reçu | oui | ☐ |
| Connexion | progression conservée | ☐ |
| Progression locale plus compte existant | fenêtre de choix affichée | ☐ |
| Deux appareils, une séance sur chacun | pas de perte de données | ☐ |
| Mode avion pendant une séance | séance continue, synchronisation en attente | ☐ |
| Retour du réseau | synchronisation automatique | ☐ |
| Déconnexion | statut Premium retombe à Découverte | ☐ |
| Modification manuelle de `localStorage` pour se déclarer Premium | reste Découverte | ☐ |

## Série 7 · Coûts et quotas

| Test | Attendu | Résultat |
|---|---|---|
| Compte gratuit, 31 reconnaissances dans le mois | refus au-delà de 30, message clair | ☐ |
| 13 reconnaissances en une minute | refus, message d'attente | ☐ |
| Enregistrement de plus de 10 secondes | tronqué avant envoi | ☐ |
| Table `speech_usage` dans Supabase | compteurs qui montent | ☐ |
| Table `speech_events` | aucune transcription, aucun audio | ☐ |

## À noter pour chaque anomalie

Copie le diagnostic avec le bouton **Copier**, puis indique :
appareil, navigateur, environnement, expression attendue, texte entendu, verdict.
