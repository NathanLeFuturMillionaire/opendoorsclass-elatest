CREATE TABLE public.rw_weekly_challenge_weeks (
  week_start date PRIMARY KEY,
  finalized_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rw_weekly_challenge_weeks TO authenticated;
GRANT ALL ON public.rw_weekly_challenge_weeks TO service_role;
ALTER TABLE public.rw_weekly_challenge_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rw active learners read challenge weeks" ON public.rw_weekly_challenge_weeks
  FOR SELECT TO authenticated
  USING ((public.rw_learner_row(auth.uid())).id IS NOT NULL);

CREATE TABLE public.rw_weekly_challenge_winners (
  week_start date NOT NULL REFERENCES public.rw_weekly_challenge_weeks(week_start) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.rw_learners(id) ON DELETE RESTRICT,
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 3),
  first_name text NOT NULL,
  photo_path text,
  progress integer NOT NULL CHECK (progress > 2 AND progress <= 100),
  validated_count integer NOT NULL CHECK (validated_count > 0),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week_start, learner_id),
  UNIQUE (week_start, rank)
);
GRANT SELECT ON public.rw_weekly_challenge_winners TO authenticated;
GRANT ALL ON public.rw_weekly_challenge_winners TO service_role;
ALTER TABLE public.rw_weekly_challenge_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rw active learners read challenge winners" ON public.rw_weekly_challenge_winners
  FOR SELECT TO authenticated
  USING ((public.rw_learner_row(auth.uid())).id IS NOT NULL);

