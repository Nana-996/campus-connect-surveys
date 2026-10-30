CREATE TABLE public.survey_funnel_visits (
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  signup_at timestamptz,
  submitted_at timestamptz,
  PRIMARY KEY (survey_id, token_hash)
);
GRANT ALL ON public.survey_funnel_visits TO service_role;
ALTER TABLE public.survey_funnel_visits ENABLE ROW LEVEL SECURITY;
CREATE INDEX survey_funnel_started_idx ON public.survey_funnel_visits(started_at);
COMMENT ON TABLE public.survey_funnel_visits IS 'Anonymous per-browser survey attempts; no emails, answers or respondent IDs. Stages are deduplicated. Submissions are set only by the response insert trigger.';
ALTER TABLE public.survey_responses ADD COLUMN funnel_token uuid;
COMMENT ON COLUMN public.survey_responses.funnel_token IS 'Random per-survey browser attempt token used only to join authoritative submission to anonymous funnel measurement.';
CREATE FUNCTION public.record_survey_funnel(_survey_id uuid, _token uuid, _stage text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _stage NOT IN ('started','signup') THEN RAISE EXCEPTION 'Invalid stage'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.surveys WHERE id=_survey_id AND is_active AND coalesce(visibility,'everyone') <> 'private' AND expires_at > now() AND response_count < response_goal) THEN RETURN; END IF;
  INSERT INTO public.survey_funnel_visits(survey_id,token_hash,signup_at)
    VALUES (_survey_id,md5(_token::text),CASE WHEN _stage='signup' THEN now() ELSE NULL END)
  ON CONFLICT(survey_id,token_hash) DO UPDATE SET signup_at=coalesce(survey_funnel_visits.signup_at,excluded.signup_at);
END; $$;
REVOKE ALL ON FUNCTION public.record_survey_funnel(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_survey_funnel(uuid,uuid,text) TO service_role;
CREATE FUNCTION public.record_survey_funnel_submission() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.funnel_token IS NOT NULL THEN
    UPDATE public.survey_funnel_visits SET submitted_at=coalesce(submitted_at,NEW.created_at)
      WHERE survey_id=NEW.survey_id AND token_hash=md5(NEW.funnel_token::text);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.record_survey_funnel_submission() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER survey_funnel_response_insert AFTER INSERT ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.record_survey_funnel_submission();
CREATE FUNCTION public.survey_funnel_summary(_days integer DEFAULT 30) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF _days NOT IN (7,30,90,0) THEN RAISE EXCEPTION 'Invalid reporting period'; END IF;
  WITH cohort AS (
    SELECT * FROM public.survey_funnel_visits WHERE _days=0 OR started_at >= now()-make_interval(days=>_days)
  ), grouped AS (
    SELECT c.survey_id, s.title, count(*) AS started,
      count(*) FILTER(WHERE signup_at IS NOT NULL) AS signup,
      count(*) FILTER(WHERE submitted_at IS NOT NULL) AS submitted,
      count(*) FILTER(WHERE signup_at IS NOT NULL AND submitted_at IS NOT NULL) AS signup_submitted
    FROM cohort c JOIN public.surveys s ON s.id=c.survey_id GROUP BY c.survey_id,s.title
  )
  SELECT jsonb_build_object(
    'started',(SELECT count(*) FROM cohort),
    'signup',(SELECT count(*) FROM cohort WHERE signup_at IS NOT NULL),
    'submitted',(SELECT count(*) FROM cohort WHERE submitted_at IS NOT NULL),
    'signup_submitted',(SELECT count(*) FROM cohort WHERE signup_at IS NOT NULL AND submitted_at IS NOT NULL),
    'tracking_since',(SELECT min(started_at) FROM public.survey_funnel_visits),
    'surveys',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.started DESC,g.survey_id) FROM (SELECT * FROM grouped ORDER BY started DESC,survey_id LIMIT 20) g),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.survey_funnel_summary(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.survey_funnel_summary(integer) TO service_role;