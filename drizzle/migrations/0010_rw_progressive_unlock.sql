ALTER TABLE public.rw_submissions ADD COLUMN IF NOT EXISTS rework_passages text;

CREATE TABLE public.rw_unlock_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES public.rw_learners(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.rw_lessons(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (length(trim(reason)) >= 5),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learner_id, lesson_id)
);
GRANT SELECT ON public.rw_unlock_overrides TO authenticated;
GRANT ALL ON public.rw_unlock_overrides TO service_role;
ALTER TABLE public.rw_unlock_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rw staff reads overrides" ON public.rw_unlock_overrides FOR SELECT TO authenticated
  USING (public.rw_is_staff(auth.uid()) OR public.rw_coaches_learner(auth.uid(), learner_id));

CREATE TABLE public.rw_submission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.rw_submissions(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  score integer,
  feedback text,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.rw_submission_history (submission_id, created_at);
GRANT SELECT ON public.rw_submission_history TO authenticated;
GRANT ALL ON public.rw_submission_history TO service_role;
ALTER TABLE public.rw_submission_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rw history readers" ON public.rw_submission_history FOR SELECT TO authenticated
  USING (public.rw_is_staff(auth.uid()) OR public.rw_coaches_learner(auth.uid(), learner_id)
    OR learner_id = (public.rw_learner_row(auth.uid())).id);

-- Ordered published lessons for a learner with their state.
CREATE OR REPLACE FUNCTION public.rw_learner_lesson_states(_learner uuid)
RETURNS TABLE(lesson_id uuid, title text, week_number integer, day_index integer, pos integer, state text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT * FROM public.rw_learners WHERE id = _learner),
  ordered AS (
    SELECT l.id, l.title, w.week_number, s.day_index,
      row_number() OVER (ORDER BY w.week_number, s.day_index)::int AS pos
    FROM public.rw_lessons l JOIN public.rw_sessions s ON s.id = l.session_id JOIN public.rw_weeks w ON w.id = s.week_id
    JOIN me ON me.level = l.level WHERE l.status = 'published'),
  st AS (
    SELECT o.*,
      EXISTS (SELECT 1 FROM public.rw_submissions x WHERE x.learner_id = _learner AND x.lesson_id = o.id AND x.status = 'validated') AS validated,
      (SELECT x.status::text FROM public.rw_submissions x WHERE x.learner_id = _learner AND x.lesson_id = o.id ORDER BY x.created_at DESC LIMIT 1) AS last_status,
      (SELECT count(*) FROM public.rw_submissions x WHERE x.learner_id = _learner AND x.lesson_id = o.id) AS n_sub,
      EXISTS (SELECT 1 FROM public.rw_answers a WHERE a.learner_id = _learner AND a.lesson_id = o.id) AS answered,
      EXISTS (SELECT 1 FROM public.rw_unlock_overrides u WHERE u.learner_id = _learner AND u.lesson_id = o.id) AS overridden
    FROM ordered o),
  prev AS (SELECT st.*, lag(validated, 1, true) OVER (ORDER BY pos) AS prev_validated FROM st)
  SELECT id, title, week_number, day_index, pos,
    CASE
      WHEN validated THEN 'validated'
      WHEN NOT (prev_validated OR overridden) THEN 'locked'
      WHEN last_status = 'redo' THEN 'redo'
      WHEN last_status = 'submitted' AND n_sub > 1 THEN 'resubmitted'
      WHEN last_status = 'submitted' THEN 'submitted'
      WHEN answered THEN 'in_progress'
      ELSE 'available'
    END
  FROM prev ORDER BY pos
$$;

CREATE OR REPLACE FUNCTION public.rw_lesson_unlocked(_learner uuid, _lesson uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT state <> 'locked' FROM public.rw_learner_lesson_states(_learner) WHERE lesson_id = _lesson), false)
$$;

