CREATE OR REPLACE FUNCTION public.rw_send_weekly_report(_learner uuid, _week_start date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l public.rw_learners;
  coach_uid uuid;
  start_ts timestamptz;
  end_ts timestamptz;
  validated_count integer := 0;
  average_score numeric;
  pending_count integer := 0;
  redo_count integer := 0;
  report_key text;
  report_message text;
  recipient record;
  sent_count integer := 0;
  existing_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise.';
  END IF;
  IF _week_start IS NULL OR extract(isodow FROM _week_start) <> 1 THEN
    RAISE EXCEPTION 'La semaine doit commencer un lundi.';
  END IF;
  IF _week_start > (now() AT TIME ZONE 'Africa/Libreville')::date THEN
    RAISE EXCEPTION 'Cette semaine n''a pas encore commencé.';
  END IF;
  SELECT * INTO l FROM public.rw_learners WHERE id = _learner;
  IF l.id IS NULL THEN
    RAISE EXCEPTION 'Apprenant introuvable.';
  END IF;
  IF NOT (public.rw_is_staff(auth.uid()) OR public.rw_coaches_learner(auth.uid(), _learner)) THEN
    RAISE EXCEPTION 'Vous ne pouvez envoyer que le bilan de vos apprenants.';
  END IF;

  start_ts := _week_start::timestamp AT TIME ZONE 'Africa/Libreville';
  end_ts := (_week_start + 7)::timestamp AT TIME ZONE 'Africa/Libreville';

  SELECT count(DISTINCT lesson_id) INTO validated_count
  FROM public.rw_submissions
  WHERE learner_id = _learner AND status = 'validated'
    AND COALESCE(reviewed_at, updated_at, created_at) >= start_ts
    AND COALESCE(reviewed_at, updated_at, created_at) < end_ts;

  SELECT round(avg(score)::numeric, 1) INTO average_score
  FROM public.rw_submissions
  WHERE learner_id = _learner AND status = 'validated' AND score IS NOT NULL
    AND COALESCE(reviewed_at, updated_at, created_at) >= start_ts
    AND COALESCE(reviewed_at, updated_at, created_at) < end_ts;

  SELECT count(DISTINCT s.lesson_id) INTO pending_count
  FROM public.rw_submissions s
  WHERE s.learner_id = _learner AND s.status = 'submitted'
    AND NOT EXISTS (
      SELECT 1 FROM public.rw_submissions v
      WHERE v.learner_id = s.learner_id AND v.lesson_id = s.lesson_id AND v.status = 'validated'
    );

  SELECT count(DISTINCT s.lesson_id) INTO redo_count
  FROM public.rw_submissions s
  WHERE s.learner_id = _learner AND s.status = 'redo'
    AND NOT EXISTS (
      SELECT 1 FROM public.rw_submissions v
      WHERE v.learner_id = s.learner_id AND v.lesson_id = s.lesson_id AND v.status = 'validated'
    );

  SELECT user_id INTO coach_uid FROM public.rw_coaches WHERE id = l.coach_id AND is_active;
  report_key := _learner::text || ':' || _week_start::text;
  report_message := validated_count || ' lecture' || CASE WHEN validated_count > 1 THEN 's' ELSE '' END
    || ' validée' || CASE WHEN validated_count > 1 THEN 's' ELSE '' END
    || ', ' || COALESCE('moyenne ' || average_score::text || '/20', 'pas encore de moyenne')
    || ', ' || pending_count || ' en attente et ' || redo_count || ' reprise' || CASE WHEN redo_count > 1 THEN 's' ELSE '' END || '.';

  FOR recipient IN
    SELECT l.user_id AS uid, 'learner'::text AS audience WHERE l.user_id IS NOT NULL
    UNION ALL
    SELECT coach_uid AS uid, 'coach'::text AS audience WHERE coach_uid IS NOT NULL AND coach_uid IS DISTINCT FROM l.user_id
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = recipient.uid AND related_entity_type = 'rw_weekly_report' AND related_entity_id = report_key
    ) THEN
      existing_count := existing_count + 1;
    ELSE
      INSERT INTO public.notifications(
        user_id, title, message, type, category, icon, action_url, action_label,
        related_entity_type, related_entity_id
      ) VALUES (
        recipient.uid,
        CASE WHEN recipient.audience = 'learner' THEN 'Votre bilan hebdomadaire' ELSE 'Bilan hebdomadaire de ' || l.full_name END,
        'Semaine du ' || to_char(_week_start, 'DD/MM/YYYY') || ' : ' || report_message,
        'info', 'reading_workshop', 'bar-chart',
        CASE WHEN recipient.audience = 'learner' THEN '/reading-workshop/learner' ELSE '/reading-workshop/coach' END,
        'Voir le rapport', 'rw_weekly_report', report_key
      );
      sent_count := sent_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'sent', sent_count,
    'already_sent', existing_count,
    'validated', validated_count,
    'average', average_score,
    'pending', pending_count,
    'redo', redo_count
  );
