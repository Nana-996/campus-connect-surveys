CREATE TABLE public.survey_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  supervisor_email text NOT NULL,
  supervisor_name text,
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','changes_requested','revoked')),
  comment text,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.survey_reviews TO authenticated;
GRANT ALL ON public.survey_reviews TO service_role;
ALTER TABLE public.survey_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own survey reviews" ON public.survey_reviews
  FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE INDEX ON public.survey_reviews (survey_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.request_survey_review(_survey_id uuid, _email text, _name text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE _tok text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.surveys WHERE id = _survey_id AND creator_id = auth.uid()) THEN
    RAISE EXCEPTION 'Survey not found';
  END IF;
  IF _email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_email) > 254 THEN RAISE EXCEPTION 'Invalid email'; END IF;
  UPDATE public.survey_reviews SET status = 'revoked'
   WHERE survey_id = _survey_id AND status = 'pending';
  INSERT INTO public.survey_reviews(survey_id, creator_id, supervisor_email, supervisor_name)
  VALUES (_survey_id, auth.uid(), lower(trim(_email)), left(nullif(trim(_name), ''), 120))
  RETURNING token INTO _tok;
  RETURN _tok;
END; $$;
REVOKE ALL ON FUNCTION public.request_survey_review(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_survey_review(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_survey_review(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE r record;
BEGIN
  SELECT rv.status, rv.comment, rv.expires_at, rv.supervisor_name, s.title, s.description, s.questions,
         p.full_name AS researcher, p.university_name
    INTO r
  FROM public.survey_reviews rv
  JOIN public.surveys s ON s.id = rv.survey_id
  LEFT JOIN public.profiles p ON p.id = rv.creator_id
  WHERE rv.token = _token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'status', CASE WHEN r.status = 'pending' AND r.expires_at < now() THEN 'expired' ELSE r.status END,
    'comment', r.comment, 'supervisorName', r.supervisor_name, 'title', r.title,
    'description', r.description, 'questions', r.questions,
    'researcher', r.researcher, 'university', r.university_name);
END; $$;
REVOKE ALL ON FUNCTION public.get_survey_review(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_survey_review(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_survey_review(_token text, _approve boolean, _comment text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE _n int;
BEGIN
  IF NOT _approve AND coalesce(length(trim(_comment)), 0) < 3 THEN
    RAISE EXCEPTION 'Please explain what should change';
  END IF;
  UPDATE public.survey_reviews
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'changes_requested' END,
         comment = left(nullif(trim(_comment), ''), 2000), decided_at = now()
   WHERE token = _token AND status = 'pending' AND expires_at > now();
  GET DIAGNOSTICS _n = ROW_COUNT;
  IF _n = 0 THEN RAISE EXCEPTION 'This review link is no longer active'; END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;
REVOKE ALL ON FUNCTION public.submit_survey_review(text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_survey_review(text, boolean, text) TO anon, authenticated;