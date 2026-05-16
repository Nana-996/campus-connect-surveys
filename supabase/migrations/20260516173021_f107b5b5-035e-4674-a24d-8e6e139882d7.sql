DROP FUNCTION IF EXISTS public.publish_survey(text, text, jsonb, text, text);

CREATE OR REPLACE FUNCTION public.charge_survey_publish_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _credits integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to publish a survey';
  END IF;

  IF NEW.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only publish surveys as yourself';
  END IF;

  SELECT credits INTO _credits
  FROM public.profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your student profile is still being set up. Please refresh and try again.';
  END IF;

  IF _credits < 2 THEN
    RAISE EXCEPTION 'You need at least 2 credits to publish a survey';
  END IF;

  UPDATE public.profiles
  SET credits = credits - 2
  WHERE id = auth.uid();

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.charge_survey_publish_credit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS charge_survey_publish_credit_before_insert ON public.surveys;
CREATE TRIGGER charge_survey_publish_credit_before_insert
BEFORE INSERT ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.charge_survey_publish_credit();

DROP TRIGGER IF EXISTS on_survey_response_created ON public.survey_responses;
CREATE TRIGGER on_survey_response_created
AFTER INSERT ON public.survey_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_response();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();