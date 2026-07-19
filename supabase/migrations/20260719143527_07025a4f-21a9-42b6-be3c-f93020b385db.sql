-- Revoke default PUBLIC EXECUTE on all our SECURITY DEFINER functions.
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_test_session() FROM PUBLIC, anon;

-- has_role: needed by RLS policies as authenticated user.
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, anon;

-- start_test_session: only signed-in users start a test.
GRANT EXECUTE ON FUNCTION public.start_test_session() TO authenticated;

-- update_updated_at_column and handle_new_user run as triggers; service_role only.
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;