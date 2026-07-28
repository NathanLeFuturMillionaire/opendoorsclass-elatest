# Gamification V1 — OpenDoors XP

Ajout d'une couche gamification par dessus l'existant, sans toucher au test, paiements, auth, admin. Tout le calcul XP côté serveur.

## Architecture données (nouvelles tables)

```text
badges                  -- catalogue statique (seed)
  code (PK text)        -- ex: 'first_step', 'grammar_master'
  name_fr, name_en
  description_fr, description_en
  icon (text)           -- nom lucide
  category (text)       -- test | profile | skill | level | streak
  xp_reward (int)
  requirement_json      -- { type, params } pour affichage
  sort_order

user_gamification       -- 1 ligne par user
  user_id (PK, FK auth.users)
  total_xp, current_level
  current_streak, longest_streak
  last_activity_date
  leaderboard_opt_in (bool default false)
  display_country (text nullable)
  timestamps

user_badges
  (user_id, badge_code) UNIQUE
  unlocked_at

xp_transactions
  id, user_id, amount, reason (text), event_type (text)
  event_key (text UNIQUE avec user_id) -- idempotence
  created_at

streak_days
  (user_id, day date) PK   -- log activité quotidienne
```

RLS: user lit ses propres lignes; admins lisent tout; INSERT/UPDATE uniquement via RPC SECURITY DEFINER (jamais client direct). GRANTs standard.

## Logique serveur (RPCs SECURITY DEFINER)

- `award_xp(_user, _event_type, _event_key, _amount, _reason)` — insère xp_transactions (ON CONFLICT event_key DO NOTHING), recalcule total_xp + current_level, retourne `{ awarded, new_total, new_level, level_up }`.
- `check_and_award_badges(_user, _session_id nullable)` — évalue conditions et insère user_badges manquants + award_xp pour chaque badge.
- `record_streak(_user)` — met à jour streak_days du jour + current_streak/longest_streak.
- `compute_level(xp int)` — fonction pure retournant 1..9 selon paliers spec.
- `get_gamification_summary(_user)` — retourne XP, level, next_threshold, streak, badges (obtenus + verrouillés), transactions récentes.
- `get_leaderboard(_scope text, _limit int)` — top N users opt-in, colonnes: display_name (prénom + initiale), country, cefr_level, xp, level.

Hooks d'attribution intégrés aux flux existants:
- `submitTestAnswers` (test.functions.ts) → à la fin, appelle `award_xp` pour `test_completed` (event_key = session_id), `test_first` (event_key='test_first'), `skill_completed_<cat>` (event_key = `skill_<cat>_<session>` avec %≥90), `cefr_reached_<lvl>` (event_key = `cefr_<lvl>`), `score_improved` si delta ≥ 10 vs meilleur précédent, puis `check_and_award_badges`.
- `updateProfile` (profile.functions.ts) → si profil devient complet: `profile_completed` (event_key='profile_completed').
- Trigger `handle_new_user` étendu: insère user_gamification + award_xp `account_created`.

Idempotence garantie par UNIQUE(user_id, event_key).

## Server functions (nouveau `src/lib/gamification.functions.ts`)

- `getMyGamification()` — auth, appelle RPC summary.
- `getLeaderboard({ scope })` — public via server publishable client (policies TO anon SELECT sur vue matérialisée `leaderboard_public`) ou authenticated selon simplicité; V1 = authenticated only.
- `updateLeaderboardOptIn({ opt_in, country })`.
- `getXpActivity({ limit })`.

## UI (composants + intégrations)

Nouveaux composants sous `src/components/gamification/`:
- `XpBadge.tsx` — pill "1,240 XP".
- `LevelProgressCard.tsx` — barre animée + "X XP to Level N+1".
- `StreakStrip.tsx` — 7 pastilles MON..SUN.
- `BadgeGrid.tsx` — grille obtenus/verrouillés, popover condition.
- `BadgeUnlockModal.tsx` — modal célébration.
- `XpToast.tsx` — helper `toastXp(+50)` (basé sur sonner existant).
- `WeeklyChallengesCard.tsx` — 4 cartes statiques V1 (pas de validation auto).
- `XpActivityList.tsx`.

Intégrations:
- `src/routes/_authenticated/tableau-de-bord.tsx` → section "Your OpenDoorsClass Journey" au-dessus de l'existant.
- `src/routes/_authenticated/profil.tsx` → section "Achievements".
- `src/routes/_authenticated/resultat.$id.tsx` → après affichage résultat, déclenche fetch summary; si `level_up` ou nouveaux badges (comparaison retour submitTest), montre `BadgeUnlockModal` + toasts XP.
- Nouvelle route `/_authenticated/achievements` — vue complète badges + XP activity + leaderboard opt-in.
- Nouvelle route `/_authenticated/classement` — leaderboard (Global / Afrique / Gabon / France) avec état vide pro.
- `src/routes/_authenticated/admin/index.tsx` → widget "Top XP" (lecture user_gamification pour admins via policy has_role).

Traductions FR/EN ajoutées à `src/lib/i18n.tsx`.

## Sécurité anti-abus

- Toutes mutations XP via RPC SECURITY DEFINER; aucune INSERT policy client sur xp_transactions / user_badges / user_gamification.
- event_key unique par user empêche double attribution (`test_first`, `profile_completed`, `cefr_<lvl>`, `skill_<cat>_<session>`, `badge_<code>`).
- Score improvement: comparé serveur au max historique avant la session courante.
- Leaderboard opt-in OFF par défaut; nom = prénom + première lettre du nom.

## Design

- Réutilise design tokens brand (bleu profond, vert, jaune highlights doré pour badges).
- Barre progression: gradient `--brand-gradient`, animation width via CSS transition (600ms).
- Modal badge: scale-in + fade, icône Trophy Lucide en cercle doré, pas de confetti.
- Icônes Lucide (Trophy, Flame, Star, Sparkles, Lock, Zap).
- Respect `prefers-reduced-motion`.

## Phases d'exécution

1. Migration DB (tables + RLS + GRANTs + fonctions RPC + seed badges + extension handle_new_user + backfill user_gamification pour users existants).
2. `src/lib/gamification.functions.ts` + hook dans `test.functions.ts` et `profile.functions.ts`.
3. Composants gamification + intégrations dashboard/profil/résultat.
4. Routes `/achievements` et `/classement`.
5. Widget admin.
6. Traductions.
7. Vérif build + parcours critiques (aucun changement de signature sur les fonctions existantes).

## Hors périmètre V1

- Validation automatique des Weekly Challenges (UI + architecture prêtes, pas de complétion).
- Récompenses en crédits payants.
- Notifications push (utilise toasts existants).
- Streak automatique multi-actions: V1 = record_streak appelé au login (via __root onAuthStateChange SIGNED_IN → server fn) et à chaque test terminé.
