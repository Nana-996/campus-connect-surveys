CREATE OR REPLACE FUNCTION public.resolve_survey_link(_key text)
RETURNS TABLE(id uuid, slug text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN QUERY SELECT s.id, s.slug FROM public.surveys s WHERE s.id = _key::uuid LIMIT 1;
  ELSE
    RETURN QUERY SELECT s.id, s.slug FROM public.surveys s WHERE s.slug = lower(_key) LIMIT 1;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.resolve_survey_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_survey_link(text) TO anon, authenticated;