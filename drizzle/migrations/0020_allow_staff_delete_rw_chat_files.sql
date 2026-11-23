CREATE POLICY "rw chat staff delete files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'rw-chat' AND public.rw_is_staff(auth.uid()));