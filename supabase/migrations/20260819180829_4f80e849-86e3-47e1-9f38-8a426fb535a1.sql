-- 1. record_streak: ignore caller-supplied user id, always use auth.uid()
CREATE OR REPLACE FUNCTION public.record_streak(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_current INTEGER := 0;
  v_longest INTEGER := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_gamification (user_id) VALUES (v_user)
    ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.streak_days (user_id, day) VALUES (v_user, v_today)
    ON CONFLICT DO NOTHING;

  WITH RECURSIVE walk AS (
    SELECT v_today AS d, 1 AS n
    WHERE EXISTS (SELECT 1 FROM public.streak_days WHERE user_id = v_user AND day = v_today)
    UNION ALL
    SELECT (w.d - INTERVAL '1 day')::date, w.n + 1
      FROM walk w
      WHERE EXISTS (SELECT 1 FROM public.streak_days
                    WHERE user_id = v_user AND day = (w.d - INTERVAL '1 day')::date)
  )
  SELECT COALESCE(MAX(n), 0) INTO v_current FROM walk;

  SELECT longest_streak INTO v_longest FROM public.user_gamification WHERE user_id = v_user;
  IF v_current > COALESCE(v_longest, 0) THEN
    v_longest := v_current;
  END IF;

  UPDATE public.user_gamification
     SET current_streak = v_current,
         longest_streak = v_longest,
         last_activity_date = v_today
   WHERE user_id = v_user;

  RETURN jsonb_build_object('current', v_current, 'longest', v_longest);
END;
$$;

REVOKE ALL ON FUNCTION public.record_streak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_streak(uuid) TO authenticated;

-- 2. reviews: remove redundant / overlapping SELECT policies
DROP POLICY IF EXISTS "Admins manage reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated read approved reviews" ON public.reviews;

-- 3. questions: strip leftover anon privileges (no anon policy exists)
REVOKE ALL ON TABLE public.questions FROM anon;
REVOKE ALL ON TABLE public.reviews FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.questions TO service_role;
GRANT ALL ON public.reviews TO service_role;