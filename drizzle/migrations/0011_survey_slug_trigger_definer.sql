ALTER FUNCTION public.set_survey_slug() SECURITY DEFINER;
ALTER FUNCTION public.make_survey_slug(text, uuid) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.set_survey_slug() FROM PUBLIC, anon, authenticated;