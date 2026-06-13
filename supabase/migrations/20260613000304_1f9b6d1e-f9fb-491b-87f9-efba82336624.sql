
-- Add missing INSERT policy on survey_response_starts
DROP POLICY IF EXISTS "Users insert own response starts" ON public.survey_response_starts;
CREATE POLICY "Users insert own response starts"
  ON public.survey_response_starts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Remove direct creator SELECT on poll_responses to keep votes anonymous.
-- Aggregated counts remain available through public.get_poll_results(uuid).
DROP POLICY IF EXISTS "Creator can view own poll responses" ON public.poll_responses;
DROP POLICY IF EXISTS "Creators can view poll responses" ON public.poll_responses;
DROP POLICY IF EXISTS "Creator can view responses" ON public.poll_responses;
