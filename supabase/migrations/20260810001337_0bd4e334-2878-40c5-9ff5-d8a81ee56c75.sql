CREATE TABLE public.pricing_promotion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT true,
  promo_price integer NOT NULL,
  promo_product_id text NOT NULL,
  normal_price integer NOT NULL,
  normal_product_id text NOT NULL,
  currency text NOT NULL DEFAULT 'XAF',
  credits_included integer NOT NULL DEFAULT 1,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pricing_promotion TO anon;
GRANT SELECT ON public.pricing_promotion TO authenticated;
GRANT ALL ON public.pricing_promotion TO service_role;

ALTER TABLE public.pricing_promotion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pricing" ON public.pricing_promotion FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.pricing_promotion (promo_price, promo_product_id, normal_price, normal_product_id, credits_included, starts_at, ends_at)
VALUES (3500, 'prd_inqj69el', 12000, 'prd_00p1bi7x', 1, now(), now() + interval '1 month');