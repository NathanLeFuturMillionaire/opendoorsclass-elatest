
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'chariow',
  ADD COLUMN IF NOT EXISTS chariow_sale_id text;

CREATE INDEX IF NOT EXISTS payments_chariow_sale_id_idx ON public.payments (chariow_sale_id);

UPDATE public.test_access_plan
   SET price = 15000, currency = 'XAF'
 WHERE is_active = true;
