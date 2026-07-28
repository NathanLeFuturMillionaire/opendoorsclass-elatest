
-- =========================================================================
-- GAMIFICATION V1 — OpenDoors XP
-- =========================================================================

-- Badges catalogue
CREATE TABLE public.badges (
  code TEXT PRIMARY KEY,
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Trophy',
  category TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  requirement_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Admins manage badges" ON public.badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User gamification state
CREATE TABLE public.user_gamification (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  leaderboard_opt_in BOOLEAN NOT NULL DEFAULT false,
  display_country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_gamification TO authenticated;
GRANT ALL ON public.user_gamification TO service_role;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own gamification" ON public.user_gamification
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Users update own opt-in fields" ON public.user_gamification
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_gamification_updated_at
  BEFORE UPDATE ON public.user_gamification
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User badges
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL REFERENCES public.badges(code) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_code)
);
GRANT SELECT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own badges" ON public.user_badges
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- XP transactions (idempotent via event_key)
CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_key)
);
CREATE INDEX xp_transactions_user_created_idx ON public.xp_transactions (user_id, created_at DESC);
GRANT SELECT ON public.xp_transactions TO authenticated;
GRANT ALL ON public.xp_transactions TO service_role;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own xp txns" ON public.xp_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Streak days
CREATE TABLE public.streak_days (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  PRIMARY KEY (user_id, day)
);
GRANT SELECT ON public.streak_days TO authenticated;
GRANT ALL ON public.streak_days TO service_role;
ALTER TABLE public.streak_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own streak days" ON public.streak_days
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- =========================================================================
-- Functions
-- =========================================================================

