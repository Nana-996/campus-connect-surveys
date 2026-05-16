CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.survey_visualizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  chart_type text NOT NULL DEFAULT 'bar',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, question_id)
);

ALTER TABLE public.survey_visualizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Viz: creator can read" ON public.survey_visualizations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.creator_id = auth.uid()));
CREATE POLICY "Viz: creator can insert" ON public.survey_visualizations FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.creator_id = auth.uid()));
CREATE POLICY "Viz: creator can update" ON public.survey_visualizations FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.creator_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.creator_id = auth.uid()));
CREATE POLICY "Viz: creator can delete" ON public.survey_visualizations FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.creator_id = auth.uid()));

CREATE TRIGGER update_survey_visualizations_updated_at
BEFORE UPDATE ON public.survey_visualizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();