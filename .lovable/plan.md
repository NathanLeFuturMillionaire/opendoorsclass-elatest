
# OpenDoorsClass — Architecture proposée (v3)

Stack : TanStack Start (React 19 + Vite) + Tailwind v4 + shadcn/ui + Lovable Cloud (Supabase) + Moneroo (paiement) + Lovable AI Gateway (génération des questions de compréhension orale). Mobile-first, palette bleu profond / vert / jaune (drapeau gabonais), typographie Manrope.

## Éléments spécifiques intégrés

1. **Photo du fondateur** (`user-uploads://IMG_1064.JPG`) uploadée via `lovable-assets` (CDN) et affichée dans la section "À propos du fondateur" sur l'accueil, cadre arrondi, ombre douce, légende "MAYUKWA Nathan Harysthote, Fondateur d'OpenDoorsClass".
2. **Audio de compréhension orale** (`AIRPORT_CHECK-IN.mp3`) uploadé via `lovable-assets`, rattaché à une question `listening` niveau B1 (Travel English).
3. **Génération IA des questions listening** via `createServerFn` + Lovable AI Gateway (`openai/gpt-5.5` multimodal audio) : l'IA écoute l'audio et propose 3 à 5 QCM réellement adaptés au contenu. L'admin valide/édite avant publication.
4. **Aucun tiret cadratin (—) ni demi-cadratin (–)** dans les textes affichés à l'utilisateur, prompts IA, PDF et e-mails. Remplacement par virgules, deux-points, parenthèses ou points.
5. **Consignes listening** :
   - **5 écoutes maximum** par question audio (compteur affiché, bouton "Écouter" désactivé après la 5e écoute).
   - Écran d'introduction avant la section listening : "Nous vous recommandons d'utiliser des écouteurs pour une meilleure qualité d'écoute. Ce n'est pas obligatoire." + bouton "Je suis prêt".
   - Audio chargé uniquement au moment où la question apparaît (pas de préchargement).

## 1. Parcours utilisateur

```
Accueil (/)
  └▶ Auth (/auth) — Google OAuth ou email
        └▶ Selon crédits
              ├ 0 crédit ▶ /paiement ▶ Moneroo ▶ webhook ▶ +10 crédits
              └ ≥ 1 crédit ▶ /test (1 crédit décompté) ▶ /resultat/:id
Admin (/admin) : questions, IA listening, témoignages, utilisateurs, offres, prix, paiements
```

## 2. Arborescence des routes

Public : `index.tsx`, `auth.tsx`, `temoignages.tsx`, `paiement-retour.tsx`
Protégé (`_authenticated/`) : `paiement.tsx`, `test.tsx`, `resultat.$id.tsx`, `profil.tsx`
Admin (`_authenticated/_admin/`) : `admin.index.tsx` (stats), `admin.questions.tsx`, `admin.listening-ia.tsx`, `admin.temoignages.tsx`, `admin.utilisateurs.tsx`, `admin.offres.tsx`, `admin.plan-test.tsx`, `admin.paiements.tsx`
API publique : `api/public/moneroo-webhook.ts`

## 3. Modèle de données Supabase

- **profiles** (id, first_name, last_name, avatar_url, credits_remaining, created_at) + trigger auto-création
- **user_roles** (id, user_id, role enum admin/user) + fonction `has_role` SECURITY DEFINER
- **questions** (id, level A1 à C2, category grammar/vocabulary/reading/listening, question_text, options jsonb, correct_answer, audio_url nullable, max_plays int default 5, order_hint, created_at). `correct_answer` jamais exposée au client, correction serveur.
- **test_sessions** (id, user_id, started_at, completed_at, score, level_result, answers jsonb, per_category_scores jsonb)
- **testimonials** (id, user_id, display_name, is_anonymous, rating 1 à 5, comment, is_approved, display_on_homepage, created_at)
- **pricing_offers** (id, level_range, title, price, features jsonb, cta_link, sort_order)
- **level_messages** (id, level_range, message_text)
- **test_access_plan** (id, price, credits_included, currency, is_active) actuellement 15 000 FCFA / 10 crédits
- **payments** (id, user_id, amount, currency, credits_added, moneroo_transaction_id unique, moneroo_reference, payment_method, status, raw_payload jsonb, created_at, confirmed_at)

RLS stricte + GRANTs explicites. Décrément des crédits via RPC transactionnelle `start_test_session` (SECURITY DEFINER).

## 4. Logique pédagogique

~15 à 20 QCM par niveau, 6 niveaux (A1 à C2), soit ~90 à 120 questions. Ordre déterministe par difficulté croissante. Timer global 30 min. Scoring cumulatif par palier (seuil 70 % par défaut). Consignes bilingues français/anglais pour A1. Anglais natif niveau C2 partout.

## 5. Paiement Moneroo

