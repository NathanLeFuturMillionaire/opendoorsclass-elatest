
-- 1) Enum du plan
DO $$ BEGIN
  CREATE TYPE public.subscription_plan AS ENUM ('standard','premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Colonnes profil (plan + date d'activation)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan public.subscription_plan,
  ADD COLUMN IF NOT EXISTS plan_activated_at TIMESTAMPTZ;

-- 3) Colonne paiements
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS offer_code TEXT;

-- 4) Ajout code/label/produit Chariow sur test_access_plan
ALTER TABLE public.test_access_plan
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS chariow_product_id TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS test_access_plan_code_key
  ON public.test_access_plan (code) WHERE code IS NOT NULL;

-- 5) Remplacement du plan unique par deux offres
DELETE FROM public.test_access_plan;

INSERT INTO public.test_access_plan
  (code, label, price, credits_included, currency, is_active, sort_order, chariow_product_id)
VALUES
  ('standard', 'Standard', 5000,  5,  'XAF', TRUE, 1, 'prd_inqj69el'),
  ('premium',  'Premium',  10000, 12, 'XAF', TRUE, 2, 'prd_00p1bi7x');

-- 6) Migration rétroactive : paiements success passés = premium
UPDATE public.payments
   SET offer_code = 'premium'
 WHERE offer_code IS NULL AND status = 'success';

UPDATE public.profiles p
   SET plan = 'premium',
       plan_activated_at = COALESCE(plan_activated_at, sub.confirmed_at)
  FROM (
    SELECT user_id, MIN(confirmed_at) AS confirmed_at
      FROM public.payments
     WHERE status = 'success'
     GROUP BY user_id
  ) sub
 WHERE p.id = sub.user_id AND p.plan IS NULL;
