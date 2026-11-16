
CREATE TABLE public.rw_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('direct','group','announcement')),
  title text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rw_chat_members (
  conversation_id uuid NOT NULL REFERENCES public.rw_chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  last_read_at timestamptz NOT NULL DEFAULT 'epoch',
  last_seen_at timestamptz NOT NULL DEFAULT 'epoch',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX ON public.rw_chat_members(user_id);
CREATE TABLE public.rw_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.rw_chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL DEFAULT '',
  reply_to uuid REFERENCES public.rw_chat_messages(id) ON DELETE SET NULL,
  attachment_path text,
  attachment_kind text CHECK (attachment_kind IN ('image','video','audio','file')),
  attachment_name text,
  attachment_size bigint,
  pinned boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.rw_chat_messages(conversation_id, created_at);
CREATE TABLE public.rw_chat_reactions (
  message_id uuid NOT NULL REFERENCES public.rw_chat_messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);
CREATE TABLE public.rw_chat_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.rw_chat_messages(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rw_chat_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  message_id uuid,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rw_chat_conversations, public.rw_chat_members, public.rw_chat_messages, public.rw_chat_reactions, public.rw_chat_reports, public.rw_chat_moderation_log TO authenticated;
GRANT ALL ON public.rw_chat_conversations, public.rw_chat_members, public.rw_chat_messages, public.rw_chat_reactions, public.rw_chat_reports, public.rw_chat_moderation_log TO service_role;
ALTER TABLE public.rw_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rw_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rw_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rw_chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rw_chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rw_chat_moderation_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rw_chat_is_member(_conv uuid, _uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.rw_chat_members WHERE conversation_id = _conv AND user_id = _uid)
$$;
CREATE OR REPLACE FUNCTION public.rw_chat_name(_uid uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT full_name FROM public.rw_coaches WHERE user_id=_uid LIMIT 1),
    (SELECT full_name FROM public.rw_learners WHERE user_id=_uid LIMIT 1),
    CASE WHEN public.rw_is_staff(_uid) THEN 'Administration OpenDoorsClass' ELSE 'Participant' END)
$$;

CREATE POLICY "rw chat members read conv" ON public.rw_chat_conversations FOR SELECT TO authenticated USING (public.rw_chat_is_member(id, auth.uid()));
CREATE POLICY "rw chat members read members" ON public.rw_chat_members FOR SELECT TO authenticated USING (public.rw_chat_is_member(conversation_id, auth.uid()));
CREATE POLICY "rw chat members read messages" ON public.rw_chat_messages FOR SELECT TO authenticated USING (public.rw_chat_is_member(conversation_id, auth.uid()));
CREATE POLICY "rw chat members read reactions" ON public.rw_chat_reactions FOR SELECT TO authenticated USING (public.rw_chat_is_member(conversation_id, auth.uid()));
CREATE POLICY "rw chat staff read reports" ON public.rw_chat_reports FOR SELECT TO authenticated USING (public.rw_is_staff(auth.uid()) OR reporter_id = auth.uid());
CREATE POLICY "rw chat staff read modlog" ON public.rw_chat_moderation_log FOR SELECT TO authenticated USING (public.rw_is_staff(auth.uid()));

-- Who a user may talk to
CREATE OR REPLACE FUNCTION public.rw_chat_contacts() RETURNS TABLE(user_id uuid, full_name text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); cid uuid; lr public.rw_learners;
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  IF public.rw_is_staff(me) THEN
    RETURN QUERY SELECT c.user_id, c.full_name, 'coach'::text FROM public.rw_coaches c WHERE c.is_active AND c.user_id IS NOT NULL AND c.user_id <> me
      UNION SELECT l.user_id, l.full_name, 'learner' FROM public.rw_learners l WHERE l.is_active AND l.user_id IS NOT NULL AND l.user_id <> me;
    RETURN;
  END IF;
  cid := public.rw_coach_id(me);
  IF cid IS NOT NULL THEN
    RETURN QUERY SELECT l.user_id, l.full_name, 'learner'::text FROM public.rw_learners l WHERE l.is_active AND l.coach_id = cid AND l.user_id IS NOT NULL
      UNION SELECT c.user_id, c.full_name, 'coach' FROM public.rw_coaches c WHERE c.is_active AND c.user_id IS NOT NULL AND c.user_id <> me
      UNION SELECT r.user_id, 'Administration OpenDoorsClass', 'staff' FROM public.user_roles r WHERE r.role IN ('owner','admin') AND r.user_id <> me;
    RETURN;
  END IF;
  lr := public.rw_learner_row(me);
  IF lr.id IS NOT NULL THEN
    RETURN QUERY SELECT c.user_id, c.full_name, 'coach'::text FROM public.rw_coaches c WHERE c.is_active AND c.id = lr.coach_id AND c.user_id IS NOT NULL
      UNION SELECT r.user_id, 'Administration OpenDoorsClass', 'staff' FROM public.user_roles r WHERE r.role IN ('owner','admin') AND r.user_id <> me;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rw_chat_can_contact(_other uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.rw_chat_contacts() c WHERE c.user_id = _other)
$$;

CREATE OR REPLACE FUNCTION public.rw_chat_open_direct(_other uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); cid uuid;
BEGIN
  IF me IS NULL OR NOT public.rw_chat_can_contact(_other) THEN RAISE EXCEPTION 'Vous ne pouvez pas écrire à cette personne.'; END IF;
  SELECT c.id INTO cid FROM public.rw_chat_conversations c
    JOIN public.rw_chat_members a ON a.conversation_id=c.id AND a.user_id=me
    JOIN public.rw_chat_members b ON b.conversation_id=c.id AND b.user_id=_other
    WHERE c.kind='direct' LIMIT 1;
  IF cid IS NOT NULL THEN RETURN cid; END IF;
  INSERT INTO public.rw_chat_conversations(kind, created_by) VALUES ('direct', me) RETURNING id INTO cid;
  INSERT INTO public.rw_chat_members(conversation_id, user_id) VALUES (cid, me), (cid, _other);
  RETURN cid;
END $$;

CREATE OR REPLACE FUNCTION public.rw_chat_create_group(_title text, _members uuid[], _announcement boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); cid uuid; u uuid;
BEGIN
  IF me IS NULL OR NOT (public.rw_is_staff(me) OR public.rw_coach_id(me) IS NOT NULL) THEN RAISE EXCEPTION 'Réservé aux coachs et administrateurs.'; END IF;
  IF _announcement AND NOT public.rw_is_staff(me) THEN RAISE EXCEPTION 'Les annonces sont réservées aux administrateurs.'; END IF;
  IF length(btrim(coalesce(_title,''))) < 2 THEN RAISE EXCEPTION 'Donnez un nom au groupe.'; END IF;
  INSERT INTO public.rw_chat_conversations(kind, title, created_by)
    VALUES (CASE WHEN _announcement THEN 'announcement' ELSE 'group' END, left(btrim(_title),80), me) RETURNING id INTO cid;
  INSERT INTO public.rw_chat_members(conversation_id, user_id, role) VALUES (cid, me, 'admin');
  IF _announcement THEN
    INSERT INTO public.rw_chat_members(conversation_id, user_id)
      SELECT DISTINCT cid, x.user_id FROM public.rw_chat_contacts() x WHERE x.user_id <> me ON CONFLICT DO NOTHING;
  ELSE
    FOREACH u IN ARRAY coalesce(_members, '{}') LOOP
      IF NOT public.rw_chat_can_contact(u) THEN RAISE EXCEPTION 'Un des membres choisis n''est pas autorisé.'; END IF;
      INSERT INTO public.rw_chat_members(conversation_id, user_id) VALUES (cid, u) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN cid;
END $$;

CREATE OR REPLACE FUNCTION public.rw_chat_send(_conv uuid, _body text, _reply uuid DEFAULT NULL, _path text DEFAULT NULL, _kind text DEFAULT NULL, _name text DEFAULT NULL, _size bigint DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); c public.rw_chat_conversations; mid uuid; n int;
BEGIN
  IF me IS NULL OR NOT public.rw_chat_is_member(_conv, me) THEN RAISE EXCEPTION 'Accès refusé.'; END IF;
  SELECT * INTO c FROM public.rw_chat_conversations WHERE id=_conv;
  IF c.kind='announcement' AND NOT EXISTS (SELECT 1 FROM public.rw_chat_members WHERE conversation_id=_conv AND user_id=me AND role='admin') AND NOT public.rw_is_staff(me) THEN
    RAISE EXCEPTION 'Seule l''administration publie dans les annonces.'; END IF;
  _body := btrim(coalesce(_body,''));
  IF _body = '' AND _path IS NULL THEN RAISE EXCEPTION 'Message vide.'; END IF;
  IF length(_body) > 4000 THEN RAISE EXCEPTION 'Message trop long (4000 caractères maximum).'; END IF;
  IF _path IS NOT NULL AND (split_part(_path,'/',1) <> _conv::text OR _kind IS NULL) THEN RAISE EXCEPTION 'Pièce jointe invalide.'; END IF;
  IF _size IS NOT NULL AND _size > 52428800 THEN RAISE EXCEPTION 'Fichier trop lourd (50 Mo maximum).'; END IF;
  SELECT count(*) INTO n FROM public.rw_chat_messages WHERE sender_id=me AND created_at > now() - interval '1 minute';
  IF n >= 20 THEN RAISE EXCEPTION 'Trop de messages en peu de temps. Patientez une minute.'; END IF;
  IF _reply IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.rw_chat_messages WHERE id=_reply AND conversation_id=_conv) THEN _reply := NULL; END IF;
  INSERT INTO public.rw_chat_messages(conversation_id, sender_id, body, reply_to, attachment_path, attachment_kind, attachment_name, attachment_size)
    VALUES (_conv, me, _body, _reply, _path, _kind, left(_name,200), _size) RETURNING id INTO mid;
  UPDATE public.rw_chat_conversations SET last_message_at=now() WHERE id=_conv;
  UPDATE public.rw_chat_members SET last_read_at=now(), last_seen_at=now() WHERE conversation_id=_conv AND user_id=me;
  RETURN mid;
