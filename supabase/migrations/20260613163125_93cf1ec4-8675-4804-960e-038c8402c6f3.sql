-- Fix 1: Restrict lecturer.email column from direct Data API SELECT.
-- Staff (admin/manager) access lecturers via server functions that use the
-- admin client (bypasses RLS and column grants), so they keep full access.
REVOKE SELECT ON public.lecturers FROM authenticated;
GRANT SELECT (id, full_name, department, title, university_domain, created_at, updated_at)
  ON public.lecturers TO authenticated;

-- Fix 2: Remove direct creator read on survey_responses.
-- Owners now only read responses through getOwnerSurveyResults (server fn),
-- which anonymizes respondent_id and joins demographics without exposing identity.
DROP POLICY IF EXISTS "Responses: respondent or creator can read" ON public.survey_responses;
CREATE POLICY "Responses: respondent can read own"
  ON public.survey_responses FOR SELECT
  TO authenticated
  USING (respondent_id = auth.uid());