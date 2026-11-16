CREATE TABLE public.rw_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES public.rw_learners(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.rw_lessons(id) ON DELETE CASCADE,
  question_index integer NOT NULL CHECK (question_index BETWEEN 0 AND 9),
  question_type text NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq','true_false','short','open')),
  answer text NOT NULL,
  expected text,
  points integer CHECK (points BETWEEN 0 AND 2),
  max_points integer NOT NULL DEFAULT 2,
  status text NOT NULL CHECK (status IN ('auto_graded','pending','graded')),
  coach_comment text,
  graded_by uuid,
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learner_id, lesson_id, question_index)
);
GRANT SELECT ON public.rw_answers TO authenticated;
GRANT ALL ON public.rw_answers TO service_role;
ALTER TABLE public.rw_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rw answers readable by owner coach staff" ON public.rw_answers FOR SELECT TO authenticated
USING (
  learner_id = (public.rw_learner_row(auth.uid())).id
  OR public.rw_coaches_learner(auth.uid(), learner_id)
  OR public.rw_is_staff(auth.uid())
);

ALTER TABLE public.rw_submissions
  ADD COLUMN reading_score integer CHECK (reading_score BETWEEN 0 AND 20),
  ADD COLUMN pronunciation_score integer CHECK (pronunciation_score BETWEEN 0 AND 20),
  ADD COLUMN fluency_score integer CHECK (fluency_score BETWEEN 0 AND 20);

-- Questions stripped of answers for learners, full for coaches and staff.
CREATE OR REPLACE FUNCTION public.rw_lesson_questions(_lesson uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.rw_lessons; me public.rw_learners;
BEGIN
  SELECT * INTO l FROM public.rw_lessons WHERE id = _lesson;
  IF l.id IS NULL THEN RETURN '[]'::jsonb; END IF;
  IF public.rw_is_staff(auth.uid()) THEN RETURN l.questions; END IF;
  IF l.status <> 'published' THEN RETURN '[]'::jsonb; END IF;
  IF public.rw_coach_id(auth.uid()) IS NOT NULL THEN RETURN l.questions; END IF;
  me := public.rw_learner_row(auth.uid());
  IF me.id IS NULL OR me.level <> l.level THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'question', q->>'question',
      'type', COALESCE(q->>'type','mcq'),
      'options', CASE WHEN COALESCE(q->>'type','mcq') = 'true_false' THEN '["True","False"]'::jsonb ELSE COALESCE(q->'options','[]'::jsonb) END
    ) ORDER BY ord)
    FROM jsonb_array_elements(l.questions) WITH ORDINALITY AS t(q, ord)), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.rw_save_answer(_lesson uuid, _index integer, _answer text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me public.rw_learners; l public.rw_lessons; q jsonb; qt text; a text; existing public.rw_answers; pts integer; st text; exp text; r public.rw_answers;
BEGIN
  me := public.rw_learner_row(auth.uid());
  IF me.id IS NULL THEN RAISE EXCEPTION 'Réservé aux apprenants de l''atelier.'; END IF;
  SELECT * INTO l FROM public.rw_lessons WHERE id = _lesson AND status = 'published' AND level = me.level;
  IF l.id IS NULL THEN RAISE EXCEPTION 'Texte non disponible.'; END IF;
  q := l.questions -> _index;
  IF q IS NULL THEN RAISE EXCEPTION 'Question introuvable.'; END IF;
  a := left(trim(COALESCE(_answer,'')), 2000);
  IF a = '' THEN RAISE EXCEPTION 'Réponse vide.'; END IF;
  qt := COALESCE(q->>'type','mcq');
  SELECT * INTO existing FROM public.rw_answers WHERE learner_id = me.id AND lesson_id = l.id AND question_index = _index;
  IF existing.id IS NOT NULL AND (existing.status <> 'pending' OR qt IN ('mcq','true_false')) THEN
    RETURN to_jsonb(existing) || jsonb_build_object('explanation_fr', CASE WHEN existing.status <> 'pending' THEN q->>'explanation_fr' END, 'locked', true);
  END IF;
  IF qt IN ('mcq','true_false') THEN
    exp := q->>'answer';
    pts := CASE WHEN lower(a) = lower(trim(exp)) THEN 2 ELSE 0 END; st := 'auto_graded';
  ELSIF qt = 'short' AND jsonb_typeof(q->'accepted') = 'array' AND EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(q->'accepted') x WHERE lower(trim(x)) = lower(a)) THEN
    exp := q->>'answer'; pts := 2; st := 'auto_graded';
  ELSE
    exp := NULL; pts := NULL; st := 'pending';
  END IF;
  INSERT INTO public.rw_answers (learner_id, lesson_id, question_index, question_type, answer, expected, points, status)
  VALUES (me.id, l.id, _index, qt, a, exp, pts, st)
  ON CONFLICT (learner_id, lesson_id, question_index) DO UPDATE
    SET answer = excluded.answer, expected = excluded.expected, points = excluded.points, status = excluded.status, question_type = excluded.question_type, updated_at = now()
  RETURNING * INTO r;
  RETURN to_jsonb(r) || jsonb_build_object('explanation_fr', CASE WHEN st = 'auto_graded' THEN q->>'explanation_fr' END, 'locked', st <> 'pending');
END $$;

CREATE OR REPLACE FUNCTION public.rw_grade_answer(_answer uuid, _points integer, _comment text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.rw_answers; q jsonb;
BEGIN
  SELECT * INTO r FROM public.rw_answers WHERE id = _answer;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Réponse introuvable.'; END IF;
  IF NOT (public.rw_is_staff(auth.uid()) OR public.rw_coaches_learner(auth.uid(), r.learner_id)) THEN RAISE EXCEPTION 'Accès refusé.'; END IF;
  IF _points IS NULL OR _points NOT BETWEEN 0 AND 2 THEN RAISE EXCEPTION 'La note doit être 0, 1 ou 2.'; END IF;
  SELECT questions -> r.question_index INTO q FROM public.rw_lessons WHERE id = r.lesson_id;
  UPDATE public.rw_answers SET points = _points, coach_comment = NULLIF(left(trim(COALESCE(_comment,'')),2000),''),
    status = 'graded', graded_by = auth.uid(), graded_at = now(), expected = COALESCE(expected, q->>'answer'), updated_at = now()
  WHERE id = _answer RETURNING * INTO r;
  RETURN to_jsonb(r);
END $$;

REVOKE ALL ON FUNCTION public.rw_lesson_questions(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rw_save_answer(uuid, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rw_grade_answer(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rw_lesson_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rw_save_answer(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rw_grade_answer(uuid, integer, text) TO authenticated;

-- Hide raw questions (with answers) from direct reads; staff and members go through rw_lesson_questions.
REVOKE SELECT ON public.rw_lessons FROM authenticated, anon;
GRANT SELECT (id, session_id, level, title, body, word_count, source_author, source_title, source_date, source_institution, source_url, content_type, rights_status, mention, status, created_at, updated_at, summary_fr, translation_fr, knowledge_point, vocabulary, grammar, discussion, published_at, published_by) ON public.rw_lessons TO authenticated;