`/paiement` lit `test_access_plan` → server function `initMonerooPayment` crée `payments` (pending) et appelle l'API Moneroo Checkout (clé serveur) → redirection → webhook `POST /api/public/moneroo-webhook` : HMAC + `timingSafeEqual` + idempotence sur `moneroo_transaction_id` → crédit `profiles.credits_remaining += credits_included` via `supabaseAdmin` dans le handler → retour utilisateur sur `/paiement-retour`.

Secrets requis : `MONEROO_SECRET_KEY`, `MONEROO_WEBHOOK_SECRET` (demandés via `add_secret` au moment de l'implémentation).

## 6. Compréhension orale IA (côté admin + côté candidat)

**Admin** (`/admin/listening-ia`) :
1. Choix du niveau CECRL + upload audio (Supabase Storage bucket `listening-audio`).
2. Bouton "Générer les questions avec l'IA".
3. Server function `generateListeningQuestions` (Lovable AI Gateway, `openai/gpt-5.5`, entrée `input_audio` base64) renvoie 3 à 5 QCM structurés (schéma zod) adaptés au contenu réel. Prompt système strict : anglais natif C2, sans tirets, distracteurs plausibles, une seule bonne réponse.
4. Admin visualise, édite, publie dans `questions` (category=listening, audio_url, max_plays=5 par défaut).

**Candidat** :
- Écran d'intro avant la section listening : recommandation écouteurs (non obligatoire) + "Je suis prêt".
- Compteur "Écoutes restantes : 5/5" affiché à côté du lecteur.
- Bouton Écouter désactivé une fois les 5 écoutes atteintes.
- Audio chargé à la demande, jamais préchargé en amont.

L'audio uploadé (`AIRPORT_CHECK-IN.mp3`) sera intégré comme premier exemple listening B1 avec 4 questions générées automatiquement dès la mise en place.

## 7. Attestation PDF (itération 2)

`jspdf` + `qrcode`, QR vers `https://wa.me/24174825725`. Logo, nom, date, niveau visuel, points forts et axes, signature "MAYUKWA Nathan Harysthote, Fondateur d'OpenDoorsClass". Aucun tiret.

## 8. Témoignages, Admin, Performance

Témoignages soumis depuis `/resultat/:id` et `/temoignages`, modération admin, mise en avant homepage, note moyenne agrégée.
Admin gated par `has_role`, CRUD via server functions avec revalidation serveur, stats simples (sessions, niveaux, notes moyennes, CA).
Perf : WebP + lazy loading, code splitting, Manrope avec `font-display: swap`, audio à la demande, React Query cache session, animations Tailwind uniquement. Cible Lighthouse mobile > 90.

## 9. Règle typographique globale

Aucun tiret cadratin ni demi-cadratin. Consigne intégrée dans les composants, les prompts système IA, les seeds initiaux, et sauvegardée dans une mémoire projet pour toutes les évolutions futures.

## 10. Phasage livrable

**MVP (étape 1)**
1. Design system (tokens bleu/vert/jaune, Manrope, shadcn variants) + accueil avec photo fondateur via CDN.
2. Auth email + Google + `profiles` + trigger + `user_roles`.
3. Schéma DB + RLS + GRANTs + seed questions A1 à C2 (grammar/vocab/reading) en anglais C2 sans tirets.
4. Flux Moneroo (init + webhook idempotent) + page paiement + compteur crédits visible.
5. Test avec timer, écran d'intro listening (recommandation écouteurs), lecteur audio limité à 5 écoutes, RPC start, submit serveur, scoring, résultat, recommandations.
6. Profil (avatar, historique, crédits, bouton recharger).
7. Admin (questions, offres, plan test, utilisateurs, paiements, témoignages).
8. Page admin `Listening IA` + intégration de l'audio uploadé aujourd'hui.

**Itération 2** : PDF + QR WhatsApp, historique multi-tests visuel, test adaptatif optionnel, batch IA sur dossier d'audios.

## À confirmer avant de coder

1. **Génération initiale des ~90 questions** : je produis un premier jeu A1 à C2 (grammaire/vocab/reading) en anglais C2 sans tirets, à valider ensuite. OK ?
2. **Cumul des crédits** : confirmé "s'ajoutent à chaque paiement, pas de reset mensuel" (comme dans le prompt initial) ?
3. **Compte admin initial** : quel email veux-tu utiliser comme admin par défaut ?
4. **Secrets Moneroo** : compte Moneroo prêt ? Je te demanderai `MONEROO_SECRET_KEY` et `MONEROO_WEBHOOK_SECRET` au moment d'implémenter le paiement.
5. **Nombre de questions listening générées par audio** : 4 par défaut, ajustable dans l'admin. OK ?

Valide (ou dis-moi ce que tu veux ajuster) et je démarre l'étape 1 du MVP.
