# Déploiement sur Vercel

Ce projet est une application **TanStack Start** (SSR via Nitro). Il fonctionne sur Vercel sans modifier le code : on bascule simplement le preset Nitro sur `vercel` au build.

## 1. Importer le dépôt

1. Poussez ce dépôt sur GitHub / GitLab / Bitbucket.
2. Sur https://vercel.com/new, importez le repo.
3. Framework Preset : **Other** (le fichier `vercel.json` s'occupe du reste).
4. Ne modifiez ni le Build Command ni l'Output Directory (déjà définis dans `vercel.json`).

## 2. Variables d'environnement (Project Settings > Environment Variables)

Copiez la liste depuis `.env.example`. Valeurs à renseigner pour **Production**, **Preview** et **Development** :

| Nom | Type | Source |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Public | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | Public | Supabase project ref |
| `SUPABASE_URL` | Server | Idem `VITE_SUPABASE_URL` |
| `SUPABASE_PUBLISHABLE_KEY` | Server | Idem `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server (secret) | Supabase service role key |
| `SUPABASE_PROJECT_ID` | Server | Supabase project ref |
| `CHARIOW_API_KEY` | Server (secret) | Chariow dashboard |
| `CHARIOW_PRODUCT_ID` | Server | ID produit Chariow |
| `CHARIOW_WEBHOOK_SECRET` | Server (secret) | Chariow webhook |
| `MONEROO_SECRET_KEY` | Server (secret) | Optionnel |
| `MONEROO_WEBHOOK_SECRET` | Server (secret) | Optionnel |
| `LOVABLE_API_KEY` | Server (secret) | Lovable AI Gateway |

> `NITRO_PRESET=vercel` est déjà injecté par `vercel.json`, pas besoin de l'ajouter manuellement.

## 3. Webhooks

Après le premier déploiement, mettez à jour l'URL du webhook Chariow avec :

```
https://VOTRE-DOMAINE.vercel.app/api/public/chariow-webhook/<CHARIOW_WEBHOOK_SECRET>
```

## 4. Développement local

```bash
npm install
cp .env.example .env.local   # renseignez vos vraies valeurs
npm run dev
```

## 5. Notes techniques

- Le fichier `src/server.ts` reste l'entrée SSR : il est compatible aussi bien avec Cloudflare Workers (config Lovable par défaut) qu'avec Vercel (Nitro le compile en fonction Node/edge).
- Aucune modification applicative n'est nécessaire pour Vercel : seul l'ajout de `vercel.json` et des variables d'environnement suffit.
- Les routes publiques (`src/routes/api/public/*`) sont servies sans authentification, comme sur Lovable.
- Si Vercel signale une "Function size" trop grande, augmentez la mémoire dans **Project Settings > Functions** ou passez au preset `vercel-edge` en ajoutant `NITRO_PRESET=vercel-edge` en variable d'environnement (au lieu de la valeur dans `vercel.json`).