
-- 1. record_streak
CREATE OR REPLACE FUNCTION public.record_streak(_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := _user_id;
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_current INTEGER := 0;
  v_longest INTEGER := 0;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.user_gamification (user_id) VALUES (v_user) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.streak_days (user_id, day) VALUES (v_user, v_today) ON CONFLICT DO NOTHING;
  WITH RECURSIVE walk AS (
    SELECT v_today AS d, 1 AS n
    WHERE EXISTS (SELECT 1 FROM public.streak_days WHERE user_id = v_user AND day = v_today)
    UNION ALL
    SELECT (w.d - INTERVAL '1 day')::date, w.n + 1
      FROM walk w
      WHERE EXISTS (SELECT 1 FROM public.streak_days WHERE user_id = v_user AND day = (w.d - INTERVAL '1 day')::date)
  )
  SELECT COALESCE(MAX(n), 0) INTO v_current FROM walk;
  SELECT longest_streak INTO v_longest FROM public.user_gamification WHERE user_id = v_user;
  IF v_current > COALESCE(v_longest, 0) THEN v_longest := v_current; END IF;
  UPDATE public.user_gamification
     SET current_streak = v_current, longest_streak = v_longest, last_activity_date = v_today
   WHERE user_id = v_user;
  RETURN jsonb_build_object('current', v_current, 'longest', v_longest);
END;
$function$;

-- 2. get_gamification_summary
CREATE OR REPLACE FUNCTION public.get_gamification_summary(_actor uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := _actor;
  v_row public.user_gamification;
  v_badges JSONB;
  v_txns JSONB;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_row FROM public.user_gamification WHERE user_id = v_user;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'code', b.code, 'name_fr', b.name_fr, 'name_en', b.name_en,
      'description_fr', b.description_fr, 'description_en', b.description_en,
      'icon', b.icon, 'category', b.category, 'xp_reward', b.xp_reward,
      'sort_order', b.sort_order, 'unlocked_at', ub.unlocked_at
    ) ORDER BY b.sort_order), '[]'::jsonb)
    INTO v_badges
    FROM public.badges b
    LEFT JOIN public.user_badges ub ON ub.badge_code = b.code AND ub.user_id = v_user;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'amount', amount, 'reason', reason, 'event_type', event_type, 'created_at', created_at
    ) ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_txns
    FROM (SELECT amount, reason, event_type, created_at FROM public.xp_transactions
           WHERE user_id = v_user ORDER BY created_at DESC LIMIT 25) t;
  RETURN jsonb_build_object(
    'total_xp', COALESCE(v_row.total_xp, 0),
    'current_level', COALESCE(v_row.current_level, 1),
    'current_streak', COALESCE(v_row.current_streak, 0),
    'longest_streak', COALESCE(v_row.longest_streak, 0),
    'last_activity_date', v_row.last_activity_date,
    'leaderboard_opt_in', COALESCE(v_row.leaderboard_opt_in, false),
    'display_country', v_row.display_country,
    'badges', v_badges,
    'transactions', v_txns
  );
END;
$function$;
DROP FUNCTION IF EXISTS public.get_gamification_summary();

