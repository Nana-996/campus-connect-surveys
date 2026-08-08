DROP POLICY IF EXISTS "Surveys: read visible" ON public.surveys;

CREATE POLICY "Surveys: read visible" ON public.surveys
FOR SELECT
USING (
  (creator_id = auth.uid())
  OR (
    -- University scope
    (
      CASE
        WHEN target_universities IS NOT NULL AND cardinality(target_universities) > 0
          THEN lower(COALESCE(public.current_university_domain(), '')) = ANY (target_universities)
        WHEN allow_general_respondents = true THEN true
        ELSE university_domain = public.current_university_domain()
      END
    )
    AND ((NOT ('department' = ANY (required_criteria))) OR public.target_text_matches(target_department, public.current_department()))
    AND ((NOT ('year' = ANY (required_criteria))) OR public.target_text_matches(target_year, public.current_year()))
    AND ((NOT ('country' = ANY (required_criteria))) OR public.target_text_matches(target_country, public.current_country()))
    AND ((NOT ('age_range' = ANY (required_criteria))) OR public.target_text_matches(target_age_range, public.current_age_range()))
    AND ((NOT ('interests' = ANY (required_criteria))) OR target_interests IS NULL OR cardinality(target_interests) = 0 OR (target_interests && public.current_interests()))
  )
);