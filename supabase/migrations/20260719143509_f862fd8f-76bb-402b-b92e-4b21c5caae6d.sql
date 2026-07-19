-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.cecrl_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE public.question_category AS ENUM ('grammar', 'vocabulary', 'reading', 'listening');
CREATE TYPE public.level_range AS ENUM ('A1-A2', 'B1-B2', 'C1-C2');
CREATE TYPE public.payment_status AS ENUM ('pending', 'success', 'failed', 'cancelled');

-- ============================================================
-- Utility: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- user_roles + has_role
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "Users read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles policies (now that has_role exists)
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- questions
-- ============================================================
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level public.cecrl_level NOT NULL,
  category public.question_category NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  audio_url TEXT,
  max_plays INTEGER NOT NULL DEFAULT 5,
  order_hint INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_questions_updated_at BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Only admins manage questions. Correct answer never exposed to Data API; test flow uses server functions.
CREATE POLICY "Admins manage questions"
  ON public.questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- test_sessions
-- ============================================================
CREATE TABLE public.test_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  score INTEGER,
  level_result public.cecrl_level,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  per_category_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_sessions TO authenticated;
GRANT ALL ON public.test_sessions TO service_role;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own sessions"
  ON public.test_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own sessions"
  ON public.test_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sessions"
  ON public.test_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- testimonials
-- ============================================================
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  display_on_homepage BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_testimonials_updated_at BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone reads approved testimonials"
  ON public.testimonials FOR SELECT TO anon, authenticated
  USING (is_approved = TRUE OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own testimonials"
  ON public.testimonials FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage testimonials"
  ON public.testimonials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- pricing_offers
-- ============================================================
CREATE TABLE public.pricing_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_range public.level_range NOT NULL,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta_link TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricing_offers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pricing_offers TO authenticated;
GRANT ALL ON public.pricing_offers TO service_role;
ALTER TABLE public.pricing_offers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_pricing_offers_updated_at BEFORE UPDATE ON public.pricing_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone reads active offers"
  ON public.pricing_offers FOR SELECT TO anon, authenticated
  USING (is_active = TRUE OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage offers"
  ON public.pricing_offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- level_messages
-- ============================================================
CREATE TABLE public.level_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_range public.level_range NOT NULL UNIQUE,
  message_text TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.level_messages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.level_messages TO authenticated;
GRANT ALL ON public.level_messages TO service_role;
ALTER TABLE public.level_messages ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_level_messages_updated_at BEFORE UPDATE ON public.level_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone reads level messages"
  ON public.level_messages FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Admins manage level messages"
  ON public.level_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- test_access_plan
-- ============================================================
CREATE TABLE public.test_access_plan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price INTEGER NOT NULL,
  credits_included INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.test_access_plan TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.test_access_plan TO authenticated;
GRANT ALL ON public.test_access_plan TO service_role;
ALTER TABLE public.test_access_plan ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_test_access_plan_updated_at BEFORE UPDATE ON public.test_access_plan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone reads active plan"
  ON public.test_access_plan FOR SELECT TO anon, authenticated
  USING (is_active = TRUE OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage plan"
  ON public.test_access_plan FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- payments
-- ============================================================
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  credits_added INTEGER NOT NULL DEFAULT 0,
  moneroo_transaction_id TEXT UNIQUE,
  moneroo_reference TEXT NOT NULL,
  payment_method TEXT,
  status public.payment_status NOT NULL DEFAULT 'pending',
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own pending payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage payments"
  ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- start_test_session: atomic credit decrement + session creation
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_test_session()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_credits INTEGER;
  v_session_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT credits_remaining INTO v_credits
  FROM public.profiles
  WHERE id = v_user
  FOR UPDATE;

  IF v_credits IS NULL OR v_credits < 1 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  UPDATE public.profiles
  SET credits_remaining = credits_remaining - 1
  WHERE id = v_user;

  INSERT INTO public.test_sessions (user_id, started_at)
  VALUES (v_user, now())
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_test_session() TO authenticated;

-- ============================================================
-- Seed: test access plan
-- ============================================================
INSERT INTO public.test_access_plan (price, credits_included, currency, is_active)
VALUES (15000, 10, 'FCFA', TRUE);

-- Seed: level messages
INSERT INTO public.level_messages (level_range, message_text) VALUES
  ('A1-A2', 'Vous posez les bases de votre anglais. C''est le moment idéal pour construire une progression solide avec un accompagnement structuré. Nos formules ci-dessous vous emmènent d''un niveau débutant à une vraie aisance en 9 mois.'),
  ('B1-B2', 'Vous avez déjà de bons acquis. Il est temps de passer à la vitesse supérieure pour parler avec fluidité, gagner en confiance et débloquer les usages professionnels de l''anglais. Nos formules ci-dessous accélèrent cette étape.'),
  ('C1-C2', 'Félicitations, votre niveau d''anglais est excellent. Vous maîtrisez la langue avec aisance, à l''écrit comme à l''oral. Continuez à pratiquer et à enrichir votre vocabulaire pour maintenir cette maîtrise.');

-- Seed: pricing offers for A1-A2
INSERT INTO public.pricing_offers (level_range, title, price, currency, features, cta_link, sort_order) VALUES
  ('A1-A2', 'Starter', 30000, 'FCFA',
    '["Accès au groupe de travail", "Réception des leçons", "Corrections personnalisées", "Suivi personnalisé", "Accès à la communauté OpenDoorsClass", "Cours 2 fois par semaine"]'::jsonb,
    'https://wa.me/24174825725?text=Bonjour%20Nathan%2C%20je%20souhaite%20rejoindre%20la%20formule%20Starter.', 1),
  ('A1-A2', 'Bronze', 100000, 'FCFA',
    '["Tous les avantages de Starter", "Visite de clubs d''anglais", "Dîner avec le coach", "Interview et publication sur les réseaux sociaux (plus de 15 000 abonnés)", "Cours 3 fois par semaine"]'::jsonb,
    'https://wa.me/24174825725?text=Bonjour%20Nathan%2C%20je%20souhaite%20rejoindre%20la%20formule%20Bronze.', 2);

-- Seed: pricing offers for B1-B2 (same content as A1-A2 per plan)
INSERT INTO public.pricing_offers (level_range, title, price, currency, features, cta_link, sort_order) VALUES
  ('B1-B2', 'Starter', 30000, 'FCFA',
    '["Accès au groupe de travail", "Réception des leçons", "Corrections personnalisées", "Suivi personnalisé", "Accès à la communauté OpenDoorsClass", "Cours 2 fois par semaine"]'::jsonb,
    'https://wa.me/24174825725?text=Bonjour%20Nathan%2C%20je%20souhaite%20rejoindre%20la%20formule%20Starter.', 1),
  ('B1-B2', 'Bronze', 100000, 'FCFA',
    '["Tous les avantages de Starter", "Visite de clubs d''anglais", "Dîner avec le coach", "Interview et publication sur les réseaux sociaux (plus de 15 000 abonnés)", "Cours 3 fois par semaine"]'::jsonb,
    'https://wa.me/24174825725?text=Bonjour%20Nathan%2C%20je%20souhaite%20rejoindre%20la%20formule%20Bronze.', 2);