-- 3. set_leaderboard_opt_in
CREATE OR REPLACE FUNCTION public.set_leaderboard_opt_in(_opt_in boolean, _country text, _actor uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user UUID := _actor;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.user_gamification (user_id, leaderboard_opt_in, display_country)
    VALUES (v_user, _opt_in, _country)
    ON CONFLICT (user_id) DO UPDATE
      SET leaderboard_opt_in = EXCLUDED.leaderboard_opt_in,
          display_country = COALESCE(EXCLUDED.display_country, public.user_gamification.display_country);
  RETURN jsonb_build_object('ok', true);
END;
$function$;
DROP FUNCTION IF EXISTS public.set_leaderboard_opt_in(boolean, text);

-- 4. leaderboard
CREATE OR REPLACE FUNCTION public.get_gamification_leaderboard(_scope text, _limit integer, _actor uuid)
 RETURNS TABLE(rank integer, display_name text, country text, cefr_level text, total_xp integer, current_level integer)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  WITH filtered AS (
    SELECT ug.user_id, ug.total_xp, ug.current_level,
           COALESCE(ug.display_country, p.country, p.nationality, 'Unknown') AS country,
           TRIM(COALESCE(p.first_name, '')) ||
             CASE WHEN p.last_name IS NOT NULL AND length(p.last_name) > 0
                  THEN ' ' || upper(substr(p.last_name, 1, 1)) || '.'
                  ELSE '' END AS display_name,
           (SELECT ts.level_result::text FROM public.test_sessions ts
             WHERE ts.user_id = ug.user_id AND ts.completed_at IS NOT NULL
             ORDER BY ts.score DESC NULLS LAST LIMIT 1) AS cefr_level
      FROM public.user_gamification ug
      JOIN public.profiles p ON p.id = ug.user_id
     WHERE ug.leaderboard_opt_in = true AND ug.total_xp > 0
  )
  SELECT ROW_NUMBER() OVER (ORDER BY f.total_xp DESC)::INT,
         COALESCE(NULLIF(f.display_name, ''), 'Anonymous'),
         f.country, f.cefr_level, f.total_xp, f.current_level
    FROM filtered f
   WHERE CASE _scope
           WHEN 'global' THEN true
           WHEN 'africa' THEN f.country IN ('GA','CD','CG','CI','SN','CM','BJ','TG','ML','BF','NE','TD','RW','GN','MR','MG','ZA','KE','NG','MA','TN','DZ','EG','ET','GH')
           ELSE f.country = _scope
         END
   ORDER BY f.total_xp DESC
   LIMIT COALESCE(_limit, 25);
END;
$function$;
DROP FUNCTION IF EXISTS public.get_gamification_leaderboard(text, integer);

-- 5. start_test_session
CREATE OR REPLACE FUNCTION public.start_test_session(_actor uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := _actor;
  v_credits INTEGER;
  v_session_id UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT credits_remaining INTO v_credits FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF v_credits IS NULL OR v_credits < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_CREDITS'; END IF;
  UPDATE public.profiles SET credits_remaining = credits_remaining - 1 WHERE id = v_user;
  UPDATE public.test_sessions SET status = 'abandoned'
   WHERE user_id = v_user AND language = 'en' AND status = 'in_progress';
  INSERT INTO public.test_sessions (user_id, started_at, language, status, credits_consumed)
  VALUES (v_user, now(), 'en', 'in_progress', 1) RETURNING id INTO v_session_id;
  INSERT INTO public.credit_transactions (user_id, amount, reason, language, session_id)
  VALUES (v_user, -1, 'assessment_session_start', 'en', v_session_id);
  RETURN v_session_id;
END;
$function$;
DROP FUNCTION IF EXISTS public.start_test_session();

-- 6. start_assessment_session
CREATE OR REPLACE FUNCTION public.start_assessment_session(_language text, _actor uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := _actor;
  v_credits integer;
  v_session_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF _language IS NULL OR _language NOT IN ('en','es') THEN RAISE EXCEPTION 'UNSUPPORTED_LANGUAGE'; END IF;
  SELECT credits_remaining INTO v_credits FROM public.profiles WHERE id = v_user FOR UPDATE;
  SELECT id INTO v_session_id FROM public.test_sessions
   WHERE user_id = v_user AND language = _language AND status = 'in_progress'
   ORDER BY started_at DESC LIMIT 1;
  IF v_session_id IS NOT NULL THEN
    RETURN jsonb_build_object('session_id', v_session_id, 'resumed', true, 'credits_remaining', v_credits);
  END IF;
  IF v_credits IS NULL OR v_credits < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_CREDITS'; END IF;
  UPDATE public.profiles SET credits_remaining = credits_remaining - 1 WHERE id = v_user
    RETURNING credits_remaining INTO v_credits;
  INSERT INTO public.test_sessions (user_id, started_at, language, status, credits_consumed)
  VALUES (v_user, now(), _language, 'in_progress', 1) RETURNING id INTO v_session_id;
  INSERT INTO public.credit_transactions (user_id, amount, reason, language, session_id)
  VALUES (v_user, -1, 'assessment_session_start', _language, v_session_id);
  RETURN jsonb_build_object('session_id', v_session_id, 'resumed', false, 'credits_remaining', v_credits);
END;
$function$;
DROP FUNCTION IF EXISTS public.start_assessment_session(text);

-- 7. abandon_assessment_session
CREATE OR REPLACE FUNCTION public.abandon_assessment_session(_session_id uuid, _actor uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := _actor;
  v_updated integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  UPDATE public.test_sessions SET status = 'abandoned'
   WHERE id = _session_id AND user_id = v_user AND status = 'in_progress';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN jsonb_build_object('abandoned', v_updated > 0);
END;
$function$;
DROP FUNCTION IF EXISTS public.abandon_assessment_session(uuid);

REVOKE ALL ON FUNCTION public.record_streak(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_gamification_summary(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_leaderboard_opt_in(boolean, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_gamification_leaderboard(text, integer, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_test_session(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_assessment_session(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.abandon_assessment_session(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_streak(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_gamification_summary(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_leaderboard_opt_in(boolean, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_gamification_leaderboard(text, integer, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.start_test_session(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.start_assessment_session(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.abandon_assessment_session(uuid, uuid) TO service_role;
