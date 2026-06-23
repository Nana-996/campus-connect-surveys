
CREATE TABLE IF NOT EXISTS public.faculty_student_watchlist (
  faculty_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (faculty_user_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS idx_fsw_faculty ON public.faculty_student_watchlist(faculty_user_id);
CREATE INDEX IF NOT EXISTS idx_fsw_student ON public.faculty_student_watchlist(student_user_id);

GRANT SELECT, INSERT, DELETE ON public.faculty_student_watchlist TO authenticated;
GRANT ALL ON public.faculty_student_watchlist TO service_role;

ALTER TABLE public.faculty_student_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty read own watchlist"
  ON public.faculty_student_watchlist FOR SELECT
  TO authenticated
  USING (faculty_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Faculty add own watchlist"
  ON public.faculty_student_watchlist FOR INSERT
  TO authenticated
  WITH CHECK (
    faculty_user_id = auth.uid()
    AND public.has_role(auth.uid(), 'faculty'::public.app_role)
  );

CREATE POLICY "Faculty remove own watchlist"
  ON public.faculty_student_watchlist FOR DELETE
  TO authenticated
  USING (faculty_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.faculty_search_student_by_index(_index_number text)
RETURNS TABLE(student_id uuid, full_name text, index_number text, department text, year text, already_on_watchlist boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _domain text;
  _norm text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'faculty'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: faculty only';
  END IF;
  _norm := lower(trim(coalesce(_index_number, '')));
  IF length(_norm) = 0 THEN RETURN; END IF;

  SELECT university_domain INTO _domain FROM public.profiles WHERE id = _uid;

  RETURN QUERY
  SELECT p.id, p.full_name, p.index_number, p.department, p.year,
         EXISTS (
           SELECT 1 FROM public.faculty_student_watchlist w
           WHERE w.faculty_user_id = _uid AND w.student_user_id = p.id
         )
  FROM public.profiles p
  WHERE p.user_type = 'student'
    AND p.university_domain = _domain
    AND lower(p.index_number) = _norm
  LIMIT 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.faculty_add_to_watchlist(_student_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _my_domain text; _student_domain text; _student_type text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'faculty'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: faculty only';
  END IF;

  SELECT university_domain INTO _my_domain FROM public.profiles WHERE id = _uid;
  SELECT university_domain, user_type INTO _student_domain, _student_type
    FROM public.profiles WHERE id = _student_user_id;

  IF _student_type IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  IF _student_type <> 'student' THEN RAISE EXCEPTION 'That user is not a student'; END IF;
  IF _student_domain IS DISTINCT FROM _my_domain THEN
    RAISE EXCEPTION 'You can only add students from your university';
  END IF;

  INSERT INTO public.faculty_student_watchlist(faculty_user_id, student_user_id)
  VALUES (_uid, _student_user_id)
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.faculty_remove_from_watchlist(_student_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.faculty_student_watchlist
    WHERE faculty_user_id = _uid AND student_user_id = _student_user_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.faculty_list_watchlist()
RETURNS TABLE(
  student_id uuid,
  full_name text,
  index_number text,
  department text,
  year text,
  added_at timestamptz,
  surveys_responded bigint,
  last_activity timestamptz,
  surveys_available bigint,
  surveys_pending bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _domain text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'faculty'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: faculty only';
  END IF;

  SELECT university_domain INTO _domain FROM public.profiles WHERE id = _uid;

  RETURN QUERY
  WITH roster AS (
    SELECT w.student_user_id, w.added_at, p.full_name, p.index_number, p.department, p.year
    FROM public.faculty_student_watchlist w
    JOIN public.profiles p ON p.id = w.student_user_id
    WHERE w.faculty_user_id = _uid
  ),
  resp AS (
    SELECT r.respondent_id,
           COUNT(DISTINCT r.survey_id) AS responded_count,
           MAX(r.created_at) AS last_at
    FROM public.survey_responses r
    WHERE r.respondent_id IN (SELECT student_user_id FROM roster)
    GROUP BY r.respondent_id
  ),
  available AS (
    SELECT r.student_user_id,
           (SELECT COUNT(*) FROM public.surveys s
              WHERE s.university_domain = _domain
                AND s.is_active = true
                AND (s.target_department IS NULL OR s.target_department = r.department)
                AND (s.target_year IS NULL OR s.target_year = r.year)
           ) AS avail
    FROM roster r
  )
  SELECT
    r.student_user_id,
    r.full_name,
    r.index_number,
    r.department,
    r.year,
    r.added_at,
    COALESCE(resp.responded_count, 0)::bigint,
    resp.last_at,
    COALESCE(a.avail, 0)::bigint,
    GREATEST(0, COALESCE(a.avail, 0) - COALESCE(resp.responded_count, 0))::bigint
  FROM roster r
  LEFT JOIN resp ON resp.respondent_id = r.student_user_id
  LEFT JOIN available a ON a.student_user_id = r.student_user_id
  ORDER BY r.full_name NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.faculty_get_student_detail(_student_user_id uuid)
RETURNS TABLE(
  survey_id uuid,
  title text,
  creator_name text,
  is_active boolean,
  created_at timestamptz,
  expires_at timestamptz,
  target_department text,
  target_year text,
  responded boolean,
  responded_at timestamptz,
  quality_score numeric,
  duration_ms bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _domain text;
  _student_dept text;
  _student_year text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'faculty'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: faculty only';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.faculty_student_watchlist
    WHERE faculty_user_id = _uid AND student_user_id = _student_user_id
  ) THEN
    RAISE EXCEPTION 'Student not on your watchlist';
  END IF;

  SELECT university_domain INTO _domain FROM public.profiles WHERE id = _uid;
  SELECT department, year
    INTO _student_dept, _student_year
    FROM public.profiles WHERE id = _student_user_id;

  RETURN QUERY
  SELECT
    s.id,
    s.title,
    COALESCE(cp.full_name, 'Unknown'),
    s.is_active,
    s.created_at,
    s.expires_at,
    s.target_department,
    s.target_year,
    (r.id IS NOT NULL) AS responded,
    r.created_at,
    r.quality_score,
    r.duration_ms
  FROM public.surveys s
  LEFT JOIN public.profiles cp ON cp.id = s.creator_id
  LEFT JOIN public.survey_responses r
    ON r.survey_id = s.id AND r.respondent_id = _student_user_id
  WHERE s.university_domain = _domain
    AND (s.target_department IS NULL OR s.target_department = _student_dept)
    AND (s.target_year IS NULL OR s.target_year = _student_year)
  ORDER BY responded DESC NULLS LAST, s.created_at DESC
  LIMIT 1000;
END;
$$;
