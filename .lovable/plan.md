# Évolution du Reading Workshop : audit et plan d'intégration

## Audit (ce qui existe déjà et sera réutilisé)
- Site unique OpenDoorsClass, mêmes comptes et même connexion pour admin, coachs et apprenants. Rien de nouveau côté connexion.
- Rôles existants : Owner et admin (staff), plus coachs et apprenants enregistrés par l'admin dans l'atelier.
- Atelier en place : 20 semaines, 120 séances, textes par niveau A1 à C1, lecteur intelligent (voix, vitesse, clic sur un mot), envois audio et vidéo, retour du coach avec note sur 20, progression, badges, dictionnaire personnel, horaire du forum.
- Stockage privé déjà utilisé pour les photos et les envois. Notifications internes et notifications push déjà en place.
- Tests d'anglais et d'espagnol, paiements et abonnements : non touchés.

## Points de conflit à trancher
1. **Horaires** : le site affiche aujourd'hui « forum de 21h30 à 23h30 ». Le nouveau document dit « atelier ouvert de 12h30 à 22h30 ». Je propose : l'atelier suit 12h30 à 22h30 et le bandeau du forum est retiré ou adapté.
2. **10 questions par texte** : les textes déjà publiés ont 5 questions. Il faudra compléter environ 70 textes à 10 questions. Je le ferai à la main, comme pour les textes.
3. **Dictionnaire sans crédits IA** : aujourd'hui, un clic sur un mot hors vocabulaire appelle l'IA. Le nouveau dictionnaire reposera sur une base libre (WordNet et Wiktionary, licences vérifiées), le vocabulaire des leçons et un cache. Un mot absent affichera « non disponible » sans traduction inventée.

## Ordre de travail (une phase validée avant la suivante)

**Phase 1 : questions et notes sur 20**
- 10 questions par texte, 2 points chacune (QCM, vrai ou faux, réponse courte, question ouverte).
- Réponses enregistrées à chaque saisie, avec indicateur « Enregistrement… / Enregistré / Échec ».
- QCM et vrai ou faux corrigés automatiquement côté serveur ; questions ouvertes notées 0, 1 ou 2 par le coach avec commentaire.
- Notes séparées : compréhension (sur 20), lecture orale, prononciation, fluidité.

**Phase 2 : déblocage progressif**
- Statuts : verrouillé, disponible, en cours, envoyé, en correction, correction demandée, nouvel envoi, validé, terminé.
- Seule la validation d'un coach ou d'un admin ouvre le texte suivant. Une note ou un envoi seul n'ouvre rien.
- Correction demandée : commentaire écrit, note vocale, passages à retravailler.
- Historique complet de chaque décision (qui, quand, note, ancien et nouveau statut). Déblocage manuel avec justification pour l'admin.

**Phase 3 : horaires d'ouverture**
- Lundi au samedi, 12h30 à 22h30, heure de Libreville, calculée par le serveur (l'heure du téléphone ne compte pas).
- Fermé : message élégant, prochaine ouverture et compte à rebours. Le reste du site reste accessible ; seuls nouvelles lectures, exercices et envois sont bloqués. Un envoi commencé avant la fermeture peut se terminer.
- Admin : fermeture ou ouverture exceptionnelle, horaires temporaires, message personnalisé, avec historique.
- Coachs et admin jamais bloqués.

**Phase 4 : suppressions sécurisées**
- Suppression réversible (désactivation) avec confirmation et motif.
- Admin : tous les apprenants et coachs. Coach : seulement ses apprenants. Personne ne peut supprimer un admin ou un Owner, protégé dans la base elle-même.
- Suppression d'un coach : réaffectation de ses apprenants et contrôle des corrections en attente. Journal complet.

**Phase 5 : dictionnaire et lecteurs**
- Fiche mot : traduction, nature, phonétique, prononciation, sens dans la phrase, autres sens, forme de base, exemple et traduction, ajout au carnet.
- Lecteur audio maison : vitesses 0,75 à 2, avance et retour, volume, reprise de la position, lecture par phrase ou paragraphe, voix britannique et américaine (indiquées comme synthétiques).
- Lecteur vidéo maison pour les envois et corrections.

**Phase 6 : OpenDoorsClass Chat**
- Conversations privées, coach et apprenants, groupes, annonces officielles.
- Texte, réponses citées (glisser vers la droite sur mobile), notes vocales avec pause et préécoute, photos, vidéos, documents contrôlés.
- Réactions, modification, suppression, épinglage, recherche, « est en train d'écrire », envoyé, distribué, lu, non lus, temps réel.
- Confidentialité stricte, signalement, anti-spam, journal de modération. Pas d'appels.

**Phase 7 : progression et rapports**
- Tableau de progression apprenant, rapports hebdomadaires et individuels pour coach et admin, notifications.

**Phase 8 : tests**
- Scénarios du document (évaluations, déblocage, horaires, suppressions, messagerie, dictionnaire, non-régression des tests de niveau) joués dans le navigateur et par des tests automatiques.

## En parallèle
- Les textes de la semaine 3 (séances 4 à 6) et des semaines suivantes continueront, directement au format 10 questions.

## Détails techniques
- Nouvelles tables préfixées `rw_` uniquement (réponses, tentatives, historique de validation, horaires et exceptions, journal de suppression, conversations, membres, messages, pièces jointes, réactions, lectures, lexique). Aucune donnée supprimée, migrations additives.
- Correction et calcul des notes dans des fonctions serveur ; bonnes réponses jamais envoyées au navigateur avant soumission.
- Déblocage calculé dans la base à partir de la dernière validation officielle ; RLS sur chaque table, GRANT explicites.
- Horaires : fonction serveur en `Africa/Libreville`, exceptions en base, contrôle aussi à l'envoi.
- Protection des admins : triggers refusant la suppression ou la rétrogradation.
- Chat : temps réel via le canal de diffusion existant, bucket privé avec contrôle type et taille.
- Lexique : données libres importées dans une table, morphologie par règles, cache ; licences documentées.
- Coût : aucun abonnement externe ; seule la génération de textes par IA déjà existante reste payante si utilisée.