END $$;

CREATE OR REPLACE FUNCTION public.rw_chat_edit(_id uuid, _body text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  _body := btrim(coalesce(_body,''));
  IF _body = '' OR length(_body) > 4000 THEN RAISE EXCEPTION 'Texte invalide.'; END IF;
  UPDATE public.rw_chat_messages SET body=_body, edited_at=now() WHERE id=_id AND sender_id=auth.uid() AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vous ne pouvez modifier que vos propres messages.'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rw_chat_delete(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.rw_chat_messages; me uuid := auth.uid();
BEGIN
  SELECT * INTO m FROM public.rw_chat_messages WHERE id=_id;
  IF m.id IS NULL OR NOT (m.sender_id = me OR public.rw_is_staff(me)) THEN RAISE EXCEPTION 'Suppression non autorisée.'; END IF;
  UPDATE public.rw_chat_messages SET deleted_at=now(), body='', attachment_path=NULL, attachment_name=NULL, pinned=false WHERE id=_id;
  IF m.sender_id <> me THEN
    INSERT INTO public.rw_chat_moderation_log(actor_id, action, message_id, detail) VALUES (me, 'delete', _id, left(m.body,500));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rw_chat_pin(_id uuid, _pinned boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.rw_chat_messages; me uuid := auth.uid(); k text;
BEGIN
  SELECT * INTO m FROM public.rw_chat_messages WHERE id=_id AND deleted_at IS NULL;
  IF m.id IS NULL OR NOT public.rw_chat_is_member(m.conversation_id, me) THEN RAISE EXCEPTION 'Accès refusé.'; END IF;
  SELECT kind INTO k FROM public.rw_chat_conversations WHERE id=m.conversation_id;
  IF k <> 'direct' AND NOT public.rw_is_staff(me) AND NOT EXISTS (SELECT 1 FROM public.rw_chat_members WHERE conversation_id=m.conversation_id AND user_id=me AND role='admin') THEN
    RAISE EXCEPTION 'Seul l''animateur du groupe peut épingler.'; END IF;
  UPDATE public.rw_chat_messages SET pinned=_pinned WHERE id=_id;
END $$;

CREATE OR REPLACE FUNCTION public.rw_chat_react(_id uuid, _emoji text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.rw_chat_messages; me uuid := auth.uid();
BEGIN
  IF _emoji NOT IN ('👍','❤️','😂','👏','🙏','😮') THEN RAISE EXCEPTION 'Réaction inconnue.'; END IF;
  SELECT * INTO m FROM public.rw_chat_messages WHERE id=_id AND deleted_at IS NULL;
  IF m.id IS NULL OR NOT public.rw_chat_is_member(m.conversation_id, me) THEN RAISE EXCEPTION 'Accès refusé.'; END IF;
  DELETE FROM public.rw_chat_reactions WHERE message_id=_id AND user_id=me AND emoji=_emoji;
  IF NOT FOUND THEN INSERT INTO public.rw_chat_reactions(message_id, conversation_id, user_id, emoji) VALUES (_id, m.conversation_id, me, _emoji); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rw_chat_mark_read(_conv uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.rw_chat_members SET last_read_at=now(), last_seen_at=now() WHERE conversation_id=_conv AND user_id=auth.uid()
$$;
CREATE OR REPLACE FUNCTION public.rw_chat_mark_seen() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.rw_chat_members SET last_seen_at=now() WHERE user_id=auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.rw_chat_report(_id uuid, _reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.rw_chat_messages;
BEGIN
  SELECT * INTO m FROM public.rw_chat_messages WHERE id=_id;
  IF m.id IS NULL OR NOT public.rw_chat_is_member(m.conversation_id, auth.uid()) THEN RAISE EXCEPTION 'Accès refusé.'; END IF;
  IF length(btrim(coalesce(_reason,''))) < 3 THEN RAISE EXCEPTION 'Expliquez le motif du signalement.'; END IF;
  INSERT INTO public.rw_chat_reports(message_id, reporter_id, reason) VALUES (_id, auth.uid(), left(btrim(_reason),1000));
END $$;

CREATE OR REPLACE FUNCTION public.rw_chat_close_report(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.rw_is_staff(auth.uid()) THEN RAISE EXCEPTION 'Réservé aux administrateurs.'; END IF;
  UPDATE public.rw_chat_reports SET status='closed' WHERE id=_id;
  INSERT INTO public.rw_chat_moderation_log(actor_id, action, detail) VALUES (auth.uid(), 'close_report', _id::text);
END $$;

CREATE OR REPLACE FUNCTION public.rw_chat_my_conversations() RETURNS TABLE(id uuid, kind text, title text, last_message_at timestamptz, unread bigint, last_body text, can_post boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.kind,
    CASE WHEN c.kind='direct' THEN (SELECT public.rw_chat_name(o.user_id) FROM public.rw_chat_members o WHERE o.conversation_id=c.id AND o.user_id<>auth.uid() LIMIT 1) ELSE c.title END,
    c.last_message_at,
    (SELECT count(*) FROM public.rw_chat_messages x WHERE x.conversation_id=c.id AND x.sender_id<>auth.uid() AND x.created_at > m.last_read_at AND x.deleted_at IS NULL),
    (SELECT CASE WHEN x.deleted_at IS NOT NULL THEN 'Message supprimé' WHEN x.body='' THEN 'Pièce jointe' ELSE left(x.body,80) END FROM public.rw_chat_messages x WHERE x.conversation_id=c.id ORDER BY x.created_at DESC LIMIT 1),
    (c.kind <> 'announcement' OR m.role='admin' OR public.rw_is_staff(auth.uid()))
  FROM public.rw_chat_conversations c JOIN public.rw_chat_members m ON m.conversation_id=c.id AND m.user_id=auth.uid()
  ORDER BY c.last_message_at DESC
$$;

CREATE OR REPLACE FUNCTION public.rw_chat_members_of(_conv uuid) RETURNS TABLE(user_id uuid, full_name text, role text, last_read_at timestamptz, last_seen_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, public.rw_chat_name(m.user_id), m.role, m.last_read_at, m.last_seen_at
  FROM public.rw_chat_members m WHERE m.conversation_id=_conv AND public.rw_chat_is_member(_conv, auth.uid())
$$;

REVOKE EXECUTE ON FUNCTION public.rw_chat_is_member(uuid,uuid), public.rw_chat_name(uuid), public.rw_chat_contacts(), public.rw_chat_can_contact(uuid),
  public.rw_chat_open_direct(uuid), public.rw_chat_create_group(text,uuid[],boolean), public.rw_chat_send(uuid,text,uuid,text,text,text,bigint),
  public.rw_chat_edit(uuid,text), public.rw_chat_delete(uuid), public.rw_chat_pin(uuid,boolean), public.rw_chat_react(uuid,text),
  public.rw_chat_mark_read(uuid), public.rw_chat_mark_seen(), public.rw_chat_report(uuid,text), public.rw_chat_close_report(uuid),
  public.rw_chat_my_conversations(), public.rw_chat_members_of(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rw_chat_is_member(uuid,uuid), public.rw_chat_name(uuid), public.rw_chat_contacts(), public.rw_chat_can_contact(uuid),
  public.rw_chat_open_direct(uuid), public.rw_chat_create_group(text,uuid[],boolean), public.rw_chat_send(uuid,text,uuid,text,text,text,bigint),
  public.rw_chat_edit(uuid,text), public.rw_chat_delete(uuid), public.rw_chat_pin(uuid,boolean), public.rw_chat_react(uuid,text),
  public.rw_chat_mark_read(uuid), public.rw_chat_mark_seen(), public.rw_chat_report(uuid,text), public.rw_chat_close_report(uuid),
  public.rw_chat_my_conversations(), public.rw_chat_members_of(uuid) TO authenticated, service_role;

CREATE POLICY "rw chat member uploads" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rw-chat' AND public.rw_chat_is_member(((storage.foldername(name))[1])::uuid, auth.uid()));
CREATE POLICY "rw chat member reads files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rw-chat' AND public.rw_chat_is_member(((storage.foldername(name))[1])::uuid, auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.rw_chat_messages, public.rw_chat_reactions, public.rw_chat_members;
