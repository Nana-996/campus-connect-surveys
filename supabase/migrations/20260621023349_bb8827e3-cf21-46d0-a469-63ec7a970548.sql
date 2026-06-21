CREATE TABLE IF NOT EXISTS public.survey_tracking_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  faculty_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, faculty_user_id)
);

GRANT SELECT ON public.survey_tracking_access TO authenticated;
GRANT ALL ON public.survey_tracking_access TO service_role;

ALTER TABLE public.survey_tracking_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty can read own tracking grants" ON public.survey_tracking_access;
CREATE POLICY "Faculty can read own tracking grants"
ON public.survey_tracking_access
FOR SELECT
TO authenticated
USING (
  faculty_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE INDEX IF NOT EXISTS survey_tracking_access_faculty_idx
ON public.survey_tracking_access(faculty_user_id, survey_id);

CREATE INDEX IF NOT EXISTS survey_tracking_access_survey_idx
ON public.survey_tracking_access(survey_id);

CREATE OR REPLACE FUNCTION public.current_user_matches_admin_email()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(email)
    INTO _email
    FROM auth.users
    WHERE id = _uid
      AND email_confirmed_at IS NOT NULL;

  IF _email IS NULL OR _email = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN auth.users au ON au.id = ur.user_id
    WHERE ur.role = 'admin'::public.app_role
      AND lower(au.email) = _email
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.require_admin_user()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.has_role(_uid, 'admin'::public.app_role)
     OR public.current_user_matches_admin_email() THEN
    RETURN _uid;
  END IF;

  RAISE EXCEPTION 'Forbidden: admin only';
END;
$function$;

DROP FUNCTION IF EXISTS public.admin_list_surveys();
CREATE OR REPLACE FUNCTION public.admin_list_surveys()
RETURNS TABLE(
  id uuid,
  title text,
  creator_id uuid,
  creator_name text,
  university_domain text,
  tier text,
  is_active boolean,
  response_count integer,
  response_goal integer,
  created_at timestamptz,
  expires_at timestamptz,
  allow_general_respondents boolean,
  target_department text,
  target_year text,
  tracking_grants bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.require_admin_user();

  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.creator_id,
    COALESCE(p.full_name, 'Unknown') AS creator_name,
    s.university_domain,
    s.tier,
    s.is_active,
    s.response_count,
    s.response_goal,
    s.created_at,
    s.expires_at,
    s.allow_general_respondents,
    s.target_department,
    s.target_year,
    (SELECT count(*) FROM public.survey_tracking_access sta WHERE sta.survey_id = s.id) AS tracking_grants
  FROM public.surveys s
  LEFT JOIN public.profiles p ON p.id = s.creator_id
  ORDER BY s.created_at DESC
  LIMIT 500;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_grant_survey_tracking_access_by_email(_survey_id uuid, _email text)
RETURNS TABLE(user_id uuid, email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid;
  _target uuid;
  _target_email text;
BEGIN
  _actor := public.require_admin_user();

  IF NOT EXISTS (SELECT 1 FROM public.surveys WHERE id = _survey_id) THEN
    RAISE EXCEPTION 'Survey not found';
  END IF;

  SELECT au.id, lower(au.email)
    INTO _target, _target_email
    FROM auth.users au
    WHERE lower(au.email) = lower(trim(_email))
      AND au.email_confirmed_at IS NOT NULL
    ORDER BY au.last_sign_in_at DESC NULLS LAST, au.created_at DESC
    LIMIT 1;

  IF _target IS NULL THEN
    RAISE EXCEPTION 'No verified user with that email has signed up yet';
  END IF;

  INSERT INTO public.survey_tracking_access(survey_id, faculty_user_id, granted_by)
  VALUES (_survey_id, _target, _actor)
  ON CONFLICT (survey_id, faculty_user_id) DO UPDATE
  SET granted_by = EXCLUDED.granted_by;

  RETURN QUERY
  SELECT _target, _target_email, COALESCE(p.full_name, '')
  FROM public.profiles p
  WHERE p.id = _target;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_revoke_survey_tracking_access(_survey_id uuid, _faculty_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.require_admin_user();

  DELETE FROM public.survey_tracking_access
  WHERE survey_id = _survey_id
    AND faculty_user_id = _faculty_user_id;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_survey_tracking_access(_survey_id uuid)
RETURNS TABLE(user_id uuid, email text, full_name text, university_domain text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.require_admin_user();

  RETURN QUERY
  SELECT
    sta.faculty_user_id,
    au.email::text,
    COALESCE(p.full_name, '') AS full_name,
    COALESCE(p.university_domain, '') AS university_domain,
    sta.created_at
  FROM public.survey_tracking_access sta
  JOIN auth.users au ON au.id = sta.faculty_user_id
  LEFT JOIN public.profiles p ON p.id = sta.faculty_user_id
  WHERE sta.survey_id = _survey_id
  ORDER BY sta.created_at DESC;
END;
$function$;

DROP FUNCTION IF EXISTS public.list_university_surveys();
CREATE OR REPLACE FUNCTION public.list_university_surveys()
RETURNS TABLE(id uuid, title text, creator_name text, response_count integer, response_goal integer, is_active boolean, created_at timestamptz, expires_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _domain text;
  _is_admin boolean;
  _is_manager boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _is_admin := public.has_role(_uid, 'admin'::public.app_role) OR public.current_user_matches_admin_email();
  _is_manager := public.has_role(_uid, 'manager'::public.app_role);
  SELECT university_domain INTO _domain FROM public.profiles WHERE profiles.id = _uid;

  IF NOT (_is_admin OR _is_manager OR EXISTS (SELECT 1 FROM public.survey_tracking_access sta WHERE sta.faculty_user_id = _uid)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
    SELECT s.id, s.title,
           COALESCE(p.full_name, 'Unknown') AS creator_name,
           s.response_count, s.response_goal, s.is_active,
           s.created_at, s.expires_at
    FROM public.surveys s
    LEFT JOIN public.profiles p ON p.id = s.creator_id
    WHERE _is_admin
       OR (_is_manager AND (s.university_domain = _domain OR p.university_domain = _domain))
       OR EXISTS (
         SELECT 1 FROM public.survey_tracking_access sta
         WHERE sta.survey_id = s.id
           AND sta.faculty_user_id = _uid
       )
    ORDER BY s.created_at DESC
    LIMIT 1000;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_university_survey_tracking(_survey_id uuid)
RETURNS TABLE(student_id uuid, full_name text, index_number text, department text, year text, responded_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _domain text;
  _survey_domain text;
  _creator_domain text;
  _is_admin boolean;
  _is_manager boolean;
  _has_grant boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _is_admin := public.has_role(_uid, 'admin'::public.app_role) OR public.current_user_matches_admin_email();
  _is_manager := public.has_role(_uid, 'manager'::public.app_role);
  SELECT university_domain INTO _domain FROM public.profiles WHERE profiles.id = _uid;

  SELECT s.university_domain, p.university_domain
    INTO _survey_domain, _creator_domain
    FROM public.surveys s
    LEFT JOIN public.profiles p ON p.id = s.creator_id
    WHERE s.id = _survey_id;

  IF _survey_domain IS NULL THEN RAISE EXCEPTION 'Survey not found'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.survey_tracking_access sta
    WHERE sta.survey_id = _survey_id
      AND sta.faculty_user_id = _uid
  ) INTO _has_grant;

  IF NOT (
    _is_admin
    OR _has_grant
    OR (_is_manager AND (_survey_domain = _domain OR _creator_domain = _domain))
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
    SELECT p.id AS student_id, p.full_name, p.index_number, p.department, p.year,
           (SELECT MIN(r.created_at)
              FROM public.survey_responses r
              WHERE r.survey_id = _survey_id AND r.respondent_id = p.id) AS responded_at
    FROM public.profiles p
    WHERE p.user_type = 'student'
      AND p.university_domain = _survey_domain
    ORDER BY p.department NULLS LAST, p.year NULLS LAST, p.full_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_survey_responses_for_manager(_survey_id uuid)
RETURNS TABLE(response_id uuid, created_at timestamptz, duration_ms bigint, quality_score numeric, answers jsonb, is_identified boolean, respondent_label text, full_name text, index_number text, department text, year text, user_type text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _domain text;
  _survey_domain text;
  _creator_domain text;
  _is_admin boolean;
  _is_manager boolean;
  _has_grant boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _is_admin := public.has_role(_uid, 'admin'::public.app_role) OR public.current_user_matches_admin_email();
  _is_manager := public.has_role(_uid, 'manager'::public.app_role);
  SELECT university_domain INTO _domain FROM public.profiles WHERE profiles.id = _uid;

  SELECT s.university_domain, p.university_domain
    INTO _survey_domain, _creator_domain
    FROM public.surveys s
    LEFT JOIN public.profiles p ON p.id = s.creator_id
    WHERE s.id = _survey_id;

  IF _survey_domain IS NULL THEN RAISE EXCEPTION 'Survey not found'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.survey_tracking_access sta
    WHERE sta.survey_id = _survey_id
      AND sta.faculty_user_id = _uid
  ) INTO _has_grant;

  IF NOT (
    _is_admin
    OR _has_grant
    OR (_is_manager AND (_survey_domain = _domain OR _creator_domain = _domain))
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
    SELECT
      r.id AS response_id,
      r.created_at,
      r.duration_ms,
      r.quality_score,
      r.answers,
      (p.user_type = 'student' AND (_is_admin OR _has_grant OR p.university_domain = _domain)) AS is_identified,
      CASE
        WHEN p.user_type = 'student' AND (_is_admin OR _has_grant OR p.university_domain = _domain)
          THEN COALESCE(p.full_name, 'Student')
        WHEN p.user_type = 'general' THEN 'Anonymous (general)'
        ELSE 'Anonymous (other campus)'
      END AS respondent_label,
      CASE WHEN p.user_type = 'student' AND (_is_admin OR _has_grant OR p.university_domain = _domain)
           THEN p.full_name ELSE NULL END AS full_name,
      CASE WHEN p.user_type = 'student' AND (_is_admin OR _has_grant OR p.university_domain = _domain)
           THEN p.index_number ELSE NULL END AS index_number,
      CASE WHEN p.user_type = 'student' AND (_is_admin OR _has_grant OR p.university_domain = _domain)
           THEN p.department ELSE NULL END AS department,
      CASE WHEN p.user_type = 'student' AND (_is_admin OR _has_grant OR p.university_domain = _domain)
           THEN p.year ELSE NULL END AS year,
      p.user_type
    FROM public.survey_responses r
    LEFT JOIN public.profiles p ON p.id = r.respondent_id
    WHERE r.survey_id = _survey_id
    ORDER BY r.created_at DESC
    LIMIT 5000;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.current_user_matches_admin_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_survey_tracking_access_by_email(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_survey_tracking_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_survey_tracking_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_surveys() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_university_surveys() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_university_survey_tracking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_survey_responses_for_manager(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_grant_survey_tracking_access_by_email(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_revoke_survey_tracking_access(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_survey_tracking_access(uuid) FROM PUBLIC;