CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'moderator')) THEN
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