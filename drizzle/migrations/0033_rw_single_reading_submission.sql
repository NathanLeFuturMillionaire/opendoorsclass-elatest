CREATE OR REPLACE FUNCTION public.rw_submission_single_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.rw_is_staff(auth.uid()) THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.learner_id::text || ':' || NEW.lesson_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.rw_submissions WHERE learner_id = NEW.learner_id AND lesson_id = NEW.lesson_id) THEN
    RAISE EXCEPTION 'Vous avez déjà envoyé votre lecture pour ce texte.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.rw_submission_single_guard() FROM anon, public;
CREATE TRIGGER rw_submissions_single_guard BEFORE INSERT ON public.rw_submissions
FOR EACH ROW EXECUTE FUNCTION public.rw_submission_single_guard();