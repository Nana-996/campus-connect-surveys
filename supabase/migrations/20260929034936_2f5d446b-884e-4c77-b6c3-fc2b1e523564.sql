CREATE OR REPLACE FUNCTION public.admin_list_school_subscriptions()
RETURNS TABLE(domain text, name text, subscription_status text, valid_until timestamptz, admin_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT s.domain, s.name, s.subscription_status, s.valid_until, u.email::text
  FROM public.schools s LEFT JOIN auth.users u ON u.id = s.admin_user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY s.name;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_school_subscription(_domain text, _status text, _valid_until timestamptz, _admin_email text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('trial','active','expired') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF coalesce(trim(_admin_email),'') <> '' THEN
    SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_admin_email)) LIMIT 1;
    IF _uid IS NULL THEN RAISE EXCEPTION 'No account found for that email'; END IF;
  END IF;
  UPDATE public.schools SET subscription_status = _status, valid_until = _valid_until,
    admin_user_id = _uid, updated_at = now()
  WHERE lower(domain) = lower(_domain);
  IF NOT FOUND THEN RAISE EXCEPTION 'School not found'; END IF;
END; $$;

REVOKE ALL ON FUNCTION public.admin_list_school_subscriptions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_school_subscription(text,text,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_school_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_school_subscription(text,text,timestamptz,text) TO authenticated;