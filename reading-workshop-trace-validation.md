# Validation Grammar Discovery, exercice de tracé

## Fonctionnalité livrée

- Chaque notion Grammar Discovery propose cinq phrases stables, déterminées par la règle, le niveau et le thème de la leçon.
- L exemple grammatical existant complète les phrases lorsqu il est exploitable. Aucun appel IA ni tirage aléatoire.
- 94 modèles vectoriels Hershey Futural couvrent majuscules, minuscules, chiffres et ponctuation anglaise.
- Pointer Events prend en charge doigt, souris et stylet. La zone utilise touch-action none pour éviter le défilement pendant le geste.
- Les espaces sont ignorés automatiquement. Tous les autres caractères sont obligatoires et ordonnés par la base.
- La validation compare la précision du tracé, la couverture du modèle et chaque trait vectoriel. Les seuils sont 72 % de précision, 58 % de couverture et 35 % sur chaque trait.
- Une sortie du cadre invalide immédiatement la tentative. Une ligne arbitraire, un contact unique ou une lettre partielle ne permet pas d avancer.
- Les lettres en plusieurs traits restent incomplètes tant que les traits nécessaires ne sont pas présents.

## Données et permissions

- `rw_trace_exercises` conserve les cinq phrases, le statut, la position, le score, les tentatives, les invalidités, le temps actif et les dates.
- `rw_trace_characters` conserve chaque caractère, ses mesures, son score, son temps et son dernier tracé.
- Seul l apprenant propriétaire peut commencer et faire progresser son exercice, sur un texte publié, de son niveau, débloqué et pendant les horaires.
- `rw_trace_record_attempt` impose le caractère courant et empêche tout saut. Aucun grant direct ne permet à l apprenant de modifier le score ou la completion.
- Le propriétaire, le coach actif assigné et les administrateurs ont seuls accès aux résultats correspondants.
- Le suivi individuel affiche les statuts non commencé, en cours et terminé, les cinq phrases, les caractères, les difficultés, les temps et les tracés.
- Les règles existantes de déblocage des lectures ne changent pas.

## Vérifications réelles

- Scénario souris sur une leçon C1 disponible : mauvaise forme refusée, sortie du cadre refusée, puis cinq phrases et 175 caractères validés.
- Résultat du scénario : 98 % arrondis, 183 tentatives, huit invalidités et 1 min 40 s de temps actif.
- Rechargement : résultat terminé conservé, sans duplication.
- Administration : score, tentatives, dates, cinq phrases, caractères, métriques et tracé visibles sur la bonne fiche apprenant.
- Vue téléphone 390 x 844 : événements tactiles réels via Chromium, premier caractère validé et passage automatique au suivant.
- Aucun appel au service IA observé sur ordinateur ou téléphone. Aucune erreur JavaScript observée.
- 115 tests automatisés réussis, compilation et contrôle des espaces réussis.
- Les exercices créés pour les tests ont été supprimés après validation.

## Dépendance et licence

Aucune nouvelle dépendance d exécution. Les données vectorielles publiques Hershey sont intégrées localement avec leur notice dans `public/licenses/hersheytext.txt`. Le paquet source hersheytext 2.0.0 est MIT et ses données JSON sont dans le domaine public.

## Limite restante

Les gestes ont été vérifiés avec Chromium et de vrais événements tactiles simulés. La sensation du stylet, les interruptions et les différences de Safari/iPhone et Android doivent encore être appréciées sur des appareils physiques.
