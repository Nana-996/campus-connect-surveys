ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS admin_email text;

CREATE OR REPLACE FUNCTION public.admin_set_school_subscription(_domain text, _status text, _valid_until timestamp with time zone, _admin_email text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE _uid uuid; _email text := nullif(lower(trim(coalesce(_admin_email,''))),'');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('trial','active','expired') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF _email IS NOT NULL THEN
    SELECT id INTO _uid FROM auth.users WHERE lower(email) = _email AND email_confirmed_at IS NOT NULL LIMIT 1;
  END IF;
  UPDATE public.schools SET subscription_status = _status, valid_until = _valid_until,
    admin_email = _email, admin_user_id = _uid, updated_at = now()
  WHERE lower(domain) = lower(_domain);
  IF NOT FOUND THEN RAISE EXCEPTION 'School not found'; END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.claim_school_admin()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE _email text; _n integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  SELECT lower(email) INTO _email FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF _email IS NULL THEN RETURN 0; END IF;
  UPDATE public.schools SET admin_user_id = auth.uid(), updated_at = now()
  WHERE admin_email = _email AND (admin_user_id IS NULL OR admin_user_id <> auth.uid());
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END; $function$;
REVOKE ALL ON FUNCTION public.claim_school_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_school_admin() TO authenticated;