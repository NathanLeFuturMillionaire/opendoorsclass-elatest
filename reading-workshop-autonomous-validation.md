# Reading Workshop autonome : compte rendu de validation

## Résultat

Le clic sur un mot ne consomme plus aucun crédit IA. Le parcours ne contient ni appel à un modèle, ni clé IA, ni repli automatique vers une traduction payante.

La rédaction facultative de brouillons par l'administration reste disponible, conformément au choix confirmé. Elle constitue le seul appel IA restant dans le Reading Workshop et ne participe pas au dictionnaire.

## Appels supprimés

- Suppression de `translateRwWord`, la fonction serveur appelée par le lecteur.
- Suppression de `glossRwWord` et de sa requête au modèle `openai/gpt-6-astra`.
- Suppression de la gestion des erreurs de crédits IA dans le parcours du dictionnaire.
- Suppression de l'import côté lecteur qui déclenchait cette fonction serveur.

Le fichier `src/lib/rw-lessons.server.ts` conserve uniquement la rédaction facultative de brouillons pour l'administration.

## Base lexicale intégrée

- 85 010 entrées anglaises avec traductions françaises.
- 123 188 formes fléchies ou alias.
- 542 fichiers JSON locaux, découpés par les deux premières lettres pour limiter le téléchargement sur mobile.
- Environ 24,3 Mo de données statiques au total, téléchargés uniquement par petites parties à la demande.
- Prononciations IPA calculées à partir de CMUdict.
- Supplément éditorial OpenDoorsClass pour les mots outils, les termes culturels et le vocabulaire déjà relu des textes publiés.

Sources :

- WOLF, via Open Multilingual Wordnet 1.4, sous CeCILL-C.
- Princeton WordNet 3.0, usage commercial permis avec conservation de sa notice.
- CMU Pronouncing Dictionary, usage commercial permis avec attribution.
- `compromise`, sous licence MIT, pour l'analyse grammaticale et la lemmatisation par règles.

Les notices sont accessibles depuis la fiche du mot et à l'adresse `/licenses/rw-lexicon.txt`.

## Fonctionnement sans IA

1. Le lecteur identifie le mot sélectionné et sa phrase.
2. Il recherche la plus longue expression disponible contenant ce mot, y compris les phrasal verbs.
3. Il utilise les formes fléchies enregistrées, puis la lemmatisation locale pour les verbes, noms et adjectifs.
4. Il filtre les sens selon la catégorie grammaticale.
5. Il classe les sens à l'aide de règles lexicales, de la phrase, des définitions anglaises et des exemples.
6. Si plusieurs sens restent aussi plausibles, il les affiche ensemble au lieu d'inventer une réponse certaine.
7. Les noms propres sont conservés sans traduction.
8. Un mot absent produit un message explicite. Aucun repli IA n'existe.

Les résultats sont conservés dans un cache mémoire et dans un cache persistant limité aux 60 consultations récentes. Les fichiers lexicaux utilisent aussi le cache HTTP du navigateur.

## Couverture mesurée

Sur les 75 textes publiés :

- 2 865 formes de mots distinctes.
- 2 829 formes couvertes directement par la base ou les formes fléchies.
- Couverture brute : 98,7 %.
- 36 formes restantes, principalement des noms propres pris en charge par une règle séparée. Quelques noms ou graphies particuliers peuvent donc rester indisponibles et sont signalés honnêtement.

Aucun fichier lexical ne contient de tiret cadratin, demi-cadratin ou trait d'union insécable.

## Audit des autres fonctions

Les fonctions suivantes étaient déjà indépendantes des crédits IA et n'ont pas été modifiées :

- lecture et navigation dans les textes ;
- synthèse vocale par les voix du navigateur ou de l'appareil ;
- lecteurs audio et vidéo ;
- correction des QCM, vrai ou faux et réponses objectives par règles enregistrées ;
- correction humaine des questions ouvertes et productions ;
- calcul des scores et progression ;
- bilans, exports et notifications ;
- enregistrement des activités et envois ;
- chat humain.

La synthèse vocale dépend des voix installées ou fournies par le navigateur. Elle ne consomme pas de crédits IA Lovable, mais le fonctionnement hors ligne d'une voix particulière dépend de l'appareil.

## Vérifications effectuées

- 96 tests automatisés réussis dans 14 fichiers.
- Formes vérifiées : `helps`, `succeeds`, `children`, `gave up`, `light`, noms propres et mot inconnu.
- Vérification qu'aucune requête réseau ou IA n'est déclenchée par la logique de traduction testée.
- Vérification du cache mémoire et du cache persistant après rechargement.
- Scénario réel avec un compte apprenant C1 actif sur `The Discipline of Ordinary Days`.
- Traduction réelle de `succeeds`, puis rechargement et nouvelle consultation sans aucun téléchargement lexical.
- Traduction réelle de `insight` à 390 pixels de largeur.
- Zéro appel à la passerelle IA pendant tout le scénario navigateur.
- Zéro erreur JavaScript ou console.
- Notice de licence accessible avec un statut HTTP 200.
- Compilation du projet confirmée sans erreur par le journal de prévisualisation.

## Limites restantes

La sélection contextuelle repose sur des règles déterministes. Elle ne prétend pas égaler une traduction humaine dans tous les cas. Les sens incertains sont donc présentés ensemble. Les données WordNet et WOLF peuvent comporter du bruit lexical ; les traductions trop longues sont écartées lorsque des alternatives concises existent.

Aucune dépendance externe n'est nécessaire au runtime pour le dictionnaire. Une indisponibilité du réseau peut empêcher le premier chargement d'une partie non mise en cache, mais ne déclenche jamais de consommation de crédits IA.
