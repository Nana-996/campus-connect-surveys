CREATE OR REPLACE FUNCTION public.get_my_school_admin_overview()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE s record; result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id, name, domain, subscription_status, valid_until INTO s
  FROM public.schools WHERE admin_user_id = auth.uid() LIMIT 1;
  IF s.id IS NULL THEN RETURN jsonb_build_object('isSchoolAdmin', false); END IF;

  WITH st AS (
    SELECT p.id, p.full_name, p.department, p.year, p.index_number, p.created_at, p.graduation_date, p.is_flagged
    FROM public.profiles p
    WHERE p.user_type = 'student'
      AND (lower(p.university_domain) = lower(s.domain) OR lower(p.university_domain) LIKE '%.' || lower(s.domain))
  ), sv AS (
    SELECT su.id, su.title, su.response_count, su.response_goal, su.is_active, su.expires_at, su.created_at, su.target_department
    FROM public.surveys su
    WHERE (lower(su.university_domain) = lower(s.domain) OR lower(su.university_domain) LIKE '%.' || lower(s.domain))
  )
  SELECT jsonb_build_object(
    'isSchoolAdmin', true,
    'school', jsonb_build_object('name', s.name, 'domain', s.domain, 'status', s.subscription_status, 'validUntil', s.valid_until),
    'students', COALESCE((SELECT jsonb_agg(to_jsonb(st) ORDER BY st.created_at DESC) FROM st), '[]'::jsonb),
    'surveys', COALESCE((SELECT jsonb_agg(to_jsonb(sv) ORDER BY sv.created_at DESC) FROM sv), '[]'::jsonb),
    'departments', COALESCE((SELECT jsonb_agg(jsonb_build_object('department', d, 'count', c) ORDER BY c DESC)
       FROM (SELECT COALESCE(NULLIF(trim(department),''),'Unspecified') d, count(*) c FROM st GROUP BY 1) x), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.get_my_school_admin_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_school_admin_overview() TO authenticated;