-- Level thresholds (returns level 1..9)
CREATE OR REPLACE FUNCTION public.compute_open_doors_level(_xp INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _xp >= 7500 THEN 9
    WHEN _xp >= 5500 THEN 8
    WHEN _xp >= 4000 THEN 7
    WHEN _xp >= 2800 THEN 6
    WHEN _xp >= 1800 THEN 5
    WHEN _xp >= 1000 THEN 4
    WHEN _xp >= 500  THEN 3
    WHEN _xp >= 200  THEN 2
    ELSE 1
  END
$$;

-- award_xp: idempotent by event_key. Returns awarded (0/amount), new_total, new_level, level_up.
CREATE OR REPLACE FUNCTION public.award_xp(
  _user_id UUID,
  _event_type TEXT,
  _event_key TEXT,
  _amount INTEGER,
  _reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted BOOLEAN := false;
  v_old_level INTEGER := 1;
  v_new_total INTEGER := 0;
  v_new_level INTEGER := 1;
BEGIN
  IF _user_id IS NULL OR _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('awarded', 0, 'new_total', 0, 'new_level', 1, 'level_up', false);
  END IF;

  -- Ensure row exists
  INSERT INTO public.user_gamification (user_id) VALUES (_user_id)
    ON CONFLICT (user_id) DO NOTHING;

  SELECT current_level INTO v_old_level FROM public.user_gamification WHERE user_id = _user_id;

  INSERT INTO public.xp_transactions (user_id, amount, reason, event_type, event_key)
  VALUES (_user_id, _amount, _reason, _event_type, _event_key)
  ON CONFLICT (user_id, event_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted THEN
    UPDATE public.user_gamification
       SET total_xp = total_xp + _amount,
           current_level = public.compute_open_doors_level(total_xp + _amount)
     WHERE user_id = _user_id
     RETURNING total_xp, current_level INTO v_new_total, v_new_level;

    RETURN jsonb_build_object(
      'awarded', _amount,
      'new_total', v_new_total,
      'new_level', v_new_level,
      'level_up', v_new_level > v_old_level
    );
  ELSE
    SELECT total_xp, current_level INTO v_new_total, v_new_level
      FROM public.user_gamification WHERE user_id = _user_id;
    RETURN jsonb_build_object(
      'awarded', 0,
      'new_total', COALESCE(v_new_total, 0),
      'new_level', COALESCE(v_new_level, 1),
      'level_up', false
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.award_xp(UUID, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_xp(UUID, TEXT, TEXT, INTEGER, TEXT) TO service_role;

-- record_streak: log today; recompute current & longest.
CREATE OR REPLACE FUNCTION public.record_streak(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_current INTEGER := 0;
  v_longest INTEGER := 0;
  v_prev DATE;
BEGIN
  INSERT INTO public.user_gamification (user_id) VALUES (_user_id)
    ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.streak_days (user_id, day) VALUES (_user_id, v_today)
    ON CONFLICT DO NOTHING;

  -- Compute current streak by walking back consecutively
  WITH RECURSIVE walk AS (
    SELECT v_today AS d, 1 AS n
    WHERE EXISTS (SELECT 1 FROM public.streak_days WHERE user_id = _user_id AND day = v_today)
    UNION ALL
    SELECT (w.d - INTERVAL '1 day')::date, w.n + 1
      FROM walk w
      WHERE EXISTS (SELECT 1 FROM public.streak_days
                    WHERE user_id = _user_id AND day = (w.d - INTERVAL '1 day')::date)
  )
  SELECT COALESCE(MAX(n), 0) INTO v_current FROM walk;

  SELECT longest_streak INTO v_longest FROM public.user_gamification WHERE user_id = _user_id;
  IF v_current > COALESCE(v_longest, 0) THEN
    v_longest := v_current;
  END IF;

  UPDATE public.user_gamification
     SET current_streak = v_current,
         longest_streak = v_longest,
         last_activity_date = v_today
   WHERE user_id = _user_id;

  RETURN jsonb_build_object('current', v_current, 'longest', v_longest);
END;
$$;

REVOKE ALL ON FUNCTION public.record_streak(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_streak(UUID) TO authenticated, service_role;

-- check_and_award_badges: evaluate simple conditions for given user.
-- _context_session_id optional: used to look up per-session categories.
CREATE OR REPLACE FUNCTION public.check_and_award_badges(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_codes TEXT[] := ARRAY[]::TEXT[];
  v_row RECORD;
  v_percent NUMERIC;
  v_langs_count INT;
  v_scores JSONB;
  v_prev_best INT;
  v_last_score INT;
  v_best_level TEXT;
  v_completed_count INT;
  v_speaking_done BOOLEAN;
  v_award JSONB;
BEGIN
  -- Iterate every badge
  FOR v_row IN SELECT code, xp_reward FROM public.badges LOOP
    -- Skip if already unlocked
    IF EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = _user_id AND badge_code = v_row.code) THEN
      CONTINUE;
    END IF;

    -- Evaluate condition per code
    IF v_row.code = 'first_step' THEN
      SELECT COUNT(*) INTO v_completed_count FROM public.test_sessions
       WHERE user_id = _user_id AND completed_at IS NOT NULL;
      IF v_completed_count >= 1 THEN
        INSERT INTO public.user_badges (user_id, badge_code) VALUES (_user_id, v_row.code) ON CONFLICT DO NOTHING;
        v_new_codes := array_append(v_new_codes, v_row.code);
      END IF;

    ELSIF v_row.code = 'first_profile' THEN
      IF EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = _user_id
           AND p.first_name IS NOT NULL AND p.last_name IS NOT NULL
           AND p.nationality IS NOT NULL AND p.date_of_birth IS NOT NULL
           AND p.avatar_url IS NOT NULL
      ) THEN
        INSERT INTO public.user_badges (user_id, badge_code) VALUES (_user_id, v_row.code) ON CONFLICT DO NOTHING;
        v_new_codes := array_append(v_new_codes, v_row.code);
      END IF;

    ELSIF v_row.code = 'voice_unlocked' THEN
      SELECT bool_or( (answers)::text ILIKE '%"transcript"%' )
        INTO v_speaking_done
        FROM public.test_sessions
       WHERE user_id = _user_id AND completed_at IS NOT NULL;
      IF COALESCE(v_speaking_done, false) THEN
        INSERT INTO public.user_badges (user_id, badge_code) VALUES (_user_id, v_row.code) ON CONFLICT DO NOTHING;
        v_new_codes := array_append(v_new_codes, v_row.code);
      END IF;

    ELSIF v_row.code IN ('grammar_master','vocabulary_master','bookworm','good_listener','wordsmith','orthography_master') THEN
      DECLARE v_cat TEXT;
      BEGIN
        v_cat := CASE v_row.code
          WHEN 'grammar_master' THEN 'grammar'
          WHEN 'vocabulary_master' THEN 'vocabulary'
          WHEN 'bookworm' THEN 'reading'
          WHEN 'good_listener' THEN 'listening'
          WHEN 'wordsmith' THEN 'writing'
          WHEN 'orthography_master' THEN 'orthography'
        END;
        SELECT MAX( COALESCE((per_category_scores -> v_cat ->> 'percent')::numeric, 0) )
          INTO v_percent
          FROM public.test_sessions
         WHERE user_id = _user_id AND completed_at IS NOT NULL;
        IF COALESCE(v_percent, 0) >= 90 THEN
          INSERT INTO public.user_badges (user_id, badge_code) VALUES (_user_id, v_row.code) ON CONFLICT DO NOTHING;
          v_new_codes := array_append(v_new_codes, v_row.code);
        END IF;
      END;

    ELSIF v_row.code = 'polyglot' THEN
      SELECT COALESCE(array_length(languages_wanted, 1), 0) INTO v_langs_count
        FROM public.profiles WHERE id = _user_id;
      IF COALESCE(v_langs_count, 0) >= 3 THEN
        INSERT INTO public.user_badges (user_id, badge_code) VALUES (_user_id, v_row.code) ON CONFLICT DO NOTHING;
        v_new_codes := array_append(v_new_codes, v_row.code);
      END IF;

    ELSIF v_row.code = 'comeback' THEN
      -- improvement of >=10 pts between two completed sessions
      IF EXISTS (
        WITH ordered AS (
          SELECT score, ROW_NUMBER() OVER (ORDER BY completed_at) rn
            FROM public.test_sessions
           WHERE user_id = _user_id AND completed_at IS NOT NULL AND score IS NOT NULL
        )
        SELECT 1 FROM ordered a JOIN ordered b ON b.rn = a.rn + 1 WHERE b.score - a.score >= 10
      ) THEN
        INSERT INTO public.user_badges (user_id, badge_code) VALUES (_user_id, v_row.code) ON CONFLICT DO NOTHING;
        v_new_codes := array_append(v_new_codes, v_row.code);
      END IF;

    ELSIF v_row.code IN ('a1_unlocked','a2_unlocked','b1_unlocked','b2_unlocked','c1_unlocked','c2_master') THEN
      DECLARE v_lvl TEXT;
      BEGIN
        v_lvl := CASE v_row.code
          WHEN 'a1_unlocked' THEN 'A1'
          WHEN 'a2_unlocked' THEN 'A2'
          WHEN 'b1_unlocked' THEN 'B1'
          WHEN 'b2_unlocked' THEN 'B2'
          WHEN 'c1_unlocked' THEN 'C1'
          WHEN 'c2_master' THEN 'C2'
        END;
        IF EXISTS (
          SELECT 1 FROM public.test_sessions
           WHERE user_id = _user_id AND completed_at IS NOT NULL AND level_result::text = v_lvl
        ) THEN
          INSERT INTO public.user_badges (user_id, badge_code) VALUES (_user_id, v_row.code) ON CONFLICT DO NOTHING;
          v_new_codes := array_append(v_new_codes, v_row.code);
        END IF;
      END;
    END IF;
  END LOOP;

  -- Award XP for newly unlocked badges
  IF array_length(v_new_codes, 1) IS NOT NULL THEN
    FOR v_row IN SELECT code, xp_reward FROM public.badges WHERE code = ANY(v_new_codes) LOOP
      v_award := public.award_xp(_user_id, 'badge_unlocked', 'badge_' || v_row.code, v_row.xp_reward, 'Badge: ' || v_row.code);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('new_badges', to_jsonb(v_new_codes));
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_award_badges(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_award_badges(UUID) TO service_role;

-- Wrapper: process a completed test session (called from server fn).
CREATE OR REPLACE FUNCTION public.process_test_completion(_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_score INT;
  v_level TEXT;
  v_scores JSONB;
  v_prev_best INT;
  v_completed_count INT;
  v_awarded JSONB := '[]'::jsonb;
  v_res JSONB;
  v_cat TEXT;
  v_pct NUMERIC;
  v_new_total INT;
  v_new_level INT;
  v_level_up BOOLEAN := false;
  v_speaking BOOLEAN;
BEGIN
  SELECT user_id, score, level_result::text, per_category_scores, answers::text ILIKE '%"transcript"%'
    INTO v_user, v_score, v_level, v_scores, v_speaking
    FROM public.test_sessions WHERE id = _session_id;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object('error', 'session_not_found');
  END IF;

  -- test_completed
  v_res := public.award_xp(v_user, 'test_completed', 'test_completed_' || _session_id::text, 100, 'Test terminé');
  IF (v_res->>'level_up')::boolean THEN v_level_up := true; END IF;
  IF (v_res->>'awarded')::int > 0 THEN v_awarded := v_awarded || jsonb_build_object('event','test_completed','amount',(v_res->>'awarded')::int); END IF;

  -- first test
  SELECT COUNT(*) INTO v_completed_count FROM public.test_sessions
    WHERE user_id = v_user AND completed_at IS NOT NULL;
  IF v_completed_count = 1 THEN
    v_res := public.award_xp(v_user, 'test_first', 'test_first', 250, 'Premier test terminé');
    IF (v_res->>'level_up')::boolean THEN v_level_up := true; END IF;
    IF (v_res->>'awarded')::int > 0 THEN v_awarded := v_awarded || jsonb_build_object('event','test_first','amount',(v_res->>'awarded')::int); END IF;
  END IF;

  -- skills >=90 %
  IF v_scores IS NOT NULL THEN
    FOR v_cat IN SELECT jsonb_object_keys(v_scores) LOOP
      v_pct := COALESCE((v_scores -> v_cat ->> 'percent')::numeric, 0);
      IF v_pct >= 90 THEN
        v_res := public.award_xp(
          v_user,
          'skill_completed',
          'skill_' || v_cat || '_' || _session_id::text,
          50,
          'Compétence ' || v_cat || ' maîtrisée'
        );
        IF (v_res->>'level_up')::boolean THEN v_level_up := true; END IF;
        IF (v_res->>'awarded')::int > 0 THEN v_awarded := v_awarded || jsonb_build_object('event','skill_'||v_cat,'amount',(v_res->>'awarded')::int); END IF;
      END IF;
    END LOOP;
  END IF;

  -- CEFR level first time reached
  IF v_level IS NOT NULL THEN
    v_res := public.award_xp(v_user, 'cefr_reached', 'cefr_' || v_level, 250, 'Palier CECRL atteint: ' || v_level);
    IF (v_res->>'level_up')::boolean THEN v_level_up := true; END IF;
    IF (v_res->>'awarded')::int > 0 THEN v_awarded := v_awarded || jsonb_build_object('event','cefr_'||v_level,'amount',(v_res->>'awarded')::int); END IF;
  END IF;

  -- Score improvement vs previous best (excluding this session)
  SELECT MAX(score) INTO v_prev_best FROM public.test_sessions
    WHERE user_id = v_user AND completed_at IS NOT NULL AND id <> _session_id;
  IF v_prev_best IS NOT NULL AND v_score IS NOT NULL AND (v_score - v_prev_best) >= 10 THEN
    v_res := public.award_xp(v_user, 'score_improved', 'score_improved_' || _session_id::text, 100, 'Score amélioré');
    IF (v_res->>'level_up')::boolean THEN v_level_up := true; END IF;
    IF (v_res->>'awarded')::int > 0 THEN v_awarded := v_awarded || jsonb_build_object('event','score_improved','amount',(v_res->>'awarded')::int); END IF;
  END IF;

  -- Badges
  v_res := public.check_and_award_badges(v_user);

  -- Streak
  PERFORM public.record_streak(v_user);

  SELECT total_xp, current_level INTO v_new_total, v_new_level FROM public.user_gamification WHERE user_id = v_user;

  RETURN jsonb_build_object(
    'awarded', v_awarded,
    'new_badges', v_res->'new_badges',
    'total_xp', COALESCE(v_new_total, 0),
    'current_level', COALESCE(v_new_level, 1),
    'level_up', v_level_up
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_test_completion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_test_completion(UUID) TO service_role;

-- Called after profile updates
CREATE OR REPLACE FUNCTION public.process_profile_update(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_complete BOOLEAN;
  v_res JSONB;
BEGIN
  SELECT (first_name IS NOT NULL AND last_name IS NOT NULL
       AND nationality IS NOT NULL AND date_of_birth IS NOT NULL
       AND avatar_url IS NOT NULL)
    INTO v_complete FROM public.profiles WHERE id = _user_id;
  IF COALESCE(v_complete, false) THEN
    v_res := public.award_xp(_user_id, 'profile_completed', 'profile_completed', 100, 'Profil complété');
  END IF;
  PERFORM public.check_and_award_badges(_user_id);
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.process_profile_update(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_profile_update(UUID) TO service_role;

-- Summary for current user
CREATE OR REPLACE FUNCTION public.get_gamification_summary()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_row public.user_gamification;
  v_badges JSONB;
  v_txns JSONB;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.user_gamification (user_id) VALUES (v_user) ON CONFLICT DO NOTHING;
  SELECT * INTO v_row FROM public.user_gamification WHERE user_id = v_user;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'code', b.code,
      'name_fr', b.name_fr, 'name_en', b.name_en,
      'description_fr', b.description_fr, 'description_en', b.description_en,
      'icon', b.icon, 'category', b.category, 'xp_reward', b.xp_reward,
      'sort_order', b.sort_order,
      'unlocked_at', ub.unlocked_at
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
    'total_xp', v_row.total_xp,
    'current_level', v_row.current_level,
    'current_streak', v_row.current_streak,
    'longest_streak', v_row.longest_streak,
    'last_activity_date', v_row.last_activity_date,
    'leaderboard_opt_in', v_row.leaderboard_opt_in,
    'display_country', v_row.display_country,
    'badges', v_badges,
    'transactions', v_txns
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_gamification_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gamification_summary() TO authenticated;

-- Leaderboard (opt-in only)
CREATE OR REPLACE FUNCTION public.get_gamification_leaderboard(_scope TEXT, _limit INT DEFAULT 25)
RETURNS TABLE (
  rank INT,
  display_name TEXT,
  country TEXT,
  cefr_level TEXT,
  total_xp INT,
  current_level INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT ug.user_id, ug.total_xp, ug.current_level,
           COALESCE(ug.display_country, p.country, p.nationality, 'Unknown') AS country,
           TRIM(COALESCE(p.first_name, '')) ||
             CASE WHEN p.last_name IS NOT NULL AND length(p.last_name) > 0
                  THEN ' ' || upper(substr(p.last_name, 1, 1)) || '.'
                  ELSE '' END AS display_name,
           (SELECT level_result::text FROM public.test_sessions ts
             WHERE ts.user_id = ug.user_id AND ts.completed_at IS NOT NULL
             ORDER BY ts.score DESC NULLS LAST LIMIT 1) AS cefr_level
      FROM public.user_gamification ug
      JOIN public.profiles p ON p.id = ug.user_id
     WHERE ug.leaderboard_opt_in = true
       AND ug.total_xp > 0
  )
  SELECT ROW_NUMBER() OVER (ORDER BY total_xp DESC)::INT AS rank,
         COALESCE(NULLIF(display_name, ''), 'Anonymous') AS display_name,
         country, cefr_level, total_xp, current_level
    FROM filtered
   WHERE CASE _scope
           WHEN 'global' THEN true
           WHEN 'africa' THEN country IN ('GA','CD','CG','CI','SN','CM','BJ','TG','ML','BF','NE','TD','RW','GN','MR','MG','ZA','KE','NG','MA','TN','DZ','EG','ET','GH')
           ELSE country = _scope
         END
   ORDER BY total_xp DESC
   LIMIT COALESCE(_limit, 25);
$$;

REVOKE ALL ON FUNCTION public.get_gamification_leaderboard(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gamification_leaderboard(TEXT, INT) TO authenticated;

-- Admin: top XP overview
CREATE OR REPLACE FUNCTION public.get_gamification_admin_overview(_limit INT DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT jsonb_build_object(
    'total_xp_awarded', COALESCE((SELECT SUM(amount) FROM public.xp_transactions), 0),
    'total_badges_unlocked', (SELECT COUNT(*) FROM public.user_badges),
    'top_users', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', ug.user_id,
        'first_name', p.first_name, 'last_name', p.last_name,
        'total_xp', ug.total_xp, 'current_level', ug.current_level,
        'badges', (SELECT COUNT(*) FROM public.user_badges ub WHERE ub.user_id = ug.user_id)
      ) ORDER BY ug.total_xp DESC)
      FROM (SELECT * FROM public.user_gamification ORDER BY total_xp DESC LIMIT _limit) ug
      JOIN public.profiles p ON p.id = ug.user_id
    ), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_gamification_admin_overview(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gamification_admin_overview(INT) TO authenticated;

-- Leaderboard opt-in toggle
CREATE OR REPLACE FUNCTION public.set_leaderboard_opt_in(_opt_in BOOLEAN, _country TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.user_gamification (user_id, leaderboard_opt_in, display_country)
    VALUES (v_user, _opt_in, _country)
    ON CONFLICT (user_id) DO UPDATE
      SET leaderboard_opt_in = EXCLUDED.leaderboard_opt_in,
          display_country = COALESCE(EXCLUDED.display_country, public.user_gamification.display_country);
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_leaderboard_opt_in(BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_leaderboard_opt_in(BOOLEAN, TEXT) TO authenticated;

-- =========================================================================
-- Extend handle_new_user to create gamification row + welcome XP
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, credits_remaining)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    0
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_gamification (user_id) VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  PERFORM public.award_xp(NEW.id, 'account_created', 'account_created', 50, 'Bienvenue sur OpenDoorsClass');
  RETURN NEW;
END;
$$;

-- =========================================================================
-- Seed badges
-- =========================================================================
INSERT INTO public.badges (code, name_fr, name_en, description_fr, description_en, icon, category, xp_reward, sort_order) VALUES
('first_step','Premier pas','First Step','Votre parcours OpenDoorsClass commence ici.','Your OpenDoorsClass journey begins here.','Sparkles','test',50,10),
('first_profile','Profil complet','First Profile','Votre profil est renseigné à 100 %.','Your profile is 100% complete.','UserCheck','profile',50,20),
('voice_unlocked','Voix débloquée','Voice Unlocked','Vous avez terminé votre premier test de Speaking.','You completed your first Speaking test.','Mic','skill',50,30),
('grammar_master','Grammar Master','Grammar Master','Obtenez au moins 90 % en Grammar.','Achieve at least 90% in Grammar.','BookOpen','skill',75,40),
('bookworm','Bookworm','Bookworm','Obtenez au moins 90 % en Reading.','Achieve at least 90% in Reading.','BookMarked','skill',75,50),
('good_listener','Good Listener','Good Listener','Obtenez au moins 90 % en Listening.','Achieve at least 90% in Listening.','Headphones','skill',75,60),
('wordsmith','Wordsmith','Wordsmith','Obtenez au moins 90 % en Writing.','Achieve at least 90% in Writing.','PenLine','skill',75,70),
('vocabulary_master','Vocabulary Master','Vocabulary Master','Obtenez au moins 90 % en Vocabulary.','Achieve at least 90% in Vocabulary.','Languages','skill',75,80),
('orthography_master','Orthography Master','Orthography Master','Obtenez au moins 90 % en Orthography.','Achieve at least 90% in Orthography.','SpellCheck','skill',75,85),
('polyglot','Polyglot','Polyglot','Indiquez au moins 3 langues que vous souhaitez apprendre.','Set at least 3 languages you want to learn.','Globe','profile',50,90),
('comeback','Comeback','Comeback','Améliorez votre score de 10 points ou plus.','Improve your score by 10 points or more.','TrendingUp','test',100,100),
('b1_unlocked','B1 débloqué','B1 Unlocked','Vous avez atteint le niveau B1.','You reached level B1.','Award','level',150,110),
('b2_unlocked','B2 débloqué','B2 Unlocked','Vous avez atteint le niveau B2.','You reached level B2.','Award','level',200,120),
('c1_unlocked','C1 débloqué','C1 Unlocked','Vous avez atteint le niveau C1.','You reached level C1.','Award','level',300,130),
('c2_master','C2 Master','C2 Master','Vous avez atteint le niveau C2.','You reached level C2.','Crown','level',500,140);

-- Additional single-award badges for A1/A2 completions (optional)
INSERT INTO public.badges (code, name_fr, name_en, description_fr, description_en, icon, category, xp_reward, sort_order) VALUES
('a1_unlocked','A1 débloqué','A1 Unlocked','Vous avez atteint le niveau A1.','You reached level A1.','Award','level',75,105),
('a2_unlocked','A2 débloqué','A2 Unlocked','Vous avez atteint le niveau A2.','You reached level A2.','Award','level',100,107);

-- =========================================================================
-- Backfill existing users
-- =========================================================================
INSERT INTO public.user_gamification (user_id)
SELECT id FROM public.profiles
ON CONFLICT DO NOTHING;

-- Grant welcome XP to existing users
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.award_xp(r.id, 'account_created', 'account_created', 50, 'Bienvenue sur OpenDoorsClass');
    -- Process each completed session historically
    PERFORM public.process_test_completion(ts.id)
      FROM public.test_sessions ts
     WHERE ts.user_id = r.id AND ts.completed_at IS NOT NULL;
    PERFORM public.process_profile_update(r.id);
  END LOOP;
END $$;
