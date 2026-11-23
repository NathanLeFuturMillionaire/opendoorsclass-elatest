# Reading Workshop, validation de la phase 8

Date du contrôle : 23 novembre 2026.

## Résultat global

Les scénarios techniques critiques ont été rejoués avec des comptes coach, apprenant et administrateur réellement authentifiés. Les données et fichiers de test ont été supprimés après les contrôles. Les horaires officiels sont restés inchangés : lundi au samedi, 12h30 à 22h30, heure de Libreville.

Validation finale : 56 tests automatiques réussis, vérification TypeScript réussie, compilation réussie.

## Évaluations et progression

- Texte de test comportant exactement 10 questions à 2 points.
- Sauvegarde des 10 réponses, conservation après rechargement et verrouillage des réponses objectives déjà enregistrées.
- Note automatique de 16/20 avant correction de la question ouverte.
- Attribution de 2 points à la question ouverte par le coach, note finale de 18/20.
- Envoi audio réel, demande de reprise avec commentaire et notification reçue.
- Nouvel envoi vidéo, validation par le coach, notification et ouverture du texte suivant.
- Historique conservé : première reprise demandée à 12/20, seconde validation à 18/20.
- Isolation vérifiée : un apprenant ou un coach ne lit pas les données d'un apprenant hors de son périmètre.
- L'ouverture directe d'un texte verrouillé affiche désormais un état clair au lieu d'une page vide. Les questions restent inaccessibles.

## Horaires

Contrôles effectués avec le fuseau Africa/Libreville :

- Lundi 12h29 : fermé.
- Lundi 12h30 : ouvert.
- Lundi 22h29 : ouvert.
- Lundi 22h30 : fermé.
- Samedi 22h30 : fermé.
- Dimanche sans exception : fermé.
- Dimanche avec exception d'ouverture : ouvert.
- Navigateur réglé artificiellement à 12h30 pendant une fermeture réelle : réponse serveur toujours fermée. L'heure du téléphone ne contourne pas la règle.

## Retraits et permissions

- Motif obligatoire à partir de 5 caractères.
- Un coach peut retirer son propre apprenant.
- Un coach ne peut pas retirer un apprenant non affecté ni un autre coach.
- Un retrait de coach avec apprenants exige une réaffectation à un coach actif.
- Les travaux et corrections en attente suivent la réaffectation.
- La réactivation par un coach était acceptée à tort. Elle est maintenant refusée par la base et réservée à l'administration.
- La réactivation par l'administration restaure l'accès et l'historique.

## Chat et modération

Scénarios vérifiés entre deux utilisateurs :

- Conversation privée, compteur de non lus et accusé de lecture.
- Indicateur de frappe après connexion temps réel stabilisée.
- Réponse citée, réaction, modification, épinglage, recherche et suppression avec marqueur.
- PDF privé téléchargé avec succès par le destinataire.
- Note vocale enregistrée avec micro simulé, pause, reprise, aperçu et envoi.
- Signalement reçu et traité par l'administration.
- Balayage tactile sur mobile pour répondre à un message.
- Blocage réversible : les nouveaux messages sont refusés dans les deux sens, puis acceptés après déblocage.
- Le composeur de l'autre utilisateur se rouvre correctement après déblocage, même si sa liste de conversations est encore ancienne.
- Fichiers Excel et PowerPoint acceptés. Un fichier XLSX réel a été remis au destinataire.
- L'administration lit uniquement le message signalé dans une conversation privée, pas les autres messages de cette conversation.
- L'administration peut supprimer les fichiers du chat pour la modération.

## Non-régression du site

Pages rendues sans erreur JavaScript : accueil, connexion et inscription, Reading Workshop, connexion Reading Workshop, test d'anglais, test d'espagnol, programme de formation, classements, certifiés et profil public.

Le tableau de bord, le profil candidat et un certificat d'espagnol existant ont aussi été ouverts avec une session administrateur. Aucun paiement ni nouveau test payant n'a été déclenché.

## Corrections et tests ajoutés

- Accès aux textes indisponibles : `rwLessonAccess` et 3 tests.
- Permissions de retrait : `rwCanChangeActive` et 6 tests.
- Composeur après déblocage : `rwCanPostToConversation` et test du cas obsolète.
- Types Excel et PowerPoint ajoutés aux contrôles de pièces jointes.
- Migrations appliquées : 0018 pour les réactivations et messages signalés, 0019 pour le blocage du chat, 0020 pour la suppression admin des fichiers de chat.

## Limites et travail restant

- Les microphones, caméras, interruptions et accents sur vrais iPhone, Safari et Android restent à vérifier physiquement. Le bac à sable valide la capture et la livraison techniques, pas l'écoute humaine.
- La voix synthétique du navigateur de test n'est pas audible dans le bac à sable. Les commandes et la reprise sont vérifiées, pas la qualité vocale réelle.
- 75 textes sont publiés sur 15 séances. 23 ont 4 questions et 52 en ont 5. Le passage manuel à 10 questions reste à faire.
- Les semaines 4 à 20 et les dernières séances de la semaine 3 restent à rédiger manuellement.
- Le glossaire contextuel utilise actuellement la passerelle IA Lovable. Ce n'est pas un dictionnaire hors ligne.
- Les pages de connexion et d'inscription ont été vérifiées, mais aucun nouveau compte n'a été créé par le formulaire public pendant ce contrôle.
