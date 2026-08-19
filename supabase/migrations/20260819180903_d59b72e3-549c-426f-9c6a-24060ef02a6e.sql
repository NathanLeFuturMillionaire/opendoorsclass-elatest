DROP FUNCTION IF EXISTS public.get_gamification_leaderboard(text, integer);
CREATE FUNCTION public.get_gamification_leaderboard(_scope text DEFAULT 'global', _limit integer DEFAULT 25)
RETURNS TABLE(rank integer, display_name text, country text, cefr_level text, total_xp integer, current_level integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT ug.user_id, ug.total_xp, ug.current_level,
           COALESCE(ug.display_country, p.country, p.nationality, 'Unknown') AS country,
           TRIM(COALESCE(p.first_name, '')) ||
             CASE WHEN p.last_name IS NOT NULL AND length(p.last_name) > 0
                  THEN ' ' || upper(substr(p.last_name, 1, 1)) || '.'
                  ELSE '' END AS display_name,
           (SELECT ts.level_result::text FROM public.test_sessions ts
             WHERE ts.user_id = ug.user_id AND ts.completed_at IS NOT NULL
             ORDER BY ts.score DESC NULLS LAST LIMIT 1) AS cefr_level
      FROM public.user_gamification ug
      JOIN public.profiles p ON p.id = ug.user_id
     WHERE ug.leaderboard_opt_in = true
       AND ug.total_xp > 0
  )
  SELECT ROW_NUMBER() OVER (ORDER BY f.total_xp DESC)::INT,
         COALESCE(NULLIF(f.display_name, ''), 'Anonymous'),
         f.country, f.cefr_level, f.total_xp, f.current_level
    FROM filtered f
   WHERE CASE _scope
           WHEN 'global' THEN true
           WHEN 'africa' THEN f.country IN ('GA','CD','CG','CI','SN','CM','BJ','TG','ML','BF','NE','TD','RW','GN','MR','MG','ZA','KE','NG','MA','TN','DZ','EG','ET','GH')
           ELSE f.country = _scope
         END
   ORDER BY f.total_xp DESC
   LIMIT COALESCE(_limit, 25);
END;
$$;

REVOKE ALL ON FUNCTION public.get_gamification_leaderboard(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_gamification_leaderboard(text, integer) TO authenticated;