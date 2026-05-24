
-- Saved report views (premium: creator can persist filter+selection combos)
CREATE TABLE public.survey_report_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_views_survey ON public.survey_report_views(survey_id);
ALTER TABLE public.survey_report_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_views: creator read"
  ON public.survey_report_views FOR SELECT TO authenticated
  USING (creator_id = auth.uid());
CREATE POLICY "report_views: creator insert"
  ON public.survey_report_views FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.creator_id = auth.uid()
  ));
CREATE POLICY "report_views: creator update"
  ON public.survey_report_views FOR UPDATE TO authenticated
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "report_views: creator delete"
  ON public.survey_report_views FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

CREATE TRIGGER trg_report_views_updated
  BEFORE UPDATE ON public.survey_report_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Share tokens (premium: shareable read-only live dashboards)
CREATE TABLE public.survey_share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_share_tokens_survey ON public.survey_share_tokens(survey_id);
ALTER TABLE public.survey_share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "share_tokens: creator read"
  ON public.survey_share_tokens FOR SELECT TO authenticated
  USING (creator_id = auth.uid());
CREATE POLICY "share_tokens: creator insert"
  ON public.survey_share_tokens FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.creator_id = auth.uid()
  ));
CREATE POLICY "share_tokens: creator update"
  ON public.survey_share_tokens FOR UPDATE TO authenticated
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- Public read-only dashboard data via token. Returns ONLY safe aggregates.
-- Skips free-text answers entirely; never returns respondent IDs.
CREATE OR REPLACE FUNCTION public.get_shared_dashboard(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _survey_id uuid;
  _survey record;
  _result jsonb;
  _questions jsonb;
  _question jsonb;
  _qid text;
  _qtype text;
  _qtext text;
  _qoptions jsonb;
  _counts jsonb;
  _total int;
  _opt text;
  _c int;
  _qresults jsonb := '[]'::jsonb;
BEGIN
  SELECT survey_id INTO _survey_id
    FROM public.survey_share_tokens
    WHERE token = _token
      AND revoked = false
      AND (expires_at IS NULL OR expires_at > now());
  IF _survey_id IS NULL THEN RETURN NULL; END IF;

  SELECT id, title, description, questions, response_count, created_at, expires_at
    INTO _survey FROM public.surveys WHERE id = _survey_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COUNT(*) INTO _total FROM public.survey_responses WHERE survey_id = _survey_id;

  FOR _question IN SELECT * FROM jsonb_array_elements(_survey.questions) LOOP
    _qid := _question->>'id';
    _qtype := _question->>'type';
    _qtext := _question->>'text';
    _qoptions := COALESCE(_question->'options', '[]'::jsonb);

    IF _qtype IN ('choice','rating') THEN
      _counts := '[]'::jsonb;
      IF _qtype = 'rating' THEN
        FOR _opt IN SELECT unnest(ARRAY['1','2','3','4','5']) LOOP
          SELECT COUNT(*) INTO _c FROM public.survey_responses
            WHERE survey_id = _survey_id AND (answers->>_qid) = _opt;
          IF _c < 5 THEN _c := 0; END IF;
          _counts := _counts || jsonb_build_object('label', _opt, 'count', _c);
        END LOOP;
      ELSE
        FOR _opt IN SELECT jsonb_array_elements_text(_qoptions) LOOP
          SELECT COUNT(*) INTO _c FROM public.survey_responses
            WHERE survey_id = _survey_id AND (answers->>_qid) = _opt;
          IF _c < 5 THEN _c := 0; END IF;
          _counts := _counts || jsonb_build_object('label', _opt, 'count', _c);
        END LOOP;
      END IF;
      _qresults := _qresults || jsonb_build_object(
        'id', _qid, 'type', _qtype, 'text', _qtext, 'counts', _counts
      );
    ELSE
      -- Free-text: never expose; only show count of answered
      SELECT COUNT(*) INTO _c FROM public.survey_responses
        WHERE survey_id = _survey_id AND length(trim(COALESCE(answers->>_qid,''))) > 0;
      _qresults := _qresults || jsonb_build_object(
        'id', _qid, 'type', _qtype, 'text', _qtext, 'answered', _c
      );
    END IF;
  END LOOP;

  _result := jsonb_build_object(
    'title', _survey.title,
    'description', _survey.description,
    'total_responses', _total,
    'created_at', _survey.created_at,
    'expires_at', _survey.expires_at,
    'questions', _qresults
  );
  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_dashboard(text) TO anon, authenticated;
