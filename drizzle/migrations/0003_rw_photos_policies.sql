CREATE POLICY "rw staff upload photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rw-photos' AND public.rw_is_staff(auth.uid()));
CREATE POLICY "rw staff update photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'rw-photos' AND public.rw_is_staff(auth.uid()));
CREATE POLICY "rw staff delete photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'rw-photos' AND public.rw_is_staff(auth.uid()));
CREATE POLICY "rw staff read photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rw-photos' AND public.rw_is_staff(auth.uid()));