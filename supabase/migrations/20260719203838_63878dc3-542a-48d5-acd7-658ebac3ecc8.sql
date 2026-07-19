
-- Auto-assign owner role for the platform owner
CREATE OR REPLACE FUNCTION public.grant_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) = 'misterntkofficiel2.0@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_owner ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_owner
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_owner_role();

DROP TRIGGER IF EXISTS on_auth_user_updated_grant_owner ON auth.users;
CREATE TRIGGER on_auth_user_updated_grant_owner
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_owner_role();

-- Backfill: si l'utilisateur existe déjà, lui attribuer le rôle owner
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users
  WHERE lower(email) = 'misterntkofficiel2.0@gmail.com' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Protection: empêcher la suppression du rôle owner via l'API
CREATE OR REPLACE FUNCTION public.protect_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role = 'owner' THEN
    RAISE EXCEPTION 'Le rôle propriétaire ne peut pas être modifié ou supprimé.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_owner_role ON public.user_roles;
CREATE TRIGGER trg_protect_owner_role
BEFORE DELETE OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_owner_role();

-- 2. admin_activity_log
CREATE TABLE public.admin_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_activity_log TO authenticated;
GRANT ALL ON public.admin_activity_log TO service_role;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and owner can read activity log"
ON public.admin_activity_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE INDEX idx_admin_activity_log_created_at ON public.admin_activity_log(created_at DESC);
CREATE INDEX idx_admin_activity_log_user ON public.admin_activity_log(user_id);

-- 3. candidate_status
CREATE TABLE public.candidate_status (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  suspended BOOLEAN NOT NULL DEFAULT false,
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.candidate_status TO authenticated;
GRANT ALL ON public.candidate_status TO service_role;
ALTER TABLE public.candidate_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own status"
ON public.candidate_status FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins and owner read all statuses"
ON public.candidate_status FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- 4. Étendre RLS: admins/owner peuvent lire tous les profils, sessions
CREATE POLICY "Admins and owner read all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins and owner read all sessions"
ON public.test_sessions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins and owner read all reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins and owner update reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins and owner delete reviews"
ON public.reviews FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owner reads all user_roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR auth.uid() = user_id);

-- 5. Dashboard stats
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
        SELECT COALESCE(nationality, 'Inconnu') AS country, COUNT(*) AS cnt
        FROM public.profiles
        GROUP BY nationality
        ORDER BY cnt DESC
        LIMIT 20
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
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;