CREATE OR REPLACE FUNCTION public.rw_my_lesson_states()
RETURNS TABLE(lesson_id uuid, title text, week_number integer, day_index integer, pos integer, state text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me public.rw_learners;
BEGIN
  me := public.rw_learner_row(auth.uid());
  IF me.id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT * FROM public.rw_learner_lesson_states(me.id);
END $$;

CREATE OR REPLACE FUNCTION public.rw_states_for_learner(_learner uuid)
RETURNS TABLE(lesson_id uuid, title text, week_number integer, day_index integer, pos integer, state text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.rw_is_staff(auth.uid()) OR public.rw_coaches_learner(auth.uid(), _learner)) THEN
    RAISE EXCEPTION 'Accès refusé.';
  END IF;
  RETURN QUERY SELECT * FROM public.rw_learner_lesson_states(_learner);
END $$;

CREATE OR REPLACE FUNCTION public.rw_manual_unlock(_learner uuid, _lesson uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.rw_is_staff(auth.uid()) THEN RAISE EXCEPTION 'Réservé aux administrateurs.'; END IF;
  IF length(trim(COALESCE(_reason,''))) < 5 THEN RAISE EXCEPTION 'Justification obligatoire (5 caractères minimum).'; END IF;
  INSERT INTO public.rw_unlock_overrides(learner_id, lesson_id, reason, created_by)
  VALUES (_learner, _lesson, trim(_reason), auth.uid())
  ON CONFLICT (learner_id, lesson_id) DO UPDATE SET reason = EXCLUDED.reason, created_by = EXCLUDED.created_by, created_at = now();
END $$;

REVOKE ALL ON FUNCTION public.rw_learner_lesson_states(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rw_lesson_unlocked(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rw_my_lesson_states() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rw_states_for_learner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rw_manual_unlock(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rw_lesson_unlocked(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rw_my_lesson_states() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rw_states_for_learner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rw_manual_unlock(uuid, uuid, text) TO authenticated;

-- Learners only read unlocked lessons.
DROP POLICY "rw learner reads own level lessons" ON public.rw_lessons;
CREATE POLICY "rw learner reads unlocked lessons" ON public.rw_lessons FOR SELECT TO authenticated
  USING (status = 'published' AND level = (public.rw_learner_row(auth.uid())).level
    AND public.rw_lesson_unlocked((public.rw_learner_row(auth.uid())).id, id));

-- Submission guard: only staff or the assigned coach may review; learners cannot touch review fields.
CREATE OR REPLACE FUNCTION public.rw_submission_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reviewer boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.rw_is_staff(auth.uid()) THEN
    IF NEW.learner_id <> OLD.learner_id OR NEW.lesson_id <> OLD.lesson_id OR NEW.storage_path <> OLD.storage_path
       OR NEW.kind <> OLD.kind OR NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Modification non autorisée';
    END IF;
    reviewer := public.rw_coaches_learner(auth.uid(), OLD.learner_id);
    IF NOT reviewer AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.score IS DISTINCT FROM OLD.score
       OR NEW.coach_feedback IS DISTINCT FROM OLD.coach_feedback OR NEW.reading_score IS DISTINCT FROM OLD.reading_score
       OR NEW.pronunciation_score IS DISTINCT FROM OLD.pronunciation_score OR NEW.fluency_score IS DISTINCT FROM OLD.fluency_score
       OR NEW.rework_passages IS DISTINCT FROM OLD.rework_passages) THEN
      RAISE EXCEPTION 'Seul le coach ou un administrateur peut corriger un envoi.';
    END IF;
  END IF;
  IF NEW.status = 'redo' AND NEW.status IS DISTINCT FROM OLD.status AND length(trim(COALESCE(NEW.coach_feedback,''))) = 0 THEN
    RAISE EXCEPTION 'Un commentaire écrit est obligatoire pour demander une correction.';
  END IF;
  NEW.updated_at := now();
  IF NEW.status <> OLD.status THEN NEW.reviewed_at := now(); NEW.reviewed_by := auth.uid(); END IF;
  RETURN NEW;
END $$;

-- New submissions only on unlocked, not yet validated lessons.
CREATE OR REPLACE FUNCTION public.rw_submission_insert_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.rw_is_staff(auth.uid()) THEN
    IF NOT public.rw_lesson_unlocked(NEW.learner_id, NEW.lesson_id) THEN
      RAISE EXCEPTION 'Ce texte est encore verrouillé.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.rw_submissions WHERE learner_id = NEW.learner_id AND lesson_id = NEW.lesson_id AND status = 'validated') THEN
      RAISE EXCEPTION 'Ce texte est déjà validé.';
    END IF;
    NEW.status := 'submitted'; NEW.score := NULL; NEW.coach_feedback := NULL; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL;
    NEW.reading_score := NULL; NEW.pronunciation_score := NULL; NEW.fluency_score := NULL; NEW.rework_passages := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rw_submissions_insert_guard BEFORE INSERT ON public.rw_submissions FOR EACH ROW EXECUTE FUNCTION public.rw_submission_insert_guard();

CREATE OR REPLACE FUNCTION public.rw_submission_log() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.coach_feedback IS DISTINCT FROM OLD.coach_feedback THEN
    INSERT INTO public.rw_submission_history(submission_id, learner_id, lesson_id, old_status, new_status, score, feedback, actor)
    VALUES (NEW.id, NEW.learner_id, NEW.lesson_id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::text END, NEW.status::text,
      NEW.score, NEW.coach_feedback, auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rw_submissions_log AFTER INSERT OR UPDATE ON public.rw_submissions FOR EACH ROW EXECUTE FUNCTION public.rw_submission_log();
REVOKE ALL ON FUNCTION public.rw_submission_log() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rw_submission_insert_guard() FROM PUBLIC, anon, authenticated;