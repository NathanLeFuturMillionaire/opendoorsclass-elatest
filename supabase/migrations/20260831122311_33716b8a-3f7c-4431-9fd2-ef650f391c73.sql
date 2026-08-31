-- 1. Owner role for the co-founder (existing account, no duplicate)
INSERT INTO public.user_roles (user_id, role)
VALUES ('8b132b74-1eb5-40c3-a9ed-48023cce3722', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Keep the automatic grant in sync for both founders
CREATE OR REPLACE FUNCTION public.grant_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) IN ('misterntkofficiel2.0@gmail.com', 'huldaibala2022@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Traceable manual financial adjustments
CREATE TABLE public.financial_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'XAF',
  balance_before integer,
  balance_after integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.financial_adjustments TO authenticated;
GRANT ALL ON public.financial_adjustments TO service_role;

ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read financial adjustments"
ON public.financial_adjustments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_financial_adjustments_updated_at
BEFORE UPDATE ON public.financial_adjustments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_financial_adjustments_created_at ON public.financial_adjustments (created_at DESC);