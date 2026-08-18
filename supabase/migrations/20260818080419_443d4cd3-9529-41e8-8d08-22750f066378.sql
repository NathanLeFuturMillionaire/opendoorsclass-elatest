DO $$ BEGIN
  CREATE TYPE public.assessment_status AS ENUM ('not_started','in_progress','paused','completed','abandoned','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.test_sessions
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS status public.assessment_status NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS current_section text,
  ADD COLUMN IF NOT EXISTS current_question integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS credits_consumed integer NOT NULL DEFAULT 1;

DO $$ BEGIN
  ALTER TABLE public.test_sessions ADD CONSTRAINT test_sessions_language_check CHECK (language IN ('en','es'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.test_sessions SET status = 'completed' WHERE completed_at IS NOT NULL AND status <> 'completed';

-- Une seule session active par candidat et par langue: les anciennes inachevees sont abandonnees.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id, language ORDER BY started_at DESC) AS rn
  FROM public.test_sessions
  WHERE status = 'in_progress'
)
UPDATE public.test_sessions ts
SET status = 'abandoned'
FROM ranked r
WHERE ts.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS test_sessions_one_active_per_language
  ON public.test_sessions (user_id, language)
  WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS test_sessions_user_language_idx ON public.test_sessions (user_id, language);

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

DO $$ BEGIN
  ALTER TABLE public.questions ADD CONSTRAINT questions_language_check CHECK (language IN ('en','es'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS questions_language_active_idx ON public.questions (language, is_active);

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  language text,
  session_id uuid REFERENCES public.test_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own credit transactions"
    ON public.credit_transactions FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Staff read all credit transactions"
    ON public.credit_transactions FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS credit_transactions_user_idx ON public.credit_transactions (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.start_assessment_session(_language text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_credits integer;
  v_session_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF _language IS NULL OR _language NOT IN ('en','es') THEN
    RAISE EXCEPTION 'UNSUPPORTED_LANGUAGE';
  END IF;

  SELECT credits_remaining INTO v_credits
  FROM public.profiles WHERE id = v_user FOR UPDATE;

  SELECT id INTO v_session_id
  FROM public.test_sessions
  WHERE user_id = v_user AND language = _language AND status = 'in_progress'
  ORDER BY started_at DESC LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    RETURN jsonb_build_object('session_id', v_session_id, 'resumed', true, 'credits_remaining', v_credits);
  END IF;

  IF v_credits IS NULL OR v_credits < 1 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  UPDATE public.profiles
  SET credits_remaining = credits_remaining - 1
  WHERE id = v_user
  RETURNING credits_remaining INTO v_credits;

  INSERT INTO public.test_sessions (user_id, started_at, language, status, credits_consumed)
  VALUES (v_user, now(), _language, 'in_progress', 1)
  RETURNING id INTO v_session_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason, language, session_id)
  VALUES (v_user, -1, 'assessment_session_start', _language, v_session_id);

  RETURN jsonb_build_object('session_id', v_session_id, 'resumed', false, 'credits_remaining', v_credits);
END;
$function$;

CREATE OR REPLACE FUNCTION public.abandon_assessment_session(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  UPDATE public.test_sessions
  SET status = 'abandoned'
  WHERE id = _session_id AND user_id = v_user AND status = 'in_progress';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN jsonb_build_object('abandoned', v_updated > 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_test_session()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_credits INTEGER;
  v_session_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT credits_remaining INTO v_credits
  FROM public.profiles
  WHERE id = v_user
  FOR UPDATE;

  IF v_credits IS NULL OR v_credits < 1 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  UPDATE public.profiles
  SET credits_remaining = credits_remaining - 1
  WHERE id = v_user;

  UPDATE public.test_sessions
  SET status = 'abandoned'
  WHERE user_id = v_user AND language = 'en' AND status = 'in_progress';

  INSERT INTO public.test_sessions (user_id, started_at, language, status, credits_consumed)
  VALUES (v_user, now(), 'en', 'in_progress', 1)
  RETURNING id INTO v_session_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason, language, session_id)
  VALUES (v_user, -1, 'assessment_session_start', 'en', v_session_id);

  RETURN v_session_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.start_assessment_session(text) FROM public;
REVOKE ALL ON FUNCTION public.abandon_assessment_session(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.start_assessment_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.abandon_assessment_session(uuid) TO authenticated;