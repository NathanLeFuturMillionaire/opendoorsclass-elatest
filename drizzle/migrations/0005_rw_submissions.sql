CREATE TYPE public.rw_submission_status AS ENUM ('submitted','redo','validated');
CREATE TABLE public.rw_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES public.rw_learners(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.rw_lessons(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('audio','video')),
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  learner_note text,
  status public.rw_submission_status NOT NULL DEFAULT 'submitted',
  coach_feedback text,
  score int CHECK (score BETWEEN 0 AND 20),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rw_submissions_learner_idx ON public.rw_submissions(learner_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.rw_submissions TO authenticated;
GRANT ALL ON public.rw_submissions TO service_role;
ALTER TABLE public.rw_submissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rw_coaches_learner(_uid uuid, _learner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.rw_learners l JOIN public.rw_coaches c ON c.id = l.coach_id
    WHERE l.id = _learner AND c.user_id = _uid AND c.is_active)
$$;
REVOKE EXECUTE ON FUNCTION public.rw_coaches_learner(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rw_coaches_learner(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "rw staff all submissions" ON public.rw_submissions FOR ALL TO authenticated
  USING (public.rw_is_staff(auth.uid())) WITH CHECK (public.rw_is_staff(auth.uid()));
CREATE POLICY "rw learner reads own submissions" ON public.rw_submissions FOR SELECT TO authenticated
  USING (learner_id = (public.rw_learner_row(auth.uid())).id);
CREATE POLICY "rw learner creates own submission" ON public.rw_submissions FOR INSERT TO authenticated
  WITH CHECK (learner_id = (public.rw_learner_row(auth.uid())).id AND status = 'submitted'
    AND coach_feedback IS NULL AND score IS NULL AND reviewed_by IS NULL
    AND storage_path LIKE learner_id::text || '/%');
CREATE POLICY "rw coach reads assigned submissions" ON public.rw_submissions FOR SELECT TO authenticated
  USING (public.rw_coaches_learner(auth.uid(), learner_id));
CREATE POLICY "rw coach reviews assigned submissions" ON public.rw_submissions FOR UPDATE TO authenticated
  USING (public.rw_coaches_learner(auth.uid(), learner_id))
  WITH CHECK (public.rw_coaches_learner(auth.uid(), learner_id));

-- Coaches may only change review fields.
CREATE OR REPLACE FUNCTION public.rw_submission_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.rw_is_staff(auth.uid()) AND auth.uid() IS NOT NULL THEN
    IF NEW.learner_id <> OLD.learner_id OR NEW.lesson_id <> OLD.lesson_id OR NEW.storage_path <> OLD.storage_path
       OR NEW.kind <> OLD.kind OR NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Modification non autorisée';
    END IF;
  END IF;
  NEW.updated_at := now();
  IF NEW.status <> OLD.status THEN NEW.reviewed_at := now(); NEW.reviewed_by := auth.uid(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rw_submissions_guard BEFORE UPDATE ON public.rw_submissions FOR EACH ROW EXECUTE FUNCTION public.rw_submission_guard();

-- In-app notifications to coach on new work and to learner on review.
CREATE OR REPLACE FUNCTION public.rw_submission_notify() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; coach_uid uuid; t text;
BEGIN
  SELECT * INTO l FROM public.rw_learners WHERE id = NEW.learner_id;
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO coach_uid FROM public.rw_coaches WHERE id = l.coach_id;
    IF coach_uid IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, message, type, category, action_url, action_label, related_entity_type, related_entity_id)
      VALUES (coach_uid, 'Nouveau travail à corriger', l.full_name || ' a envoyé une lecture ' || CASE WHEN NEW.kind='video' THEN 'vidéo' ELSE 'audio' END || '.',
        'info', 'reading_workshop', '/reading-workshop/coach', 'Corriger', 'rw_submission', NEW.id::text);
    END IF;
  ELSIF NEW.status <> OLD.status AND l.user_id IS NOT NULL THEN
    t := CASE WHEN NEW.status = 'validated' THEN 'Lecture validée' ELSE 'Votre coach demande une reprise' END;
    INSERT INTO public.notifications(user_id, title, message, type, category, action_url, action_label, related_entity_type, related_entity_id)
    VALUES (l.user_id, t, COALESCE(NULLIF(NEW.coach_feedback, ''), 'Consultez le retour de votre coach.'),
      CASE WHEN NEW.status='validated' THEN 'success' ELSE 'warning' END, 'reading_workshop', '/reading-workshop/learner', 'Voir', 'rw_submission', NEW.id::text);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rw_submissions_notify AFTER INSERT OR UPDATE ON public.rw_submissions FOR EACH ROW EXECUTE FUNCTION public.rw_submission_notify();

CREATE POLICY "rw learner uploads own work" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rw-submissions' AND (storage.foldername(name))[1] = ((public.rw_learner_row(auth.uid())).id)::text);
CREATE POLICY "rw learner reads own work" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rw-submissions' AND (storage.foldername(name))[1] = ((public.rw_learner_row(auth.uid())).id)::text);
CREATE POLICY "rw coach reads assigned work" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rw-submissions' AND public.rw_coaches_learner(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "rw staff reads work" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rw-submissions' AND public.rw_is_staff(auth.uid()));