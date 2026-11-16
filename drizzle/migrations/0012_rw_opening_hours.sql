CREATE TABLE public.rw_schedule_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  open_time time NOT NULL DEFAULT '12:30',
  close_time time NOT NULL DEFAULT '22:30',
  days integer[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  closed_message text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (open_time < close_time)
);
INSERT INTO public.rw_schedule_settings (id) VALUES (true);
GRANT SELECT ON public.rw_schedule_settings TO authenticated;
GRANT ALL ON public.rw_schedule_settings TO service_role;
ALTER TABLE public.rw_schedule_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rw members read schedule" ON public.rw_schedule_settings FOR SELECT TO authenticated USING (true);

CREATE TABLE public.rw_schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('open','closed')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  message text,
  cancelled_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
GRANT SELECT ON public.rw_schedule_exceptions TO authenticated;
GRANT ALL ON public.rw_schedule_exceptions TO service_role;
ALTER TABLE public.rw_schedule_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rw staff read exceptions" ON public.rw_schedule_exceptions FOR SELECT TO authenticated USING (public.rw_is_staff(auth.uid()));

CREATE TABLE public.rw_schedule_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rw_schedule_log TO authenticated;
GRANT ALL ON public.rw_schedule_log TO service_role;
ALTER TABLE public.rw_schedule_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rw staff read schedule log" ON public.rw_schedule_log FOR SELECT TO authenticated USING (public.rw_is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.rw_workshop_open_at(_ts timestamptz)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.rw_schedule_settings; ex text; loc timestamp;
BEGIN
  SELECT kind INTO ex FROM public.rw_schedule_exceptions
   WHERE cancelled_at IS NULL AND _ts >= starts_at AND _ts < ends_at ORDER BY created_at DESC LIMIT 1;
  IF ex IS NOT NULL THEN RETURN ex = 'open'; END IF;
  SELECT * INTO s FROM public.rw_schedule_settings LIMIT 1;
  loc := _ts AT TIME ZONE 'Africa/Libreville';
  RETURN extract(isodow FROM loc)::int = ANY (s.days) AND loc::time >= s.open_time AND loc::time < s.close_time;
END $$;

CREATE OR REPLACE FUNCTION public.rw_workshop_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.rw_schedule_settings; n timestamptz := now(); is_open boolean; nxt timestamptz; cls timestamptz; msg text; c timestamptz;
BEGIN
  SELECT * INTO s FROM public.rw_schedule_settings LIMIT 1;
  is_open := public.rw_workshop_open_at(n);
  SELECT message INTO msg FROM public.rw_schedule_exceptions
   WHERE cancelled_at IS NULL AND n >= starts_at AND n < ends_at ORDER BY created_at DESC LIMIT 1;
  FOR c IN
    SELECT x FROM (
      SELECT ((d::date + s.open_time) AT TIME ZONE 'Africa/Libreville') AS x FROM generate_series((n AT TIME ZONE 'Africa/Libreville')::date, (n AT TIME ZONE 'Africa/Libreville')::date + 15, interval '1 day') d
      UNION SELECT ((d::date + s.close_time) AT TIME ZONE 'Africa/Libreville') FROM generate_series((n AT TIME ZONE 'Africa/Libreville')::date, (n AT TIME ZONE 'Africa/Libreville')::date + 15, interval '1 day') d
      UNION SELECT starts_at FROM public.rw_schedule_exceptions WHERE cancelled_at IS NULL AND ends_at > n
      UNION SELECT ends_at FROM public.rw_schedule_exceptions WHERE cancelled_at IS NULL AND ends_at > n
    ) b WHERE x > n ORDER BY x
  LOOP
    IF public.rw_workshop_open_at(c) <> is_open THEN
      IF is_open THEN cls := c; ELSE nxt := c; END IF;
      EXIT;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('open', is_open, 'now', n, 'next_open', nxt, 'closes_at', cls,
    'message', COALESCE(msg, CASE WHEN NOT is_open THEN s.closed_message END),
    'open_time', to_char(s.open_time, 'HH24"h"MI'), 'close_time', to_char(s.close_time, 'HH24"h"MI'), 'days', s.days);
END $$;

