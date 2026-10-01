CREATE TABLE public.school_survey_tracking_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('department', 'university')),
  department text,
  granted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT school_tracking_department_scope CHECK (
    (scope = 'department' AND department IS NOT NULL AND btrim(department) <> '')
    OR (scope = 'university' AND department IS NULL)
  )
);

GRANT ALL ON public.school_survey_tracking_grants TO service_role;

ALTER TABLE public.school_survey_tracking_grants ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX school_tracking_one_active_grant
  ON public.school_survey_tracking_grants (school_id, survey_id, recipient_user_id)
  WHERE revoked_at IS NULL;
CREATE INDEX school_tracking_recipient_active
  ON public.school_survey_tracking_grants (recipient_user_id, survey_id)
  WHERE revoked_at IS NULL;
CREATE INDEX school_tracking_school_active
  ON public.school_survey_tracking_grants (school_id, survey_id)
  WHERE revoked_at IS NULL;

CREATE TRIGGER school_survey_tracking_grants_updated_at
BEFORE UPDATE ON public.school_survey_tracking_grants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.school_domain_matches(_actual text, _school text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(_actual, '')) = lower(coalesce(_school, ''))
      OR lower(coalesce(_actual, '')) LIKE '%.' || lower(coalesce(_school, ''))
$$;

