CREATE OR REPLACE FUNCTION public.admin_grant_credits(_target_user_id uuid, _amount integer, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _actor uuid;
  _earned integer;
  _paid integer;
  _user_type text;
  _grad date;
  _alumni boolean := false;
  _wallet text;
  _current integer;
  _next integer;
BEGIN
  _actor := public.require_admin_user();
  IF _amount < -1000 OR _amount > 1000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  SELECT earned_credits, paid_credits, user_type, graduation_date
    INTO _earned, _paid, _user_type, _grad
  FROM public.profiles
  WHERE id = _target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  _alumni := _user_type = 'student'
             AND _grad IS NOT NULL
             AND (_grad + interval '1 month')::date <= current_date;

  IF _user_type = 'general' OR _alumni THEN
    _wallet := 'paid';
    _current := COALESCE(_paid, 0);
  ELSE
    _wallet := 'earned';
    _current := COALESCE(_earned, 0);
  END IF;

  _next := greatest(0, _current + _amount);

  IF _wallet = 'paid' THEN
    UPDATE public.profiles SET paid_credits = _next WHERE id = _target_user_id;
  ELSE
    UPDATE public.profiles SET earned_credits = _next WHERE id = _target_user_id;
  END IF;

  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, expires_at)
  VALUES (
    _target_user_id,
    _wallet,
    _amount,
    'admin:' || left(coalesce(_reason, 'admin_grant'), 160) || ':by:' || _actor::text,
    CASE WHEN _amount > 0 AND _wallet = 'earned' THEN now() + interval '30 days' ELSE NULL END
  );

  RETURN jsonb_build_object('ok', true, 'wallet', _wallet, 'balance', _next);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_credits(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_credits(uuid, integer, text) TO authenticated, service_role;