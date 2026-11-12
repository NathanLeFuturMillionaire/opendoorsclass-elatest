# Reading Workshop : plan de lancement par phases

Votre document décrit une très grande plateforme (7 phases, 120 séances x 5 niveaux = 600 textes). Comme vous le demandez, je la construis phase par phase, à l'intérieur du site actuel, sans toucher au test de niveau.

## Décisions proposées
- **Couleurs :** le Reading Workshop utilise le vert comme couleur dominante (comme demandé), uniquement dans ses pages. Le reste du site garde le bleu actuel.
- **Connexion :** mêmes comptes que le site actuel (un seul système). Nouveaux rôles : apprenant workshop et coach. Les Owners et admins actuels gèrent tout.
- **Textes :** les 600 versions sont préparées par l'IA semaine par semaine, avec fiche source, puis validées par un admin avant publication. Jamais de citation ou de source inventée.
- **Tirets longs :** aucun dans les pages, textes et e-mails (règle actuelle conservée).

## Phase 1 (ce tour) : fondations
- Lien "Reading Workshop" dans le menu principal.
- Page publique /reading-workshop : titre, présentation, 5 niveaux (A1 à C1), objectifs, aperçu des 20 semaines, bouton de connexion.
- Page /reading-workshop/login (réutilise la connexion existante, puis redirige selon le rôle).
- Espaces protégés vides mais fonctionnels : admin, coach, apprenant, bibliothèque.
- Base de données : apprenants (photo, niveau, coach), coachs, semaines, séances, versions par niveau, fiches sources. Accès strictement limité : un apprenant ne voit que ses données.

## Phase 2 : espaces admin et coach
Créer apprenants et coachs, photos, niveau, liens d'accès, affectation coach, tableaux de bord.

## Phase 3 : bibliothèque
20 semaines, 120 séances, 5 niveaux, vocabulaire, questions, grammaire, traductions. Génération IA + validation admin.

## Phase 4 : lecture intelligente
Lecture audio avec vitesse et voix, clic sur chaque mot (traduction, nature, prononciation), traduction complète, carnet de vocabulaire.

## Phase 5 : envois et corrections
Envoi vidéo et audio avec vraie barre de progression et reprise, correction coach, demande de reprise, validation, notifications.

## Phase 6 : suivi
Cercle de progression, statistiques, historique, rapports, badges, recommandations.

## Phase 7 : vérifications
Les 30 scénarios de votre document, sécurité, téléphone et tablette.

## Détails techniques
- Routes TanStack sous `src/routes/reading-workshop*` ; espaces privés sous la garde d'authentification existante.
- Rôles ajoutés à l'enum `app_role` de `user_roles` (coach, learner) via `has_role`, jamais dans `profiles`.
- Tables préfixées `rw_` avec RLS et GRANT ; migrations non destructives.
- Thème vert via variables CSS scopées à un conteneur `.rw-theme`.
- Stockage privé pour photos et envois (Phase 2 et 5).
