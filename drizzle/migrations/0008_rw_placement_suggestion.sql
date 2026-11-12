CREATE OR REPLACE FUNCTION public.rw_placement_suggestion(_email text)
RETURNS TABLE(level text, tested_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Staff only: never exposes placement results to other learners.
  IF NOT public.rw_is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs.';
  END IF;
  RETURN QUERY
  SELECT CASE WHEN t.level_result::text = 'C2' THEN 'C1' ELSE t.level_result::text END,
         t.completed_at
  FROM public.test_sessions t
  JOIN auth.users u ON u.id = t.user_id
  WHERE lower(u.email) = lower(trim(_email))
    AND t.language = 'en' AND t.status = 'completed' AND t.level_result IS NOT NULL
  ORDER BY t.completed_at DESC NULLS LAST
  LIMIT 1;
END $$;
REVOKE EXECUTE ON FUNCTION public.rw_placement_suggestion(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rw_placement_suggestion(text) TO authenticated, service_role;