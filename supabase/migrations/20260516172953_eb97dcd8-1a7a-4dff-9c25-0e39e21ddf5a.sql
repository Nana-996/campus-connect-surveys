CREATE OR REPLACE FUNCTION public.publish_survey(
  _title text,
  _description text,
  _questions jsonb,
  _target_department text DEFAULT NULL,
  _target_year text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile public.profiles%ROWTYPE;
  _survey_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to publish a survey';
  END IF;

  SELECT * INTO _profile
  FROM public.profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your student profile is still being set up. Please refresh and try again.';
  END IF;

  IF _profile.credits < 2 THEN
    RAISE EXCEPTION 'You need at least 2 credits to publish a survey';
  END IF;

  INSERT INTO public.surveys (
    creator_id,
    university_domain,
    title,
    description,
    questions,
    target_department,
    target_year
  ) VALUES (
    auth.uid(),
    _profile.university_domain,
    trim(_title),
    coalesce(trim(_description), ''),
    coalesce(_questions, '[]'::jsonb),
    nullif(trim(coalesce(_target_department, '')), ''),
    nullif(trim(coalesce(_target_year, '')), '')
  )
  RETURNING id INTO _survey_id;

  UPDATE public.profiles
  SET credits = credits - 2
  WHERE id = auth.uid();

  RETURN _survey_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_survey(text, text, jsonb, text, text) TO authenticated;