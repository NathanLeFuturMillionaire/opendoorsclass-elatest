CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET credits_remaining = credits_remaining + p_amount
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_credits(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_credits(uuid, integer) TO service_role;
