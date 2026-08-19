-- 1. search_path hardening
CREATE OR REPLACE FUNCTION public.protect_owner_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
  IF OLD.role = 'owner' THEN
    RAISE EXCEPTION 'Le rôle propriétaire ne peut pas être modifié ou supprimé.';
  END IF;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.compute_open_doors_level(_xp integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $function$
  SELECT CASE
    WHEN _xp >= 7500 THEN 9
    WHEN _xp >= 5500 THEN 8
    WHEN _xp >= 4000 THEN 7
    WHEN _xp >= 2800 THEN 6
    WHEN _xp >= 1800 THEN 5
    WHEN _xp >= 1000 THEN 4
    WHEN _xp >= 500  THEN 3
    WHEN _xp >= 200  THEN 2
    ELSE 1
  END
$function$;

-- 2. Revoke EXECUTE on all public SECURITY DEFINER functions from anon/authenticated
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 3. Re-grant only the RPCs the app calls as a signed-in user
GRANT EXECUTE ON FUNCTION public.start_test_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_assessment_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.abandon_assessment_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_gamification_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_gamification_leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_gamification_admin_overview(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_leaderboard_opt_in(boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

-- 4. Reviews: remove public (anon) read access; server serves the carousel
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON public.reviews;
REVOKE SELECT ON public.reviews FROM anon;
CREATE POLICY "Authenticated read approved reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (status = 'approved');

-- 5. Avatars: owner-scoped read only; public display uses signed URLs
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
CREATE POLICY "Users read own avatar"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
