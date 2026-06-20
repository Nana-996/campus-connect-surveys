CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'An admin already exists';
  END IF;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (_uid, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.require_admin_user()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  RETURN _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.require_admin_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.require_admin_user() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _since timestamptz := now() - interval '24 hours';
  _result jsonb;
BEGIN
  PERFORM public.require_admin_user();

  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'surveys', (SELECT count(*) FROM public.surveys),
    'activeSurveys', (SELECT count(*) FROM public.surveys WHERE is_active = true),
    'responses', (SELECT count(*) FROM public.survey_responses),
    'responses24h', (SELECT count(*) FROM public.survey_responses WHERE created_at >= _since),
    'openFlags', (SELECT count(*) FROM public.review_flags WHERE resolved = false)
  ) INTO _result;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_metrics() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  full_name text,
  university_name text,
  university_domain text,
  user_type text,
  earned_credits integer,
  is_flagged boolean,
  flag_reason text,
  created_at timestamptz,
  roles public.app_role[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _safe text := nullif(regexp_replace(coalesce(_search, ''), '[(),.%_]', '', 'g'), '');
BEGIN
  PERFORM public.require_admin_user();

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.university_name,
    p.university_domain,
    p.user_type,
    p.earned_credits,
    p.is_flagged,
    p.flag_reason,
    p.created_at,
    coalesce(array_agg(ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}'::public.app_role[]) AS roles
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE _safe IS NULL
     OR p.full_name ILIKE '%' || _safe || '%'
     OR p.university_domain ILIKE '%' || _safe || '%'
     OR p.university_name ILIKE '%' || _safe || '%'
  GROUP BY p.id
  ORDER BY p.created_at DESC
  LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_credits(_target_user_id uuid, _amount integer, _reason text DEFAULT 'admin_grant')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid;
  _current integer;
  _next integer;
BEGIN
  _actor := public.require_admin_user();
  IF _amount < -1000 OR _amount > 1000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  SELECT earned_credits INTO _current
  FROM public.profiles
  WHERE id = _target_user_id
  FOR UPDATE;

  IF _current IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  _next := greatest(0, _current + _amount);

  UPDATE public.profiles
  SET earned_credits = _next
  WHERE id = _target_user_id;

  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, expires_at)
  VALUES (
    _target_user_id,
    'earned',
    _amount,
    'admin:' || left(coalesce(_reason, 'admin_grant'), 160) || ':by:' || _actor::text,
    CASE WHEN _amount > 0 THEN now() + interval '30 days' ELSE NULL END
  );

  RETURN jsonb_build_object('ok', true, 'balance', _next);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_credits(uuid, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_flag(_target_user_id uuid, _flagged boolean, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin_user();

  UPDATE public.profiles
  SET is_flagged = _flagged,
      flag_reason = CASE WHEN _flagged THEN coalesce(nullif(_reason, ''), 'admin') ELSE NULL END
  WHERE id = _target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_flag(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(_target_user_id uuid, _role public.app_role, _grant boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_count integer;
BEGIN
  PERFORM public.require_admin_user();

  IF _role = 'admin'::public.app_role AND NOT _grant THEN
    SELECT count(*) INTO _admin_count FROM public.user_roles WHERE role = 'admin'::public.app_role;
    IF _admin_count <= 1 AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _target_user_id AND role = 'admin'::public.app_role
    ) THEN
      RAISE EXCEPTION 'Cannot revoke the last admin';
    END IF;
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (_target_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = _target_user_id AND role = _role;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_admin_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target uuid;
BEGIN
  PERFORM public.require_admin_user();

  SELECT id INTO _target
  FROM auth.users
  WHERE lower(email) = lower(trim(_email))
  LIMIT 1;

  IF _target IS NULL THEN
    RAISE EXCEPTION 'No user with that email has signed up yet';
  END IF;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (_target, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _target;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_admin_by_email(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_surveys()
RETURNS TABLE(
  id uuid,
  title text,
  creator_id uuid,
  university_domain text,
  tier text,
  is_active boolean,
  response_count integer,
  response_goal integer,
  created_at timestamptz,
  expires_at timestamptz,
  allow_general_respondents boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin_user();

  RETURN QUERY
  SELECT s.id, s.title, s.creator_id, s.university_domain, s.tier, s.is_active,
         s.response_count, s.response_goal, s.created_at, s.expires_at,
         s.allow_general_respondents
  FROM public.surveys s
  ORDER BY s.created_at DESC
  LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_surveys() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_survey_active(_survey_id uuid, _active boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin_user();

  UPDATE public.surveys
  SET is_active = _active
  WHERE id = _survey_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Survey not found';
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_survey_active(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_survey(_survey_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin_user();

  DELETE FROM public.survey_responses WHERE survey_id = _survey_id;
  DELETE FROM public.survey_visualizations WHERE survey_id = _survey_id;
  DELETE FROM public.surveys WHERE id = _survey_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_survey(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_disposable_domains()
RETURNS TABLE(domain text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin_user();
  RETURN QUERY SELECT d.domain, d.created_at FROM public.disposable_domains d ORDER BY d.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_disposable_domains() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_add_disposable_domain(_domain text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin_user();
  INSERT INTO public.disposable_domains(domain)
  VALUES (lower(trim(_domain)))
  ON CONFLICT (domain) DO NOTHING;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_add_disposable_domain(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_remove_disposable_domain(_domain text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin_user();
  DELETE FROM public.disposable_domains WHERE domain = lower(trim(_domain));
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remove_disposable_domain(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_open_flags()
RETURNS SETOF public.review_flags
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin_user();
  RETURN QUERY SELECT * FROM public.review_flags WHERE resolved = false ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_open_flags() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_resolve_flag(_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin_user();
  UPDATE public.review_flags SET resolved = true WHERE id = _id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_resolve_flag(uuid) TO authenticated;