END $$;

REVOKE ALL ON FUNCTION public.rw_send_weekly_report(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rw_send_weekly_report(uuid, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rw_badge_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l public.rw_learners;
  validated_count integer;
  score_count integer;
  average_score numeric;
  badge_id text;
  badge_title text;
  badge_message text;
BEGIN
  IF NEW.status <> 'validated' OR (TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status) THEN
    RETURN NEW;
  END IF;
  SELECT * INTO l FROM public.rw_learners WHERE id = NEW.learner_id;
  IF l.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(DISTINCT lesson_id) INTO validated_count
  FROM public.rw_submissions WHERE learner_id = NEW.learner_id AND status = 'validated';

  badge_id := CASE validated_count
    WHEN 1 THEN 'first'
    WHEN 10 THEN 'ten'
    WHEN 30 THEN 'thirty'
    WHEN 60 THEN 'half'
    WHEN 120 THEN 'full'
    ELSE NULL
  END;
  IF badge_id IS NOT NULL THEN
    badge_title := CASE badge_id
      WHEN 'first' THEN 'Premiers pas'
      WHEN 'ten' THEN 'Lecteur régulier'
      WHEN 'thirty' THEN 'Cap des 30'
      WHEN 'half' THEN 'Mi-parcours'
      ELSE 'Programme accompli'
    END;
    badge_message := 'Vous avez obtenu le badge ' || badge_title || ' avec ' || validated_count || ' lecture' || CASE WHEN validated_count > 1 THEN 's' ELSE '' END || ' validée' || CASE WHEN validated_count > 1 THEN 's' ELSE '' END || '.';
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = l.user_id AND related_entity_type = 'rw_badge'
        AND related_entity_id = NEW.learner_id::text || ':' || badge_id
    ) THEN
      INSERT INTO public.notifications(user_id, title, message, type, category, icon, action_url, action_label, related_entity_type, related_entity_id)
      VALUES (l.user_id, 'Nouveau badge : ' || badge_title, badge_message, 'success', 'reading_workshop', 'award', '/reading-workshop/learner', 'Voir mes badges', 'rw_badge', NEW.learner_id::text || ':' || badge_id);
    END IF;
  END IF;

  SELECT count(score), round(avg(score)::numeric, 1) INTO score_count, average_score
  FROM public.rw_submissions WHERE learner_id = NEW.learner_id AND score IS NOT NULL;
  IF score_count >= 5 AND average_score >= 16 AND NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = l.user_id AND related_entity_type = 'rw_badge'
      AND related_entity_id = NEW.learner_id::text || ':bright'
  ) THEN
    INSERT INTO public.notifications(user_id, title, message, type, category, icon, action_url, action_label, related_entity_type, related_entity_id)
    VALUES (l.user_id, 'Nouveau badge : Voix brillante', 'Votre moyenne de ' || average_score::text || '/20 sur ' || score_count || ' notes vous ouvre le badge Voix brillante.', 'success', 'reading_workshop', 'award', '/reading-workshop/learner', 'Voir mes badges', 'rw_badge', NEW.learner_id::text || ':bright');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER rw_submissions_badge_notify
AFTER INSERT OR UPDATE OF status ON public.rw_submissions
FOR EACH ROW EXECUTE FUNCTION public.rw_badge_notify();

REVOKE ALL ON FUNCTION public.rw_badge_notify() FROM PUBLIC, anon, authenticated;