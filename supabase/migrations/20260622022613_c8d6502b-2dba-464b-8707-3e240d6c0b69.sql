CREATE OR REPLACE FUNCTION public.get_my_manager_scope()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _profile record;
  _is_admin boolean := false;
  _is_manager boolean := false;
  _has_tracking_grant boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.university_domain, p.university_name
    INTO _profile
    FROM public.profiles p
    WHERE p.id = _uid;

  _is_admin := public.has_role(_uid, 'admin'::public.app_role)
    OR public.current_user_matches_admin_email();
  _is_manager := public.has_role(_uid, 'manager'::public.app_role);

  SELECT EXISTS (
    SELECT 1
    FROM public.survey_tracking_access sta
    WHERE sta.faculty_user_id = _uid
  ) INTO _has_tracking_grant;

  RETURN jsonb_build_object(
    'isAdmin', _is_admin,
    'isManager', _is_manager,
    'hasTrackingGrant', _has_tracking_grant,
    'canAccess', (_is_admin OR _is_manager OR _has_tracking_grant),
    'university_domain', _profile.university_domain,
    'university_name', _profile.university_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_manager_scope() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_manager_scope() TO service_role;

CREATE OR REPLACE FUNCTION public.get_survey_tracking_scope(_survey_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _domain text;
  _survey record;
  _is_admin boolean := false;
  _is_manager boolean := false;
  _has_tracking_grant boolean := false;
  _can_track boolean := false;
  _can_see_answers boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.university_domain
    INTO _domain
    FROM public.profiles p
    WHERE p.id = _uid;

  SELECT
    s.id,
    s.title,
    s.university_domain,
    s.response_count,
    s.response_goal,
    cp.university_domain AS creator_domain,
    COALESCE(cp.full_name, 'Unknown') AS creator_name
    INTO _survey
    FROM public.surveys s
    LEFT JOIN public.profiles cp ON cp.id = s.creator_id
    WHERE s.id = _survey_id;

  IF _survey.id IS NULL THEN
    RAISE EXCEPTION 'Survey not found';
  END IF;

  _is_admin := public.has_role(_uid, 'admin'::public.app_role)
    OR public.current_user_matches_admin_email();
  _is_manager := public.has_role(_uid, 'manager'::public.app_role);

  SELECT EXISTS (
    SELECT 1
    FROM public.survey_tracking_access sta
    WHERE sta.survey_id = _survey_id
      AND sta.faculty_user_id = _uid
  ) INTO _has_tracking_grant;

  _can_track := public.can_track_survey(_survey_id, _uid);
  _can_see_answers := _is_admin OR (
    _is_manager AND (_survey.university_domain = _domain OR _survey.creator_domain = _domain)
  );

  RETURN jsonb_build_object(
    'surveyId', _survey.id,
    'title', _survey.title,
    'creatorName', _survey.creator_name,
    'universityDomain', _survey.university_domain,
    'responseCount', _survey.response_count,
    'responseGoal', _survey.response_goal,
    'isAdmin', _is_admin,
    'isManager', _is_manager,
    'hasTrackingGrant', _has_tracking_grant,
    'canTrack', _can_track,
    'canSeeAnswers', _can_see_answers
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_survey_tracking_scope(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_survey_tracking_scope(uuid) TO service_role;