
-- Widen survey list for admins and faculty
CREATE OR REPLACE FUNCTION public.list_university_surveys()
 RETURNS TABLE(id uuid, title text, creator_name text, response_count integer, response_goal integer, is_active boolean, created_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid(); _domain text;
  _is_admin boolean; _is_manager boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _is_admin := public.has_role(_uid, 'admin'::public.app_role);
  _is_manager := public.has_role(_uid, 'manager'::public.app_role);
  IF NOT (_is_admin OR _is_manager) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT university_domain INTO _domain FROM public.profiles WHERE profiles.id = _uid;

  RETURN QUERY
    SELECT s.id, s.title,
           COALESCE(p.full_name, 'Unknown') AS creator_name,
           s.response_count, s.response_goal, s.is_active,
           s.created_at, s.expires_at
    FROM public.surveys s
    LEFT JOIN public.profiles p ON p.id = s.creator_id
    WHERE _is_admin
       OR s.university_domain = _domain
       OR p.university_domain = _domain
    ORDER BY s.created_at DESC
    LIMIT 1000;
END;
$function$;

-- Anonymized response viewer for admins/faculty
CREATE OR REPLACE FUNCTION public.get_survey_responses_for_manager(_survey_id uuid)
 RETURNS TABLE(
   response_id uuid,
   created_at timestamp with time zone,
   duration_ms bigint,
   quality_score numeric,
   answers jsonb,
   is_identified boolean,
   respondent_label text,
   full_name text,
   index_number text,
   department text,
   year text,
   user_type text
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid(); _domain text;
  _is_admin boolean; _is_manager boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _is_admin := public.has_role(_uid, 'admin'::public.app_role);
  _is_manager := public.has_role(_uid, 'manager'::public.app_role);
  IF NOT (_is_admin OR _is_manager) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT university_domain INTO _domain FROM public.profiles WHERE profiles.id = _uid;

  -- Managers may only view surveys associated with their university
  IF NOT _is_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.surveys s
      LEFT JOIN public.profiles p ON p.id = s.creator_id
      WHERE s.id = _survey_id
        AND (s.university_domain = _domain OR p.university_domain = _domain)
    ) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  RETURN QUERY
    SELECT
      r.id AS response_id,
      r.created_at,
      r.duration_ms,
      r.quality_score,
      r.answers,
      -- Identified when admin sees a student, or manager sees a student from same domain
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

GRANT EXECUTE ON FUNCTION public.get_survey_responses_for_manager(uuid) TO authenticated;
