
CREATE OR REPLACE FUNCTION public.is_student_eligible(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.user_type = 'student') THEN true
    ELSE NOT public.is_alumni(_user_id)
  END
$$;

REVOKE ALL ON FUNCTION public.is_student_eligible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_student_eligible(uuid) TO authenticated, service_role;

-- Surveys: expired students cannot create campus-only or campus-targeted surveys
DROP POLICY IF EXISTS "Surveys: insert own" ON public.surveys;
CREATE POLICY "Surveys: insert own"
ON public.surveys
FOR INSERT
TO authenticated
WITH CHECK (
  creator_id = auth.uid()
  AND university_domain = public.current_university_domain()
  AND (
    public.is_student_eligible(auth.uid())
    OR (
      allow_general_respondents = true
      AND coalesce(target_department, '') = ''
      AND coalesce(target_year, '') = ''
    )
  )
);

-- Response starts: expired students cannot start campus-only surveys
DROP POLICY IF EXISTS "Users insert own response starts" ON public.survey_response_starts;
CREATE POLICY "Users insert own response starts"
ON public.survey_response_starts
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_student_eligible(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_id AND s.allow_general_respondents = true
    )
  )
);

-- Response submission: expired students cannot submit to campus-only surveys
DROP POLICY IF EXISTS "Responses: insert allowed" ON public.survey_responses;
CREATE POLICY "Responses: insert allowed"
ON public.survey_responses
FOR INSERT
TO authenticated
WITH CHECK (
  respondent_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_responses.survey_id
      AND s.is_active = true
      AND s.creator_id <> auth.uid()
      AND s.expires_at > now()
      AND s.response_count < s.response_goal
      AND (s.university_domain = public.current_university_domain() OR s.allow_general_respondents = true)
      AND (public.is_student_eligible(auth.uid()) OR s.allow_general_respondents = true)
  )
);

-- Friendly server-side error for expired students starting a campus-only survey
CREATE OR REPLACE FUNCTION public.begin_survey_response(_survey_id uuid)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _started timestamptz; _general boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT allow_general_respondents INTO _general
    FROM public.surveys WHERE id = _survey_id AND is_active = true;
  IF _general IS NULL THEN RAISE EXCEPTION 'Survey not available'; END IF;
  IF NOT public.is_student_eligible(_uid) AND _general = false THEN
    RAISE EXCEPTION 'Your student access has expired, so campus-only surveys are no longer available to you.';
  END IF;
  INSERT INTO public.survey_response_starts(user_id, survey_id)
    VALUES (_uid, _survey_id)
    ON CONFLICT (user_id, survey_id) DO NOTHING;
  SELECT started_at INTO _started
    FROM public.survey_response_starts
    WHERE user_id = _uid AND survey_id = _survey_id;
  RETURN _started;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_survey_response(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.begin_survey_response(uuid) TO authenticated, service_role;
