CREATE OR REPLACE FUNCTION public.rw_trace_next_character(_sentence text, _from integer)
RETURNS integer LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE i integer := GREATEST(COALESCE(_from, 0), 0);
BEGIN
  WHILE i < length(_sentence) AND substring(_sentence FROM i + 1 FOR 1) ~ '[[:space:]]' LOOP
    i := i + 1;
  END LOOP;
  RETURN i;
END $$;

CREATE OR REPLACE FUNCTION public.rw_trace_record_attempt(
  _exercise uuid,
  _sentence_index integer,
  _character_index integer,
  _out_of_bounds boolean,
  _precision numeric,
  _coverage numeric,
  _stroke_coverage numeric,
  _duration_ms integer,
  _trace jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me public.rw_learners;
  ex public.rw_trace_exercises;
  previous public.rw_trace_characters;
  sentence text;
  expected text;
  next_index integer;
  accepted boolean;
  attempt_score numeric;
  done_count integer;
  total_count integer;
  average_score numeric;
  stroke jsonb;
  point jsonb;
  point_count integer;
BEGIN
  me := public.rw_learner_row(auth.uid());
  IF me.id IS NULL THEN RAISE EXCEPTION 'Réservé aux apprenants de l''atelier.'; END IF;
  IF NOT public.rw_workshop_allows(auth.uid()) THEN RAISE EXCEPTION 'L''atelier est fermé pour le moment. Revenez aux heures d''ouverture.'; END IF;
  SELECT * INTO ex FROM public.rw_trace_exercises WHERE id = _exercise AND learner_id = me.id FOR UPDATE;
  IF ex.id IS NULL THEN RAISE EXCEPTION 'Exercice introuvable.'; END IF;
  IF ex.status <> 'in_progress' THEN RAISE EXCEPTION 'Cet exercice est déjà terminé.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rw_lessons l WHERE l.id = ex.lesson_id AND l.status = 'published' AND l.level = me.level)
     OR NOT public.rw_lesson_unlocked(me.id, ex.lesson_id) THEN
    RAISE EXCEPTION 'Texte non disponible ou encore verrouillé.';
  END IF;
  IF _sentence_index <> ex.current_sentence OR _character_index <> ex.current_character THEN
    RAISE EXCEPTION 'Suivez les caractères dans l''ordre, sans en sauter.';
  END IF;
  sentence := ex.sentences ->> _sentence_index;
  IF sentence IS NULL OR _character_index <> public.rw_trace_next_character(sentence, _character_index) THEN
    RAISE EXCEPTION 'Caractère inattendu.';
  END IF;
  expected := substring(sentence FROM _character_index + 1 FOR 1);
  IF expected = '' OR expected ~ '[[:space:]]' THEN RAISE EXCEPTION 'Aucun caractère à tracer ici.'; END IF;
  IF _precision NOT BETWEEN 0 AND 100 OR _coverage NOT BETWEEN 0 AND 100 OR _stroke_coverage NOT BETWEEN 0 AND 100 THEN
    RAISE EXCEPTION 'Mesures de tracé invalides.';
  END IF;
  IF _duration_ms NOT BETWEEN 0 AND 120000 THEN RAISE EXCEPTION 'Durée de tentative invalide.'; END IF;
  IF _trace IS NULL OR jsonb_typeof(_trace) <> 'object' OR jsonb_typeof(_trace -> 'strokes') <> 'array'
     OR jsonb_array_length(_trace -> 'strokes') > 16 THEN
    RAISE EXCEPTION 'Format de tracé invalide.';
  END IF;
  SELECT COALESCE(sum(jsonb_array_length(value)), 0) INTO point_count FROM jsonb_array_elements(_trace -> 'strokes');
  IF point_count > 800 THEN RAISE EXCEPTION 'Le tracé contient trop de points.'; END IF;
  FOR stroke IN SELECT value FROM jsonb_array_elements(_trace -> 'strokes') LOOP
    IF jsonb_typeof(stroke) <> 'array' THEN RAISE EXCEPTION 'Trait invalide.'; END IF;
    FOR point IN SELECT value FROM jsonb_array_elements(stroke) LOOP
      IF jsonb_typeof(point) <> 'object'
         OR COALESCE(point ->> 'x', '') !~ '^-?[0-9]+([.][0-9]+)?$'
         OR COALESCE(point ->> 'y', '') !~ '^-?[0-9]+([.][0-9]+)?$'
         OR (point ->> 'x')::numeric NOT BETWEEN -0.25 AND 1.25
         OR (point ->> 'y')::numeric NOT BETWEEN -0.25 AND 1.25 THEN
        RAISE EXCEPTION 'Point de tracé invalide.';
      END IF;
    END LOOP;
  END LOOP;
  SELECT * INTO previous FROM public.rw_trace_characters
    WHERE exercise_id = ex.id AND sentence_index = _sentence_index AND character_index = _character_index;
  accepted := NOT COALESCE(_out_of_bounds, true) AND _precision >= 72 AND _coverage >= 58 AND _stroke_coverage >= 35 AND point_count > 1;
  attempt_score := CASE WHEN accepted THEN GREATEST(0, LEAST(100,
    _precision * 0.45 + _coverage * 0.45 + _stroke_coverage * 0.10 - LEAST(20, COALESCE(previous.attempts, 0) * 2)
  )) ELSE 0 END;
  INSERT INTO public.rw_trace_characters (
    exercise_id, learner_id, sentence_index, character_index, character, attempts, invalid_attempts,
    precision, coverage, stroke_coverage, score, duration_ms, trace, validated_at
  ) VALUES (
    ex.id, me.id, _sentence_index, _character_index, expected, 1, CASE WHEN accepted THEN 0 ELSE 1 END,
    _precision, _coverage, _stroke_coverage, attempt_score, _duration_ms, _trace,
    CASE WHEN accepted THEN now() ELSE NULL END
  )
  ON CONFLICT (exercise_id, sentence_index, character_index) DO UPDATE SET
    attempts = public.rw_trace_characters.attempts + 1,
    invalid_attempts = public.rw_trace_characters.invalid_attempts + CASE WHEN accepted THEN 0 ELSE 1 END,
    precision = EXCLUDED.precision, coverage = EXCLUDED.coverage, stroke_coverage = EXCLUDED.stroke_coverage,
    score = EXCLUDED.score, duration_ms = public.rw_trace_characters.duration_ms + EXCLUDED.duration_ms,
    trace = EXCLUDED.trace, validated_at = EXCLUDED.validated_at;
  IF NOT accepted THEN
    UPDATE public.rw_trace_exercises SET total_attempts = total_attempts + 1,
      invalid_attempts = invalid_attempts + 1, total_duration_ms = total_duration_ms + _duration_ms
    WHERE id = ex.id RETURNING * INTO ex;
    RETURN to_jsonb(ex) || jsonb_build_object('accepted', false, 'completed', false, 'expected', expected);
  END IF;
  next_index := public.rw_trace_next_character(sentence, _character_index + 1);
  SELECT count(*), avg(score) INTO done_count, average_score FROM public.rw_trace_characters
    WHERE exercise_id = ex.id AND validated_at IS NOT NULL;
  SELECT COALESCE(sum(length(regexp_replace(value, '[[:space:]]', '', 'g'))), 0) INTO total_count
    FROM jsonb_array_elements_text(ex.sentences);
  IF done_count = total_count THEN
    UPDATE public.rw_trace_exercises SET status = 'completed', score = average_score,
      completed_at = now(), total_attempts = total_attempts + 1,
      total_duration_ms = total_duration_ms + _duration_ms
    WHERE id = ex.id RETURNING * INTO ex;
  ELSIF next_index >= length(sentence) THEN
    UPDATE public.rw_trace_exercises SET current_sentence = _sentence_index + 1,
      current_character = public.rw_trace_next_character(ex.sentences ->> (_sentence_index + 1), 0),
      total_attempts = total_attempts + 1, total_duration_ms = total_duration_ms + _duration_ms
    WHERE id = ex.id RETURNING * INTO ex;
  ELSE
    UPDATE public.rw_trace_exercises SET current_character = next_index,
      total_attempts = total_attempts + 1, total_duration_ms = total_duration_ms + _duration_ms
    WHERE id = ex.id RETURNING * INTO ex;
  END IF;
  RETURN to_jsonb(ex) || jsonb_build_object('accepted', true, 'completed', ex.status = 'completed', 'expected', expected);
END $$;

REVOKE ALL ON FUNCTION public.rw_trace_next_character(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rw_trace_record_attempt(uuid, integer, integer, boolean, numeric, numeric, numeric, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rw_trace_record_attempt(uuid, integer, integer, boolean, numeric, numeric, numeric, integer, jsonb) TO authenticated, service_role;
