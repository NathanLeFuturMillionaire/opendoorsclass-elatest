CREATE TABLE public.rw_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL UNIQUE REFERENCES public.rw_learners(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL CHECK (char_length(btrim(comment)) BETWEEN 10 AND 600),
  would_recommend boolean NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.rw_reviews TO authenticated;
GRANT ALL ON public.rw_reviews TO service_role;
ALTER TABLE public.rw_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage reviews" ON public.rw_reviews FOR ALL TO authenticated
  USING (public.rw_is_staff(auth.uid())) WITH CHECK (public.rw_is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.rw_review_status() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'readings', (SELECT count(DISTINCT s.lesson_id) FROM public.rw_submissions s WHERE s.learner_id = l.id),
    'reviewed', EXISTS (SELECT 1 FROM public.rw_reviews r WHERE r.learner_id = l.id))
  FROM public.rw_learners l WHERE l.user_id = auth.uid() AND l.is_active LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.rw_submit_review(_rating int, _comment text, _recommend boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lid uuid;
BEGIN
  SELECT id INTO _lid FROM public.rw_learners WHERE user_id = auth.uid() AND is_active LIMIT 1;
  IF _lid IS NULL THEN RAISE EXCEPTION 'Espace apprenant introuvable.'; END IF;
  IF (SELECT count(DISTINCT lesson_id) FROM public.rw_submissions WHERE learner_id = _lid) < 3 THEN
    RAISE EXCEPTION 'Votre avis sera possible après votre 3e lecture.';
  END IF;
  INSERT INTO public.rw_reviews(learner_id, rating, comment, would_recommend)
  VALUES (_lid, _rating, btrim(_comment), _recommend)
  ON CONFLICT (learner_id) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.rw_public_reviews() RETURNS TABLE(id uuid, display_name text, level text, rating smallint, comment text, would_recommend boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id,
    split_part(btrim(l.full_name), ' ', 1) || COALESCE(' ' || NULLIF(left(split_part(btrim(l.full_name), ' ', 2), 1), '') || '.', ''),
    l.level::text, r.rating, r.comment, r.would_recommend, r.created_at
  FROM public.rw_reviews r JOIN public.rw_learners l ON l.id = r.learner_id
  WHERE r.is_visible ORDER BY r.created_at DESC LIMIT 24
$$;
REVOKE EXECUTE ON FUNCTION public.rw_review_status(), public.rw_submit_review(int, text, boolean), public.rw_public_reviews() FROM public;
GRANT EXECUTE ON FUNCTION public.rw_review_status(), public.rw_submit_review(int, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rw_public_reviews() TO anon, authenticated;