CREATE OR REPLACE FUNCTION public.rw_save_answer(_lesson uuid, _index integer, _answer text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me public.rw_learners; l public.rw_lessons; q jsonb; qt text; a text; existing public.rw_answers; pts integer; st text; exp text; r public.rw_answers;
BEGIN
  me := public.rw_learner_row(auth.uid());
  IF me.id IS NULL THEN RAISE EXCEPTION 'Réservé aux apprenants de l''atelier.'; END IF;
  IF NOT public.rw_workshop_allows(auth.uid()) THEN RAISE EXCEPTION 'L''atelier est fermé pour le moment. Revenez aux heures d''ouverture.'; END IF;
  SELECT * INTO l FROM public.rw_lessons WHERE id = _lesson AND status = 'published' AND level = me.level;
  IF l.id IS NULL OR NOT public.rw_lesson_unlocked(me.id, l.id) THEN RAISE EXCEPTION 'Texte non disponible ou encore verrouillé.'; END IF;
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