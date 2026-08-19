
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats(_actor uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF _actor IS NULL OR NOT (public.has_role(_actor, 'admin') OR public.has_role(_actor, 'owner') OR public.has_role(_actor, 'moderator')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total_candidates', (SELECT COUNT(*) FROM public.profiles),
    'total_tests', (SELECT COUNT(*) FROM public.test_sessions),
    'completed_tests', (SELECT COUNT(*) FROM public.test_sessions WHERE completed_at IS NOT NULL),
    'total_reviews', (SELECT COUNT(*) FROM public.reviews),
    'pending_reviews', (SELECT COUNT(*) FROM public.reviews WHERE status = 'pending'),
    'approved_reviews', (SELECT COUNT(*) FROM public.reviews WHERE status = 'approved'),
    'certificates', (SELECT COUNT(*) FROM public.test_sessions WHERE completed_at IS NOT NULL AND level_result IS NOT NULL),
    'level_distribution', (
      SELECT COALESCE(jsonb_object_agg(level_result, cnt), '{}'::jsonb)
      FROM (
        SELECT level_result, COUNT(*) AS cnt
        FROM public.test_sessions
        WHERE level_result IS NOT NULL
        GROUP BY level_result
      ) s
    ),
    'countries', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('country', country, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT COALESCE(NULLIF(upper(country), ''), NULLIF(nationality, ''), 'Inconnu') AS country, COUNT(*) AS cnt
        FROM public.profiles
        GROUP BY 1
        ORDER BY cnt DESC
        LIMIT 30
      ) c
    ),
    'tests_by_day', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', day, 'count', cnt) ORDER BY day), '[]'::jsonb)
      FROM (
        SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS day, COUNT(*) AS cnt
        FROM public.test_sessions
        WHERE started_at > now() - interval '30 days'
        GROUP BY 1
        ORDER BY 1
      ) d
    )
  ) INTO result;
  RETURN result;
END;
$function$;

DROP FUNCTION IF EXISTS public.admin_dashboard_stats();

CREATE OR REPLACE FUNCTION public.get_gamification_admin_overview(_limit integer DEFAULT 20, _actor uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result JSONB;
BEGIN
  IF _actor IS NULL OR NOT (public.has_role(_actor, 'admin') OR public.has_role(_actor, 'owner') OR public.has_role(_actor, 'moderator')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT jsonb_build_object(
    'total_xp_awarded', COALESCE((SELECT SUM(amount) FROM public.xp_transactions), 0),
    'total_badges_unlocked', (SELECT COUNT(*) FROM public.user_badges),
    'top_users', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', ug.user_id,
        'first_name', p.first_name, 'last_name', p.last_name,
        'total_xp', ug.total_xp, 'current_level', ug.current_level,
        'badges', (SELECT COUNT(*) FROM public.user_badges ub WHERE ub.user_id = ug.user_id)
      ) ORDER BY ug.total_xp DESC)
      FROM (SELECT * FROM public.user_gamification ORDER BY total_xp DESC LIMIT _limit) ug
      JOIN public.profiles p ON p.id = ug.user_id
    ), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_gamification_admin_overview(integer);

REVOKE ALL ON FUNCTION public.admin_dashboard_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_gamification_admin_overview(integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_gamification_admin_overview(integer, uuid) TO service_role;
