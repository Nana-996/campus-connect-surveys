ALTER TABLE public.survey_response_starts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Starts: own only" ON public.survey_response_starts
  FOR SELECT TO authenticated USING (user_id = auth.uid());