CREATE OR REPLACE FUNCTION public.rw_weekly_challenge_ranked(_week_start date)
RETURNS TABLE (
  learner_id uuid,
  first_name text,
  photo_path text,
  progress integer,
  validated_count integer,
  completed_at timestamptz,
  rank integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH weekly_validations AS (
    SELECT DISTINCT ON (s.learner_id, s.lesson_id)
      s.learner_id,
      s.lesson_id,
      COALESCE(s.reviewed_at, s.updated_at, s.created_at) AS validated_at
    FROM public.rw_submissions s
    JOIN public.rw_learners l ON l.id = s.learner_id AND l.is_active
    WHERE s.status = 'validated'
      AND COALESCE(s.reviewed_at, s.updated_at, s.created_at) >= (_week_start::timestamp AT TIME ZONE 'Africa/Libreville')
      AND COALESCE(s.reviewed_at, s.updated_at, s.created_at) < ((_week_start + 7)::timestamp AT TIME ZONE 'Africa/Libreville')
    ORDER BY s.learner_id, s.lesson_id,
      COALESCE(s.reviewed_at, s.updated_at, s.created_at) ASC,
      s.id ASC
  ), progress_by_learner AS (
    SELECT
      l.id AS learner_id,
      COALESCE(
        NULLIF(split_part(regexp_replace(btrim(l.full_name), '[[:space:]]+', ' ', 'g'), ' ', 1), ''),
        'Lecteur'
      ) AS first_name,
      l.photo_path,
      LEAST(100, ROUND(LEAST(COUNT(v.lesson_id), 6) * 100.0 / 6))::integer AS progress,
      COUNT(v.lesson_id)::integer AS validated_count,
      MAX(v.validated_at) AS completed_at
    FROM public.rw_learners l
    LEFT JOIN weekly_validations v ON v.learner_id = l.id
    WHERE l.is_active
    GROUP BY l.id
  )
  SELECT
    p.learner_id,
    p.first_name,
    p.photo_path,
    p.progress,
    p.validated_count,
    p.completed_at,
    ROW_NUMBER() OVER (
      ORDER BY p.progress DESC,
        p.validated_count DESC,
        p.completed_at ASC NULLS LAST,
        p.learner_id ASC
    )::integer AS rank
  FROM progress_by_learner p;
$$;
REVOKE ALL ON FUNCTION public.rw_weekly_challenge_ranked(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rw_weekly_challenge_ranked(date) TO service_role;

CREATE OR REPLACE FUNCTION public.rw_finalize_weekly_challenge(_week_start date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_week date := date_trunc('week', now() AT TIME ZONE 'Africa/Libreville')::date;
BEGIN
  IF _week_start IS NULL OR extract(isodow FROM _week_start) <> 1 OR _week_start >= current_week THEN
    RAISE EXCEPTION 'Semaine de challenge invalide.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.rw_weekly_challenge_weeks WHERE week_start = _week_start) THEN
    RETURN;
  END IF;

  INSERT INTO public.rw_weekly_challenge_weeks(week_start)
  VALUES (_week_start)
  ON CONFLICT (week_start) DO NOTHING;

  INSERT INTO public.rw_weekly_challenge_winners(
    week_start, learner_id, rank, first_name, photo_path,
    progress, validated_count, completed_at
  )
  SELECT
    _week_start, r.learner_id, r.rank, r.first_name, r.photo_path,
    r.progress, r.validated_count, r.completed_at
  FROM public.rw_weekly_challenge_ranked(_week_start) r
  WHERE r.progress > 2 AND r.rank <= 3
  ON CONFLICT (week_start, learner_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.rw_finalize_weekly_challenge(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rw_finalize_weekly_challenge(date) TO service_role;

CREATE OR REPLACE FUNCTION public.rw_weekly_challenge(_weeks_ago integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  learner public.rw_learners;
  current_week date;
  target_week date;
  start_ts timestamptz;
  end_ts timestamptz;
  top_rows jsonb;
  own_row jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise.';
  END IF;
  SELECT * INTO learner FROM public.rw_learners WHERE user_id = auth.uid() AND is_active;
  IF learner.id IS NULL THEN
    RAISE EXCEPTION 'Accès réservé aux apprenants actifs.';
  END IF;
  IF _weeks_ago IS NULL OR _weeks_ago < 0 OR _weeks_ago > 52 THEN
    RAISE EXCEPTION 'Période de challenge invalide.';
  END IF;

  current_week := date_trunc('week', now() AT TIME ZONE 'Africa/Libreville')::date;
  target_week := current_week - (_weeks_ago * 7);
  start_ts := target_week::timestamp AT TIME ZONE 'Africa/Libreville';
  end_ts := (target_week + 7)::timestamp AT TIME ZONE 'Africa/Libreville';

  PERFORM public.rw_finalize_weekly_challenge(current_week - 7);
  IF target_week < current_week - 7 THEN
    PERFORM public.rw_finalize_weekly_challenge(target_week);
  END IF;

  IF target_week = current_week THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'learner_id', r.learner_id,
        'first_name', r.first_name,
        'photo_path', r.photo_path,
        'progress', r.progress,
        'validated_count', r.validated_count,
        'completed_at', r.completed_at,
        'rank', r.rank
      ) ORDER BY r.rank
    ), '[]'::jsonb)
    INTO top_rows
    FROM public.rw_weekly_challenge_ranked(target_week) r
    WHERE r.progress > 2 AND r.rank <= 3;
  ELSE
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'learner_id', w.learner_id,
        'first_name', w.first_name,
        'photo_path', w.photo_path,
        'progress', w.progress,
        'validated_count', w.validated_count,
        'completed_at', w.completed_at,
        'rank', w.rank
      ) ORDER BY w.rank
    ), '[]'::jsonb)
    INTO top_rows
    FROM public.rw_weekly_challenge_winners w
    WHERE w.week_start = target_week;
  END IF;

  SELECT jsonb_build_object(
    'learner_id', r.learner_id,
    'progress', r.progress,
    'validated_count', r.validated_count,
    'rank', CASE WHEN r.progress > 2 THEN r.rank ELSE NULL END,
    'completed_at', r.completed_at
  )
  INTO own_row
  FROM public.rw_weekly_challenge_ranked(target_week) r
  WHERE r.learner_id = learner.id;

  RETURN jsonb_build_object(
    'week_start', target_week,
    'start_at', start_ts,
    'end_at', end_ts,
    'is_history', target_week < current_week,
    'top', COALESCE(top_rows, '[]'::jsonb),
    'own', own_row
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rw_weekly_challenge(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rw_weekly_challenge(integer) TO authenticated, service_role;