CREATE OR REPLACE FUNCTION public.rw_workshop_allows(_uid uuid, _grace boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.rw_is_staff(_uid) OR public.rw_coach_id(_uid) IS NOT NULL
    OR public.rw_workshop_open_at(now())
    OR (_grace AND public.rw_workshop_open_at(now() - interval '60 minutes'))
$$;

CREATE OR REPLACE FUNCTION public.rw_schedule_update(_open time, _close time, _days integer[], _message text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.rw_is_staff(auth.uid()) THEN RAISE EXCEPTION 'Réservé aux administrateurs.'; END IF;
  IF _open >= _close THEN RAISE EXCEPTION 'L''heure d''ouverture doit précéder la fermeture.'; END IF;
  IF _days IS NULL OR cardinality(_days) = 0 OR NOT (_days <@ ARRAY[1,2,3,4,5,6,7]) THEN RAISE EXCEPTION 'Jours invalides.'; END IF;
  UPDATE public.rw_schedule_settings SET open_time = _open, close_time = _close, days = _days,
    closed_message = NULLIF(trim(COALESCE(_message,'')), ''), updated_by = auth.uid(), updated_at = now() WHERE id;
  INSERT INTO public.rw_schedule_log(action, details, actor) VALUES ('horaires', jsonb_build_object('open', _open, 'close', _close, 'days', _days, 'message', _message), auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.rw_schedule_add_exception(_kind text, _starts timestamptz, _ends timestamptz, _message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i uuid;
BEGIN
  IF NOT public.rw_is_staff(auth.uid()) THEN RAISE EXCEPTION 'Réservé aux administrateurs.'; END IF;
  IF _kind NOT IN ('open','closed') THEN RAISE EXCEPTION 'Type invalide.'; END IF;
  IF _ends <= _starts THEN RAISE EXCEPTION 'La fin doit suivre le début.'; END IF;
  INSERT INTO public.rw_schedule_exceptions(kind, starts_at, ends_at, message, created_by)
  VALUES (_kind, _starts, _ends, NULLIF(trim(COALESCE(_message,'')), ''), auth.uid()) RETURNING id INTO i;
  INSERT INTO public.rw_schedule_log(action, details, actor) VALUES (CASE WHEN _kind='open' THEN 'ouverture exceptionnelle' ELSE 'fermeture exceptionnelle' END,
    jsonb_build_object('id', i, 'starts_at', _starts, 'ends_at', _ends, 'message', _message), auth.uid());
  RETURN i;
END $$;

CREATE OR REPLACE FUNCTION public.rw_schedule_cancel_exception(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.rw_is_staff(auth.uid()) THEN RAISE EXCEPTION 'Réservé aux administrateurs.'; END IF;
  UPDATE public.rw_schedule_exceptions SET cancelled_at = now() WHERE id = _id AND cancelled_at IS NULL;
  INSERT INTO public.rw_schedule_log(action, details, actor) VALUES ('exception annulée', jsonb_build_object('id', _id), auth.uid());
END $$;

REVOKE ALL ON FUNCTION public.rw_workshop_open_at(timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rw_workshop_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rw_workshop_allows(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rw_schedule_update(time, time, integer[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rw_schedule_add_exception(text, timestamptz, timestamptz, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rw_schedule_cancel_exception(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rw_workshop_open_at(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rw_workshop_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rw_workshop_allows(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rw_schedule_update(time, time, integer[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rw_schedule_add_exception(text, timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rw_schedule_cancel_exception(uuid) TO authenticated;

DROP POLICY "rw learner reads unlocked lessons" ON public.rw_lessons;
CREATE POLICY "rw learner reads unlocked lessons" ON public.rw_lessons FOR SELECT TO authenticated
  USING (status = 'published' AND level = (public.rw_learner_row(auth.uid())).level
    AND public.rw_workshop_allows(auth.uid())
    AND public.rw_lesson_unlocked((public.rw_learner_row(auth.uid())).id, id));

CREATE OR REPLACE FUNCTION public.rw_submission_insert_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.rw_is_staff(auth.uid()) THEN
    IF NOT public.rw_workshop_allows(auth.uid(), true) THEN
      RAISE EXCEPTION 'L''atelier est fermé pour le moment. Revenez aux heures d''ouverture.';
    END IF;
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

CREATE OR REPLACE FUNCTION public.rw_save_answer(_lesson uuid, _index integer, _answer text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me public.rw_learners; l public.rw_lessons; q jsonb; qt text; a text; existing public.rw_answers; pts integer; st text; exp text; r public.rw_answers;
BEGIN
  me := public.rw_learner_row(auth.uid());
  IF me.id IS NULL THEN RAISE EXCEPTION 'Réservé aux apprenants de l''atelier.'; END IF;
  IF NOT public.rw_workshop_open_at(now()) THEN RAISE EXCEPTION 'L''atelier est fermé pour le moment. Revenez aux heures d''ouverture.'; END IF;
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