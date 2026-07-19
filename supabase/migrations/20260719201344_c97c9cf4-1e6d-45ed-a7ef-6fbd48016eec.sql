
-- 1. Enrich profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS candidate_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS objectives TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_recommendations TEXT,
  ADD COLUMN IF NOT EXISTS ai_recommendations_at TIMESTAMPTZ;

-- Backfill candidate_number for existing rows
UPDATE public.profiles
SET candidate_number = 'ODC-' || to_char(COALESCE(created_at, now()), 'YYYY') || '-' || upper(substr(replace(id::text, '-', ''), 1, 6))
WHERE candidate_number IS NULL;

-- Trigger to auto-generate candidate_number
CREATE OR REPLACE FUNCTION public.set_candidate_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.candidate_number IS NULL THEN
    NEW.candidate_number := 'ODC-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 6));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_candidate_number ON public.profiles;
CREATE TRIGGER trg_set_candidate_number
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_candidate_number();

-- 2. Enrich test_sessions
ALTER TABLE public.test_sessions
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS skill_scores JSONB;

-- 3. Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  comment TEXT NOT NULL,
  country TEXT,
  photo_url TEXT,
  level_achieved TEXT,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved reviews"
  ON public.reviews FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users read own reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users update own pending reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage reviews"
  ON public.reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Profile stats RPC
CREATE OR REPLACE FUNCTION public.get_profile_stats(p_user_id UUID)
RETURNS TABLE (
  total_tests INTEGER,
  completed_tests INTEGER,
  best_score NUMERIC,
  last_score NUMERIC,
  avg_duration_seconds NUMERIC,
  best_level TEXT,
  last_level TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::INTEGER,
    MAX(score),
    (SELECT score FROM public.test_sessions WHERE user_id = p_user_id AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1),
    AVG(duration_seconds) FILTER (WHERE completed_at IS NOT NULL),
    (SELECT level_result FROM public.test_sessions WHERE user_id = p_user_id AND completed_at IS NOT NULL ORDER BY score DESC NULLS LAST LIMIT 1),
    (SELECT level_result FROM public.test_sessions WHERE user_id = p_user_id AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1)
  FROM public.test_sessions
  WHERE user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_profile_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_stats(UUID) TO authenticated;
