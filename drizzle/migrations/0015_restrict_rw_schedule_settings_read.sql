DROP POLICY IF EXISTS "rw members read schedule" ON public.rw_schedule_settings;
CREATE POLICY "rw members read schedule" ON public.rw_schedule_settings
FOR SELECT TO authenticated
USING (
  public.rw_is_staff(auth.uid())
  OR public.rw_coach_id(auth.uid()) IS NOT NULL
  OR EXISTS (SELECT 1 FROM public.rw_learners l WHERE l.user_id = auth.uid() AND l.is_active)
);