REVOKE ALL ON FUNCTION public.school_domain_matches(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_domain_matches(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.school_survey_is_linked(_survey_id uuid, _school_domain text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.surveys s
    LEFT JOIN public.profiles creator ON creator.id = s.creator_id
    WHERE s.id = _survey_id
      AND (
        public.school_domain_matches(creator.university_domain, _school_domain)
        OR public.school_domain_matches(s.university_domain, _school_domain)
        OR EXISTS (
          SELECT 1 FROM unnest(coalesce(s.target_universities, '{}'::text[])) target_domain
          WHERE public.school_domain_matches(target_domain, _school_domain)
             OR public.school_domain_matches(_school_domain, target_domain)
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.school_survey_is_linked(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_survey_is_linked(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.school_admin_tracking_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _school public.schools%ROWTYPE;
  _surveys jsonb;
  _grants jsonb;
  _departments jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _school
  FROM public.schools s
  WHERE s.admin_user_id = _uid
    AND s.is_active = true
    AND s.subscription_status IN ('trial', 'active')
    AND (s.valid_until IS NULL OR s.valid_until > now())
  ORDER BY s.created_at
  LIMIT 1;

  IF _school.id IS NULL THEN
    RETURN jsonb_build_object('canManage', false, 'surveys', '[]'::jsonb, 'grants', '[]'::jsonb, 'departments', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'title', s.title,
    'responseCount', s.response_count,
    'responseGoal', s.response_goal,
    'isActive', s.is_active AND s.expires_at > now(),
    'expiresAt', s.expires_at,
    'targetDepartment', s.target_department
  ) ORDER BY s.created_at DESC), '[]'::jsonb)
  INTO _surveys
  FROM public.surveys s
  WHERE public.school_survey_is_linked(s.id, _school.domain);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', g.id,
    'surveyId', g.survey_id,
    'surveyTitle', s.title,
    'recipientEmail', lower(u.email),
    'scope', g.scope,
    'department', g.department,
    'createdAt', g.created_at
  ) ORDER BY g.created_at DESC), '[]'::jsonb)
  INTO _grants
  FROM public.school_survey_tracking_grants g
  JOIN public.surveys s ON s.id = g.survey_id
  JOIN auth.users u ON u.id = g.recipient_user_id
  WHERE g.school_id = _school.id AND g.revoked_at IS NULL;

  SELECT coalesce(jsonb_agg(d.department ORDER BY d.department), '[]'::jsonb)
  INTO _departments
  FROM (
    SELECT DISTINCT btrim(p.department) AS department
    FROM public.profiles p
    WHERE p.user_type = 'student'
      AND public.school_domain_matches(p.university_domain, _school.domain)
      AND coalesce(btrim(p.department), '') <> ''
  ) d;

  RETURN jsonb_build_object(
    'canManage', true,
    'schoolName', _school.name,
    'surveys', _surveys,
    'grants', _grants,
    'departments', _departments
  );
END;
$$;

REVOKE ALL ON FUNCTION public.school_admin_tracking_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_admin_tracking_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.school_admin_grant_survey_tracking(
  _survey_id uuid,
  _recipient_email text,
  _scope text,
  _department text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _school public.schools%ROWTYPE;
  _recipient auth.users%ROWTYPE;
  _recipient_domain text;
  _grant_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _scope NOT IN ('department', 'university') THEN RAISE EXCEPTION 'Choose department or university access'; END IF;
  IF _scope = 'department' AND coalesce(btrim(_department), '') = '' THEN RAISE EXCEPTION 'Choose a department'; END IF;

  SELECT * INTO _school
  FROM public.schools s
  WHERE s.admin_user_id = _uid
    AND s.is_active = true
    AND s.subscription_status IN ('trial', 'active')
    AND (s.valid_until IS NULL OR s.valid_until > now())
  ORDER BY s.created_at
  LIMIT 1;
  IF _school.id IS NULL THEN RAISE EXCEPTION 'An active school partnership is required'; END IF;

  IF NOT public.school_survey_is_linked(_survey_id, _school.domain) THEN
    RAISE EXCEPTION 'This survey is not linked to your school';
  END IF;

  SELECT * INTO _recipient
  FROM auth.users u
  WHERE lower(u.email) = lower(btrim(_recipient_email))
  LIMIT 1;
  IF _recipient.id IS NULL THEN RAISE EXCEPTION 'No registered account uses this email'; END IF;
  IF _recipient.email_confirmed_at IS NULL THEN RAISE EXCEPTION 'The recipient must confirm their email first'; END IF;

  _recipient_domain := lower(split_part(_recipient.email, '@', 2));
  IF NOT public.school_domain_matches(_recipient_domain, _school.domain) THEN
    RAISE EXCEPTION 'The recipient must use an email from your school';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _recipient.id AND public.school_domain_matches(p.university_domain, _school.domain)
  ) THEN
    RAISE EXCEPTION 'The recipient must have a CampusVerify profile for your school';
  END IF;

  IF _scope = 'department' AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_type = 'student'
      AND public.school_domain_matches(p.university_domain, _school.domain)
      AND lower(btrim(p.department)) = lower(btrim(_department))
  ) THEN
    RAISE EXCEPTION 'Choose a department registered at your school';
  END IF;

  INSERT INTO public.school_survey_tracking_grants (
    school_id, survey_id, recipient_user_id, scope, department, granted_by
  ) VALUES (
    _school.id,
    _survey_id,
    _recipient.id,
    _scope,
    CASE WHEN _scope = 'department' THEN btrim(_department) ELSE NULL END,
    _uid
  )
  ON CONFLICT (school_id, survey_id, recipient_user_id) WHERE revoked_at IS NULL
  DO UPDATE SET
    scope = EXCLUDED.scope,
    department = EXCLUDED.department,
    granted_by = EXCLUDED.granted_by,
    updated_at = now()
  RETURNING id INTO _grant_id;

  RETURN _grant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.school_admin_grant_survey_tracking(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_admin_grant_survey_tracking(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.school_admin_revoke_survey_tracking(_grant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.school_survey_tracking_grants g
  SET revoked_at = now(), updated_at = now()
  FROM public.schools s
  WHERE g.id = _grant_id
    AND s.id = g.school_id
    AND s.admin_user_id = _uid
    AND g.revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tracking grant not found'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.school_admin_revoke_survey_tracking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_admin_revoke_survey_tracking(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_school_tracking_grants()
RETURNS TABLE (
  survey_id uuid,
  title text,
  creator_name text,
  response_count integer,
  response_goal integer,
  is_active boolean,
  expires_at timestamptz,
  scope text,
  department text,
  school_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.title, creator.full_name, s.response_count, s.response_goal,
         (s.is_active AND s.expires_at > now()), s.expires_at, g.scope, g.department, sc.name
  FROM public.school_survey_tracking_grants g
  JOIN public.schools sc ON sc.id = g.school_id
  JOIN public.surveys s ON s.id = g.survey_id
  LEFT JOIN public.profiles creator ON creator.id = s.creator_id
  WHERE g.recipient_user_id = auth.uid()
    AND g.revoked_at IS NULL
    AND sc.is_active = true
    AND sc.subscription_status IN ('trial', 'active')
    AND (sc.valid_until IS NULL OR sc.valid_until > now())
    AND public.school_survey_is_linked(s.id, sc.domain)
  ORDER BY g.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.list_my_school_tracking_grants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_school_tracking_grants() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_school_tracking_scope(_survey_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((
    SELECT jsonb_build_object(
      'hasGrant', true,
      'surveyId', s.id,
      'title', s.title,
      'creatorName', creator.full_name,
      'universityDomain', sc.domain,
      'responseCount', s.response_count,
      'responseGoal', s.response_goal,
      'scope', g.scope,
      'department', g.department,
      'schoolName', sc.name
    )
    FROM public.school_survey_tracking_grants g
    JOIN public.schools sc ON sc.id = g.school_id
    JOIN public.surveys s ON s.id = g.survey_id
    LEFT JOIN public.profiles creator ON creator.id = s.creator_id
    WHERE g.recipient_user_id = auth.uid()
      AND g.survey_id = _survey_id
      AND g.revoked_at IS NULL
      AND sc.is_active = true
      AND sc.subscription_status IN ('trial', 'active')
      AND (sc.valid_until IS NULL OR sc.valid_until > now())
      AND public.school_survey_is_linked(s.id, sc.domain)
    LIMIT 1
  ), jsonb_build_object('hasGrant', false))
$$;

REVOKE ALL ON FUNCTION public.get_my_school_tracking_scope(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_school_tracking_scope(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_school_tracking_roster(_survey_id uuid)
RETURNS TABLE (index_number text, department text, response_status text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _grant public.school_survey_tracking_grants%ROWTYPE;
  _school public.schools%ROWTYPE;
  _survey public.surveys%ROWTYPE;
BEGIN
  SELECT g.* INTO _grant
  FROM public.school_survey_tracking_grants g
  JOIN public.schools sc ON sc.id = g.school_id
  WHERE g.recipient_user_id = auth.uid()
    AND g.survey_id = _survey_id
    AND g.revoked_at IS NULL
    AND sc.is_active = true
    AND sc.subscription_status IN ('trial', 'active')
    AND (sc.valid_until IS NULL OR sc.valid_until > now())
  LIMIT 1;
  IF _grant.id IS NULL THEN RAISE EXCEPTION 'Tracking access required'; END IF;

  SELECT * INTO _school FROM public.schools WHERE id = _grant.school_id;
  SELECT * INTO _survey FROM public.surveys WHERE id = _survey_id;
  IF _survey.id IS NULL OR NOT public.school_survey_is_linked(_survey_id, _school.domain) THEN
    RAISE EXCEPTION 'Survey is no longer available for school tracking';
  END IF;

  RETURN QUERY
  SELECT p.index_number,
         nullif(btrim(p.department), ''),
         CASE
           WHEN EXISTS (SELECT 1 FROM public.survey_responses sr WHERE sr.survey_id = _survey_id AND sr.respondent_id = p.id) THEN 'responded'
           WHEN EXISTS (SELECT 1 FROM public.survey_response_starts ss WHERE ss.survey_id = _survey_id AND ss.user_id = p.id) THEN 'responding'
           ELSE 'not_started'
         END
  FROM public.profiles p
  WHERE p.user_type = 'student'
    AND p.id <> _survey.creator_id
    AND public.school_domain_matches(p.university_domain, _school.domain)
    AND public.is_student_eligible(p.id)
    AND coalesce(btrim(p.index_number), '') <> ''
    AND (_grant.scope = 'university' OR lower(btrim(p.department)) = lower(btrim(_grant.department)))
    AND (NOT ('department' = ANY (_survey.required_criteria)) OR public.target_text_matches(_survey.target_department, p.department))
    AND (NOT ('year' = ANY (_survey.required_criteria)) OR public.target_text_matches(_survey.target_year, p.year))
    AND (NOT ('country' = ANY (_survey.required_criteria)) OR public.target_text_matches(_survey.target_country, p.country))
    AND (NOT ('age_range' = ANY (_survey.required_criteria)) OR public.target_text_matches(_survey.target_age_range, p.age_range))
    AND (NOT ('interests' = ANY (_survey.required_criteria))
         OR _survey.target_interests IS NULL
         OR cardinality(_survey.target_interests) = 0
         OR _survey.target_interests && p.interests)
    AND (NOT ('universities' = ANY (_survey.required_criteria))
         OR _survey.target_universities IS NULL
         OR cardinality(_survey.target_universities) = 0
         OR EXISTS (
           SELECT 1 FROM unnest(_survey.target_universities) target_domain
           WHERE public.school_domain_matches(p.university_domain, target_domain)
              OR public.school_domain_matches(target_domain, p.university_domain)
         ))
  ORDER BY p.department, p.index_number;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_school_tracking_roster(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_school_tracking_roster(uuid) TO authenticated;