CREATE OR REPLACE FUNCTION public.rw_set_active(_kind text, _id uuid, _active boolean, _reason text, _reassign_to uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _staff boolean := public.rw_is_staff(auth.uid());
  _name text; _target_user uuid; _was boolean; _coach uuid;
  _moved integer := 0; _pending integer := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Connexion requise.'; END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 5 THEN RAISE EXCEPTION 'Indiquez un motif (5 caractères minimum).'; END IF;
  IF _kind = 'learner' THEN
    SELECT full_name, user_id, is_active, coach_id INTO _name, _target_user, _was, _coach FROM rw_learners WHERE id = _id FOR UPDATE;
    IF _name IS NULL THEN RAISE EXCEPTION 'Apprenant introuvable.'; END IF;
    IF NOT _staff AND (_coach IS NULL OR _coach IS DISTINCT FROM public.rw_coach_id(_uid)) THEN
      RAISE EXCEPTION 'Vous ne pouvez gérer que vos propres apprenants.';
    END IF;
  ELSIF _kind = 'coach' THEN
    IF NOT _staff THEN RAISE EXCEPTION 'Seul un administrateur peut retirer un coach.'; END IF;
    SELECT full_name, user_id, is_active INTO _name, _target_user, _was FROM rw_coaches WHERE id = _id FOR UPDATE;
    IF _name IS NULL THEN RAISE EXCEPTION 'Coach introuvable.'; END IF;
  ELSE RAISE EXCEPTION 'Type inconnu.'; END IF;

  IF _active AND NOT _staff THEN RAISE EXCEPTION 'Seul un administrateur peut réactiver un compte.'; END IF;
  IF _was = _active THEN RAISE EXCEPTION '%', CASE WHEN _active THEN 'Déjà actif.' ELSE 'Déjà retiré.' END; END IF;
  IF NOT _active AND public.rw_is_protected_user(_target_user) THEN RAISE EXCEPTION 'Un compte admin ou Owner ne peut pas être retiré.'; END IF;
  IF NOT _active AND _target_user = _uid THEN RAISE EXCEPTION 'Vous ne pouvez pas vous retirer vous-même.'; END IF;

  IF _kind = 'coach' AND NOT _active THEN
    SELECT count(*) INTO _moved FROM rw_learners WHERE coach_id = _id;
    SELECT count(*) INTO _pending FROM rw_submissions s JOIN rw_learners l ON l.id = s.learner_id WHERE l.coach_id = _id AND s.status = 'submitted';
    IF _moved > 0 THEN
      IF _reassign_to IS NULL OR _reassign_to = _id OR NOT EXISTS (SELECT 1 FROM rw_coaches WHERE id = _reassign_to AND is_active) THEN
        RAISE EXCEPTION 'Choisissez un autre coach actif pour reprendre ses % apprenant(s).', _moved;
      END IF;
      UPDATE rw_learners SET coach_id = _reassign_to, updated_at = now() WHERE coach_id = _id;
    END IF;
  END IF;

  IF _kind = 'learner' THEN UPDATE rw_learners SET is_active = _active, updated_at = now() WHERE id = _id;
  ELSE UPDATE rw_coaches SET is_active = _active, updated_at = now() WHERE id = _id; END IF;

  INSERT INTO rw_removal_log(target_kind, target_id, target_name, action, reason, actor_id, reassigned_to, moved_learners, pending_reviews)
  VALUES (_kind, _id, _name, CASE WHEN _active THEN 'reactivate' ELSE 'deactivate' END, btrim(_reason), _uid,
          CASE WHEN _moved > 0 THEN _reassign_to END, _moved, _pending);
  RETURN jsonb_build_object('moved', _moved, 'pending', _pending);
END $$;
REVOKE EXECUTE ON FUNCTION public.rw_set_active(text, uuid, boolean, text, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rw_set_active(text, uuid, boolean, text, uuid) TO authenticated, service_role;

CREATE POLICY "rw chat staff read reported messages" ON public.rw_chat_messages
FOR SELECT TO authenticated
USING (
  public.rw_is_staff(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.rw_chat_reports r
    WHERE r.message_id = rw_chat_messages.id
  )
);