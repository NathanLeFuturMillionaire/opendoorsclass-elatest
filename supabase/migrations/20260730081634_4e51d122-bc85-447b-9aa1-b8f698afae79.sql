CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system',
  icon TEXT NOT NULL DEFAULT 'bell',
  action_url TEXT,
  action_label TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id) WHERE is_read = false;

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper to push a notification (server side only)
CREATE OR REPLACE FUNCTION public.push_notification(
  _user_id UUID,
  _title TEXT,
  _message TEXT,
  _category TEXT DEFAULT 'system',
  _icon TEXT DEFAULT 'bell',
  _action_url TEXT DEFAULT NULL,
  _action_label TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (user_id, title, message, category, icon, action_url, action_label)
  VALUES (_user_id, _title, _message, _category, _icon, _action_url, _action_label)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Welcome notification on signup (additive to existing handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, credits_remaining)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    0
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_gamification (user_id) VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  PERFORM public.award_xp(NEW.id, 'account_created', 'account_created', 50, 'Bienvenue sur OpenDoorsClass');
  PERFORM public.push_notification(
    NEW.id,
    'Welcome to OpenDoorsClass',
    'Your account is ready. Complete your profile to get started.',
    'system', 'sparkles', '/profil', 'Complete profile'
  );
  RETURN NEW;
END;
$function$;

-- Badge unlock notifications (additive)
CREATE OR REPLACE FUNCTION public.notify_badge_unlocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.push_notification(
    NEW.user_id,
    'Badge unlocked',
    'Congratulations! You unlocked a new achievement.',
    'achievements', 'award', '/accomplissements', 'View achievements'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_badge_unlocked
  AFTER INSERT ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.notify_badge_unlocked();
