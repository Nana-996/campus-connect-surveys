-- 1. Required vs preferred targeting
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS required_criteria text[] NOT NULL DEFAULT '{}'::text[];

-- 2. Forgiving text comparison helper
CREATE OR REPLACE FUNCTION public.target_text_matches(_target text, _actual text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _target IS NULL
      OR btrim(_target) = ''
      OR lower(btrim(_target)) = lower(btrim(coalesce(_actual, '')))
$$;

REVOKE ALL ON FUNCTION public.target_text_matches(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.target_text_matches(text, text) TO authenticated, anon, service_role;

-- 3. Backfill: keep department/year strict, relax country/age/interests
UPDATE public.surveys
SET required_criteria = (
  SELECT coalesce(array_agg(c), '{}'::text[]) FROM (
    SELECT 'department'::text AS c WHERE coalesce(btrim(target_department), '') <> ''
    UNION ALL
    SELECT 'year' WHERE coalesce(btrim(target_year), '') <> ''
  ) x
)
WHERE required_criteria = '{}'::text[];

-- 4. New visibility policy
DROP POLICY IF EXISTS "Surveys: read visible" ON public.surveys;
CREATE POLICY "Surveys: read visible"
ON public.surveys
FOR SELECT
USING (
  creator_id = auth.uid()
  OR (
    (university_domain = public.current_university_domain() OR allow_general_respondents = true)
    AND (NOT ('department' = ANY (required_criteria)) OR public.target_text_matches(target_department, public.current_department()))
    AND (NOT ('year'       = ANY (required_criteria)) OR public.target_text_matches(target_year, public.current_year()))
    AND (NOT ('country'    = ANY (required_criteria)) OR public.target_text_matches(target_country, public.current_country()))
    AND (NOT ('age_range'  = ANY (required_criteria)) OR public.target_text_matches(target_age_range, public.current_age_range()))
    AND (NOT ('interests'  = ANY (required_criteria))
         OR target_interests IS NULL
         OR cardinality(target_interests) = 0
         OR target_interests && public.current_interests())
  )
);

-- 5. Mirror the same rules on answering
DROP POLICY IF EXISTS "Responses: insert allowed" ON public.survey_responses;
CREATE POLICY "Responses: insert allowed"
ON public.survey_responses
FOR INSERT
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
      AND (NOT ('department' = ANY (s.required_criteria)) OR public.target_text_matches(s.target_department, public.current_department()))
      AND (NOT ('year'       = ANY (s.required_criteria)) OR public.target_text_matches(s.target_year, public.current_year()))
      AND (NOT ('country'    = ANY (s.required_criteria)) OR public.target_text_matches(s.target_country, public.current_country()))
      AND (NOT ('age_range'  = ANY (s.required_criteria)) OR public.target_text_matches(s.target_age_range, public.current_age_range()))
      AND (NOT ('interests'  = ANY (s.required_criteria))
           OR s.target_interests IS NULL
           OR cardinality(s.target_interests) = 0
           OR s.target_interests && public.current_interests())
  )
);

-- 6. Audience reach estimator (counts only, no PII)
CREATE OR REPLACE FUNCTION public.estimate_survey_reach(
  _allow_general boolean,
  _department text DEFAULT NULL,
  _year text DEFAULT NULL,
  _country text DEFAULT NULL,
  _age_range text DEFAULT NULL,
  _interests text[] DEFAULT '{}'::text[],
  _required text[] DEFAULT '{}'::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _domain text := public.current_university_domain();
  _pool int;
  _eligible int;
  _perfect int;
BEGIN
  IF _me IS NULL THEN
    RETURN jsonb_build_object('pool', 0, 'eligible', 0, 'perfect', 0);
  END IF;

  WITH base AS (
    SELECT p.*
    FROM public.profiles p
    WHERE p.id <> _me
      AND (_allow_general OR p.university_domain = _domain)
      AND (_allow_general OR public.is_student_eligible(p.id))
  ), scored AS (
    SELECT
      (NOT ('department' = ANY (_required)) OR public.target_text_matches(_department, b.department)) AS r_dept,
      (NOT ('year'       = ANY (_required)) OR public.target_text_matches(_year, b.year))             AS r_year,
      (NOT ('country'    = ANY (_required)) OR public.target_text_matches(_country, b.country))       AS r_country,
      (NOT ('age_range'  = ANY (_required)) OR public.target_text_matches(_age_range, b.age_range))   AS r_age,
      (NOT ('interests'  = ANY (_required)) OR coalesce(cardinality(_interests), 0) = 0
        OR _interests && coalesce(b.interests, '{}'::text[]))                                          AS r_int,
      public.target_text_matches(_department, b.department) AS p_dept,
      public.target_text_matches(_year, b.year)             AS p_year,
      public.target_text_matches(_country, b.country)       AS p_country,
      public.target_text_matches(_age_range, b.age_range)   AS p_age,
      (coalesce(cardinality(_interests), 0) = 0 OR _interests && coalesce(b.interests, '{}'::text[])) AS p_int
    FROM base b
  )
  SELECT
    count(*),
    count(*) FILTER (WHERE r_dept AND r_year AND r_country AND r_age AND r_int),
    count(*) FILTER (WHERE p_dept AND p_year AND p_country AND p_age AND p_int)
  INTO _pool, _eligible, _perfect
  FROM scored;

  RETURN jsonb_build_object('pool', _pool, 'eligible', _eligible, 'perfect', _perfect);
END;
$$;

REVOKE ALL ON FUNCTION public.estimate_survey_reach(boolean, text, text, text, text, text[], text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estimate_survey_reach(boolean, text, text, text, text, text[], text[]) TO authenticated;