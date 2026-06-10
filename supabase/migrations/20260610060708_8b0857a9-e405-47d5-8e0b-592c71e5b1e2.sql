
CREATE POLICY "Starts: insert own" ON public.survey_response_starts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER POLICY "Surveys: update own" ON public.surveys
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());
