## Cadre technique (important)

Le projet est déjà bâti sur **TanStack Start + React 19 + TypeScript + Tailwind v4 + shadcn/ui + Radix + Lucide + Lovable Cloud (Supabase)**. Je vais donc **garder cette stack** (pas de migration vers Next.js 15, ce serait une réécriture complète du projet et casserait paiements, auth, routes, webhooks Chariow/Moneroo déjà en place). J'ajoute **Framer Motion, React Hook Form, Zod, Recharts** pour couvrir les besoins d'animation, formulaires validés et graphiques. Identité graphique, couleurs, animations existantes: **100% conservées**.

## Étendue livrée (regroupée pour rester cohérent)

### 1. Base de données (migration unique)
- `profiles`: ajout `avatar_url` (existe), `nationality`, `date_of_birth`, `candidate_number` (auto, format `ODC-YYYY-XXXXX`), `objectives text[]`, `registered_at` (=created_at).
- `test_sessions`: ajout `duration_seconds`, `version` (déjà `test_version`), `skill_scores jsonb` (grammar/listening/reading/vocabulary %).
- Nouvelle table `reviews` (avis candidats): rating, title, comment, country, photo_url, level_achieved, status (pending/approved), user_id → RLS: user insère/lit les siens, tout le monde lit les `approved`, admin gère.
- Bucket storage `avatars` (public) + `review-photos` (public).
- RPC `get_profile_stats(user_id)` retourne agrégats (tests, meilleur score, moyenne, dernier niveau, temps moyen).
- GRANTs + RLS conformes.

### 2. Page `/profil` refondue (une seule route, sections empilées, animées Framer Motion)
Sections:
1. **En-tête premium**: avatar (upload storage), nom/prénom, N° candidat, nationalité, âge calculé, date de naissance, e-mail, date d'inscription, badge OpenDoorsClass, badge statut dynamique (Nouveau / Test effectué / Niveau validé / Membre / Excellent).
2. **Tableau de bord**: 7 cartes stats (tests, dernier score, niveau actuel, meilleur score, temps moyen, certificats, progression %).
3. **Points forts**: jauges animées par compétence (Grammar, Listening, Reading, Vocabulary) avec % + étoiles + commentaire court. Speaking/Writing/Pronunciation/Fluency: marqués "bientôt disponible" (le test actuel ne les évalue pas, honnête envers l'utilisateur).
4. **Progression**: Recharts (courbe scores, radar compétences, histogramme mensuel).
5. **Mon niveau**: niveau actuel + description CECRL + acquis/à améliorer + temps estimé prochain niveau.
6. **Recommandations IA**: bouton "Générer mes recommandations" → server fn qui appelle Lovable AI Gateway (`google/gemini-2.5-flash`) avec le profil et retourne plan de travail personnalisé (mis en cache dans `profiles.ai_recommendations`).
7. **Historique**: timeline élégante avec date, durée, score, niveau, version, actions (voir résultat / imprimer attestation).
8. **Certificats**: grille des tests terminés, mini aperçu de l'attestation, QR code (lib `qrcode`) vers page publique de vérification, bouton Télécharger PDF (via `window.print` sur la page attestation existante).
9. **Objectifs**: multi-select (Business, Voyage, Études, Travail, Immigration, Conversation, TOEFL, IELTS, Cambridge, Autre) sauvegardés.
10. **Communauté** (si niveau ≥ A2): carte "Félicitations" + bouton WhatsApp communauté avec message pré-rempli.
11. **Mon avis**: formulaire (React Hook Form + Zod) rating étoiles, titre, commentaire, pays, photo → statut `pending`.
12. **À propos du fondateur**: bloc avec photo Nathan + texte demandé + bouton WhatsApp `wa.me/24174825725`.

### 3. Page d'accueil `/`
Nouvelle section **"⭐ Ils ont passé le test OpenDoorsClass"**: carousel horizontal auto (Framer Motion), cartes photo/nom/pays/drapeau/niveau/étoiles/commentaire/date, filtres (pays, niveau, date). Alimenté par `reviews` où `status = approved` via server fn publique (client publishable server-side, policy `TO anon` SELECT sur approved).

### 4. E-mail post-test
Scaffold Lovable Emails (auth + transactional). Template `test-completed` déclenché à la fin du test (dans `submitTest`), contient prénom/nom/score/niveau/date/résumé + liens espace + télécharger attestation + conseils IA. Si niveau < A2: CTA "Être accompagné par Mr Nathan" → `wa.me/24174825725`. Si ≥ A2: CTA rejoindre communauté.

### 5. Sécurité
Déjà en place (RLS, JWT Supabase, HTTPS, server fns authentifiés). Je vérifie/renforce: RLS sur nouvelles tables, upload avatars limité à l'utilisateur, validation Zod côté serveur pour tous les inputs (profil, avis, objectifs).

## Découpage en étapes de livraison
1. **Migration DB** (nationality, dob, candidate_number, objectives, ai_recos, reviews, buckets, RPC stats).
2. **Server functions**: profil enrichi, upload avatar, stats agrégées, reviews (créer/lister approved), AI recommandations, objectifs.
3. **Refonte `/profil`** avec toutes les sections.
4. **Section testimonials sur `/`** + carousel.
5. **E-mail post-test** (scaffold transactional + template + trigger).
6. Vérification build + navigation.

## Points à confirmer avant que je lance
- **OK pour rester sur TanStack Start (pas Next.js 15)?** Migrer vers Next casserait tout l'existant (paiements Chariow/Moneroo, auth, routes, webhooks). La stack actuelle est équivalente en modernité.
- **Speaking / Writing / Pronunciation / Fluency**: le test actuel n'évalue que Grammar/Reading/Listening/Vocabulary via QCM. J'affiche donc ces 4 compétences réelles avec jauges, et marque les 4 autres "bientôt" (option honnête). OK, ou je les cache totalement?
- **E-mails**: OK pour activer Lovable Emails (nécessite domaine e-mail configuré, sinon les mails ne partent pas). Si pas de domaine prêt, je scaffold quand même et vous branchez le domaine après.

Dès votre feu vert je livre tout (probablement 2 tours: migration + code).