DROP POLICY "rw coach reads assigned work" ON storage.objects;
CREATE OR REPLACE FUNCTION public.rw_coaches_learner_folder(_uid uuid, _folder text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.rw_learners l JOIN public.rw_coaches c ON c.id = l.coach_id
    WHERE l.id::text = _folder AND c.user_id = _uid AND c.is_active)
$$;
REVOKE EXECUTE ON FUNCTION public.rw_coaches_learner_folder(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rw_coaches_learner_folder(uuid, text) TO authenticated, service_role;
CREATE POLICY "rw coach reads assigned work" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rw-submissions' AND public.rw_coaches_learner_folder(auth.uid(), (storage.foldername(name))[1]));