# Plan — Ajout du Centre d'Administration OpenDoorsClass

Aucune fonctionnalité existante ne sera modifiée. Toutes les additions sont isolées sous `/admin` et dans de nouvelles tables/fonctions serveur.

## 1. Base de données (migration unique additive)

Nouvelles valeurs et tables, sans toucher aux existantes:

- **Enum `app_role`**: ajout des valeurs `owner` et `moderator` (garde `admin` et `user` déjà présents).
- **Trigger auto-owner**: fonction + trigger sur `auth.users` qui, pour l'e-mail `misterntkofficiel2.0@gmail.com` avec `email_confirmed_at`, insère automatiquement le rôle `owner` dans `user_roles`. Protection: RLS empêche la suppression/modification des lignes `owner` (sauf via service_role).
- **Table `admin_activity_log`**: `id`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata jsonb`, `ip_address`, `user_agent`, `created_at`. RLS: lecture pour admin/owner, insert via server functions uniquement.
- **Table `candidate_status`** (léger): `user_id PK`, `suspended boolean`, `suspended_at`, `suspended_by`. Permet suspendre/réactiver sans toucher `profiles`.
- **RPC `admin_dashboard_stats()`**: renvoie les compteurs agrégés (candidats, tests, certificats, avis, avis en attente, répartition niveaux, top pays).
- GRANTs + RLS via `has_role(auth.uid(), 'admin')` ou `'owner'`.

## 2. Server functions (`src/lib/admin.functions.ts`)

Toutes protégées par `requireSupabaseAuth` + vérification `has_role` (owner/admin/moderator selon action):

- `getAdminContext()` — retourne rôle courant + permissions.
- `getDashboardStats()`
- `listCandidates({ search, page, filter })`, `getCandidateDetail(id)`, `suspendCandidate`, `reactivateCandidate`, `deleteCandidate` (owner uniquement).
- `listQuestions`, `createQuestion`, `updateQuestion`, `deleteQuestion` (admin+).
- `listAllReviews({ status })`, `approveReview`, `rejectReview`, `updateReview`, `deleteReview` (moderator+).
- `listCertificates`, `regenerateCertificate`, `deleteCertificate` (admin+).
- `listUsersWithRoles`, `grantRole`, `revokeRole` (owner uniquement; owner immuable côté serveur).
- `listActivityLog({ page, filter })` (admin+).
- Chaque mutation appelle une util `logAdminAction()` qui insère dans `admin_activity_log`.

## 3. Routes UI (nouvelles, isolées)

Layout admin gated dans `src/routes/_authenticated/admin/`:

```
_authenticated/admin/route.tsx        (garde: vérifie rôle owner/admin/moderator, sinon redirect /)
_authenticated/admin/index.tsx        (Dashboard)
_authenticated/admin/candidats.tsx
_authenticated/admin/candidats.$id.tsx
_authenticated/admin/questions.tsx
_authenticated/admin/avis.tsx
_authenticated/admin/certificats.tsx
_authenticated/admin/utilisateurs.tsx (owner only)
_authenticated/admin/journal.tsx
```

Design: **réutilise** le design system existant (Tailwind tokens, shadcn/ui, Manrope, animations Framer Motion déjà en place). Sidebar admin avec navigation. Aucune modification des styles globaux.

## 4. Intégration minimale à l'existant

Seule addition côté existant:
- Un lien "Administration" affiché **conditionnellement** dans `site-header.tsx` uniquement si `has_role` renvoie owner/admin/moderator. Pas de modification pour les autres utilisateurs.
- Le formulaire d'avis existant reste inchangé (les avis passent déjà en `status=pending`); l'approbation se fait désormais via `/admin/avis`.

## 5. Sécurité

- Toutes les mutations admin passent par `requireSupabaseAuth` + `has_role` vérifié côté serveur.
- Owner immuable: fonction `revokeRole`/`deleteCandidate` refuse toute cible avec rôle `owner`.
- Rate/audit: `admin_activity_log` capture IP + user_agent via `getRequest()` du runtime TanStack.
- Validation Zod sur toutes les entrées.
- RLS sur `admin_activity_log` et `candidate_status` scopée à admin/owner.

## 6. Livraison

Étape 1: Migration DB (owner auto-grant, activity log, candidate_status, dashboard RPC, roles enum).
Étape 2: Server functions admin.
Étape 3: Routes UI admin + sidebar.
Étape 4: Lien conditionnel dans le header.
Étape 5: Vérification build.

## Points à confirmer avant lancement

1. **Certificats**: actuellement il n'y a pas de table `certificates` séparée, les attestations sont générées à la volée depuis `test_sessions` (page `/resultat/$id` + `window.print`). Je propose que "Gestion des certificats" liste les sessions terminées avec accès à l'attestation, sans stockage PDF côté serveur. OK?
2. **Speaking/Writing en Gestion des questions**: le moteur actuel ne supporte que Grammar/Reading/Listening/Vocabulary. Je permets d'ajouter des questions Speaking/Writing en base (préparation), mais elles ne seront pas servies au test tant que le moteur ne les prend pas en charge. OK?
3. **Import/Export questions**: format CSV suffit, ou JSON aussi?
4. **Journal d'activité**: je log les actions admin. Voulez-vous aussi logger les connexions candidats (peut devenir volumineux)?

Feu vert = je lance la migration puis le reste.
