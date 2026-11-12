CREATE TYPE public.rw_level AS ENUM ('A1','A2','B1','B2','C1');

CREATE TABLE public.rw_coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  full_name text NOT NULL,
  email text,
  photo_path text,
  bio text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rw_learners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  full_name text NOT NULL,
  email text,
  photo_path text,
  level public.rw_level NOT NULL DEFAULT 'A1',
  coach_id uuid REFERENCES public.rw_coaches(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  start_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rw_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number integer NOT NULL UNIQUE CHECK (week_number BETWEEN 1 AND 20),
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rw_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL REFERENCES public.rw_weeks(id) ON DELETE CASCADE,
  day_index integer NOT NULL CHECK (day_index BETWEEN 1 AND 6),
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_id, day_index)
);
CREATE TABLE public.rw_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.rw_sessions(id) ON DELETE CASCADE,
  level public.rw_level NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  word_count integer NOT NULL DEFAULT 0,
  source_author text,
  source_title text,
  source_date text,
  source_institution text,
  source_url text,
  content_type text,
  rights_status text,
  mention text NOT NULL DEFAULT 'original' CHECK (mention IN ('original','adapted','excerpt')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, level)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rw_coaches, public.rw_learners, public.rw_weeks, public.rw_sessions, public.rw_lessons TO authenticated;
GRANT ALL ON public.rw_coaches, public.rw_learners, public.rw_weeks, public.rw_sessions, public.rw_lessons TO service_role;

ALTER TABLE public.rw_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rw_learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rw_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rw_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rw_lessons ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rw_is_staff(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'owner') OR public.has_role(_uid,'admin')
$$;
CREATE OR REPLACE FUNCTION public.rw_coach_id(_uid uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.rw_coaches WHERE user_id = _uid AND is_active LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.rw_learner_row(_uid uuid) RETURNS public.rw_learners
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.rw_learners WHERE user_id = _uid AND is_active LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.rw_is_staff(uuid), public.rw_coach_id(uuid), public.rw_learner_row(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rw_is_staff(uuid), public.rw_coach_id(uuid), public.rw_learner_row(uuid) TO authenticated, service_role;

CREATE POLICY "rw staff manage coaches" ON public.rw_coaches FOR ALL TO authenticated
  USING (public.rw_is_staff(auth.uid())) WITH CHECK (public.rw_is_staff(auth.uid()));
CREATE POLICY "rw coach reads self" ON public.rw_coaches FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "rw learner reads own coach" ON public.rw_coaches FOR SELECT TO authenticated
  USING (id = (public.rw_learner_row(auth.uid())).coach_id);

CREATE POLICY "rw staff manage learners" ON public.rw_learners FOR ALL TO authenticated
  USING (public.rw_is_staff(auth.uid())) WITH CHECK (public.rw_is_staff(auth.uid()));
CREATE POLICY "rw coach reads assigned learners" ON public.rw_learners FOR SELECT TO authenticated
  USING (coach_id IS NOT NULL AND coach_id = public.rw_coach_id(auth.uid()));
CREATE POLICY "rw learner reads self" ON public.rw_learners FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "rw staff manage weeks" ON public.rw_weeks FOR ALL TO authenticated
  USING (public.rw_is_staff(auth.uid())) WITH CHECK (public.rw_is_staff(auth.uid()));
CREATE POLICY "rw members read weeks" ON public.rw_weeks FOR SELECT TO authenticated
  USING (public.rw_coach_id(auth.uid()) IS NOT NULL OR (public.rw_learner_row(auth.uid())).id IS NOT NULL);
CREATE POLICY "rw staff manage sessions" ON public.rw_sessions FOR ALL TO authenticated
  USING (public.rw_is_staff(auth.uid())) WITH CHECK (public.rw_is_staff(auth.uid()));
CREATE POLICY "rw members read sessions" ON public.rw_sessions FOR SELECT TO authenticated
  USING (public.rw_coach_id(auth.uid()) IS NOT NULL OR (public.rw_learner_row(auth.uid())).id IS NOT NULL);

CREATE POLICY "rw staff manage lessons" ON public.rw_lessons FOR ALL TO authenticated
  USING (public.rw_is_staff(auth.uid())) WITH CHECK (public.rw_is_staff(auth.uid()));
CREATE POLICY "rw coach reads published lessons" ON public.rw_lessons FOR SELECT TO authenticated
  USING (status = 'published' AND public.rw_coach_id(auth.uid()) IS NOT NULL);
CREATE POLICY "rw learner reads own level lessons" ON public.rw_lessons FOR SELECT TO authenticated
  USING (status = 'published' AND level = (public.rw_learner_row(auth.uid())).level);

CREATE TRIGGER rw_coaches_updated BEFORE UPDATE ON public.rw_coaches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER rw_learners_updated BEFORE UPDATE ON public.rw_learners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER rw_lessons_updated BEFORE UPDATE ON public.rw_lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();