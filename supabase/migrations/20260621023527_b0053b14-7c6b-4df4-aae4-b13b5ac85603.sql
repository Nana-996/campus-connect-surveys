CREATE OR REPLACE FUNCTION public.can_track_survey(_survey_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _domain text;
  _survey_domain text;
  _creator_domain text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.has_role(_user_id, 'admin'::public.app_role)
     OR (_user_id = auth.uid() AND public.current_user_matches_admin_email()) THEN
    RETURN true;
  END IF;

  SELECT university_domain INTO _domain FROM public.profiles WHERE id = _user_id;
  SELECT s.university_domain, p.university_domain
    INTO _survey_domain, _creator_domain
    FROM public.surveys s
    LEFT JOIN public.profiles p ON p.id = s.creator_id
    WHERE s.id = _survey_id;

  IF _survey_domain IS NULL THEN
    RETURN false;
  END IF;

  IF public.has_role(_user_id, 'manager'::public.app_role)
     AND (_survey_domain = _domain OR _creator_domain = _domain) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.survey_tracking_access sta
    WHERE sta.survey_id = _survey_id
      AND sta.faculty_user_id = _user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_survey_questions_for_tracker(_survey_id uuid)
RETURNS TABLE(id uuid, title text, questions jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_track_survey(_survey_id, auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT s.id, s.title, s.questions
  FROM public.surveys s
  WHERE s.id = _survey_id;
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

  IF NOT (_is_admin OR (_is_manager AND (_survey_domain = _domain OR _creator_domain = _domain))) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
    SELECT
      r.id AS response_id,
      r.created_at,
      r.duration_ms,
      r.quality_score,
      r.answers,
      (p.user_type = 'student' AND (_is_admin OR p.university_domain = _domain)) AS is_identified,
      CASE
        WHEN p.user_type = 'student' AND (_is_admin OR p.university_domain = _domain)
          THEN COALESCE(p.full_name, 'Student')
        WHEN p.user_type = 'general' THEN 'Anonymous (general)'
        ELSE 'Anonymous (other campus)'
      END AS respondent_label,
      CASE WHEN p.user_type = 'student' AND (_is_admin OR p.university_domain = _domain)
           THEN p.full_name ELSE NULL END AS full_name,
      CASE WHEN p.user_type = 'student' AND (_is_admin OR p.university_domain = _domain)
           THEN p.index_number ELSE NULL END AS index_number,
      CASE WHEN p.user_type = 'student' AND (_is_admin OR p.university_domain = _domain)
           THEN p.department ELSE NULL END AS department,
      CASE WHEN p.user_type = 'student' AND (_is_admin OR p.university_domain = _domain)
           THEN p.year ELSE NULL END AS year,
      p.user_type
    FROM public.survey_responses r
    LEFT JOIN public.profiles p ON p.id = r.respondent_id
    WHERE r.survey_id = _survey_id
    ORDER BY r.created_at DESC
    LIMIT 5000;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.can_track_survey(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_survey_questions_for_tracker(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_survey_responses_for_manager(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.can_track_survey(uuid, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.get_survey_questions_for_tracker(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_matches_admin_email() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.admin_grant_survey_tracking_access_by_email(uuid, text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.admin_revoke_survey_tracking_access(uuid, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_survey_tracking_access(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_surveys() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.list_university_surveys() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.get_university_survey_tracking(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.get_survey_responses_for_manager(uuid) FROM anon, PUBLIC;