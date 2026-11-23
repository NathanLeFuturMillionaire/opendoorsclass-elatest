CREATE TABLE public.rw_chat_blocks (
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT ON public.rw_chat_blocks TO authenticated;
GRANT ALL ON public.rw_chat_blocks TO service_role;
ALTER TABLE public.rw_chat_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rw chat users read own blocks" ON public.rw_chat_blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.rw_chat_is_blocked(_a uuid, _b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rw_chat_blocks
    WHERE (blocker_id = _a AND blocked_id = _b) OR (blocker_id = _b AND blocked_id = _a)
  )
$$;

CREATE OR REPLACE FUNCTION public.rw_chat_contacts() RETURNS TABLE(user_id uuid, full_name text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); cid uuid; lr public.rw_learners;
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  IF public.rw_is_staff(me) THEN
    RETURN QUERY SELECT x.user_id, x.full_name, x.role FROM (
      SELECT c.user_id, c.full_name, 'coach'::text AS role FROM public.rw_coaches c WHERE c.is_active AND c.user_id IS NOT NULL AND c.user_id <> me
      UNION SELECT l.user_id, l.full_name, 'learner'::text FROM public.rw_learners l WHERE l.is_active AND l.user_id IS NOT NULL AND l.user_id <> me
    ) x WHERE NOT public.rw_chat_is_blocked(me, x.user_id);
    RETURN;
  END IF;
  cid := public.rw_coach_id(me);
  IF cid IS NOT NULL THEN
    RETURN QUERY SELECT x.user_id, x.full_name, x.role FROM (
      SELECT l.user_id, l.full_name, 'learner'::text AS role FROM public.rw_learners l WHERE l.is_active AND l.coach_id = cid AND l.user_id IS NOT NULL
      UNION SELECT c.user_id, c.full_name, 'coach'::text FROM public.rw_coaches c WHERE c.is_active AND c.user_id IS NOT NULL AND c.user_id <> me
      UNION SELECT r.user_id, 'Administration OpenDoorsClass', 'staff'::text FROM public.user_roles r WHERE r.role IN ('owner','admin') AND r.user_id <> me
    ) x WHERE NOT public.rw_chat_is_blocked(me, x.user_id);
    RETURN;
  END IF;
  lr := public.rw_learner_row(me);
  IF lr.id IS NOT NULL THEN
    RETURN QUERY SELECT x.user_id, x.full_name, x.role FROM (
      SELECT c.user_id, c.full_name, 'coach'::text AS role FROM public.rw_coaches c WHERE c.is_active AND c.id = lr.coach_id AND c.user_id IS NOT NULL
      UNION SELECT r.user_id, 'Administration OpenDoorsClass', 'staff'::text FROM public.user_roles r WHERE r.role IN ('owner','admin') AND r.user_id <> me
    ) x WHERE NOT public.rw_chat_is_blocked(me, x.user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rw_chat_can_contact(_other uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _other IS NOT NULL AND _other <> auth.uid() AND NOT public.rw_chat_is_blocked(auth.uid(), _other)
    AND EXISTS (SELECT 1 FROM public.rw_chat_contacts() c WHERE c.user_id = _other)
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

CREATE OR REPLACE FUNCTION public.rw_chat_send(_conv uuid, _body text, _reply uuid DEFAULT NULL, _path text DEFAULT NULL, _kind text DEFAULT NULL, _name text DEFAULT NULL, _size bigint DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); c public.rw_chat_conversations; mid uuid; n int;
BEGIN
  IF me IS NULL OR NOT public.rw_chat_is_member(_conv, me) THEN RAISE EXCEPTION 'Accès refusé.'; END IF;
  SELECT * INTO c FROM public.rw_chat_conversations WHERE id=_conv;
  IF c.kind='direct' AND EXISTS (
    SELECT 1 FROM public.rw_chat_members o
    WHERE o.conversation_id=_conv AND o.user_id<>me AND public.rw_chat_is_blocked(me,o.user_id)
  ) THEN RAISE EXCEPTION 'Cette conversation est bloquée.'; END IF;
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

CREATE OR REPLACE FUNCTION public.rw_chat_my_conversations() RETURNS TABLE(id uuid, kind text, title text, last_message_at timestamptz, unread bigint, last_body text, can_post boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.kind,
    CASE WHEN c.kind='direct' THEN (SELECT public.rw_chat_name(o.user_id) FROM public.rw_chat_members o WHERE o.conversation_id=c.id AND o.user_id<>auth.uid() LIMIT 1) ELSE c.title END,
    c.last_message_at,
    (SELECT count(*) FROM public.rw_chat_messages x WHERE x.conversation_id=c.id AND x.sender_id<>auth.uid() AND x.created_at > m.last_read_at AND x.deleted_at IS NULL),
    (SELECT CASE WHEN x.deleted_at IS NOT NULL THEN 'Message supprimé' WHEN x.body='' THEN 'Pièce jointe' ELSE left(x.body,80) END FROM public.rw_chat_messages x WHERE x.conversation_id=c.id ORDER BY x.created_at DESC LIMIT 1),
    ((c.kind <> 'announcement' OR m.role='admin' OR public.rw_is_staff(auth.uid()))
      AND NOT (c.kind='direct' AND EXISTS (SELECT 1 FROM public.rw_chat_members o WHERE o.conversation_id=c.id AND o.user_id<>auth.uid() AND public.rw_chat_is_blocked(auth.uid(),o.user_id))))
  FROM public.rw_chat_conversations c JOIN public.rw_chat_members m ON m.conversation_id=c.id AND m.user_id=auth.uid()
  ORDER BY c.last_message_at DESC
$$;

CREATE OR REPLACE FUNCTION public.rw_chat_block_status(_conv uuid) RETURNS TABLE(blocked boolean, blocked_by_me boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); other uuid;
BEGIN
  IF me IS NULL OR NOT public.rw_chat_is_member(_conv,me) THEN RAISE EXCEPTION 'Accès refusé.'; END IF;
  SELECT user_id INTO other FROM public.rw_chat_members WHERE conversation_id=_conv AND user_id<>me LIMIT 1;
  IF other IS NULL THEN RETURN QUERY SELECT false, false; RETURN; END IF;
  RETURN QUERY SELECT public.rw_chat_is_blocked(me,other), EXISTS(SELECT 1 FROM public.rw_chat_blocks WHERE blocker_id=me AND blocked_id=other);
END $$;

CREATE OR REPLACE FUNCTION public.rw_chat_block(_other uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR _other IS NULL OR _other=auth.uid() OR NOT public.rw_chat_can_contact(_other) THEN RAISE EXCEPTION 'Ce contact ne peut pas être bloqué.'; END IF;
  INSERT INTO public.rw_chat_blocks(blocker_id,blocked_id) VALUES (auth.uid(),_other) ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.rw_chat_unblock(_other uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise.'; END IF;
  DELETE FROM public.rw_chat_blocks WHERE blocker_id=auth.uid() AND blocked_id=_other;
END $$;

REVOKE EXECUTE ON FUNCTION public.rw_chat_is_blocked(uuid,uuid), public.rw_chat_contacts(), public.rw_chat_can_contact(uuid), public.rw_chat_open_direct(uuid), public.rw_chat_send(uuid,text,uuid,text,text,text,bigint), public.rw_chat_my_conversations(), public.rw_chat_block_status(uuid), public.rw_chat_block(uuid), public.rw_chat_unblock(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rw_chat_is_blocked(uuid,uuid), public.rw_chat_contacts(), public.rw_chat_can_contact(uuid), public.rw_chat_open_direct(uuid), public.rw_chat_send(uuid,text,uuid,text,text,text,bigint), public.rw_chat_my_conversations(), public.rw_chat_block_status(uuid), public.rw_chat_block(uuid), public.rw_chat_unblock(uuid) TO authenticated, service_role;