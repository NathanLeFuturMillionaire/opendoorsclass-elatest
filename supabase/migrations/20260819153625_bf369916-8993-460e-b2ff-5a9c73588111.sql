CREATE TABLE IF NOT EXISTS public.payments_archive (LIKE public.payments INCLUDING DEFAULTS);
ALTER TABLE public.payments_archive ADD COLUMN IF NOT EXISTS archived_at timestamptz NOT NULL DEFAULT now();
GRANT ALL ON public.payments_archive TO service_role;
ALTER TABLE public.payments_archive ENABLE ROW LEVEL SECURITY;