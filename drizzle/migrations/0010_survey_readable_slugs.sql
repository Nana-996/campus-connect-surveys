ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.make_survey_slug(_title text, _id uuid)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base text; candidate text; n int := 1;
BEGIN
  base := trim(both '-' from regexp_replace(lower(coalesce(_title,'')), '[^a-z0-9]+', '-', 'g'));
  base := trim(both '-' from left(base, 60));
  IF base = '' THEN base := 'survey'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.surveys WHERE slug = candidate AND id <> _id) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END $$;

CREATE OR REPLACE FUNCTION public.set_survey_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.make_survey_slug(NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_survey_slug ON public.surveys;
CREATE TRIGGER trg_set_survey_slug BEFORE INSERT ON public.surveys
FOR EACH ROW EXECUTE FUNCTION public.set_survey_slug();

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id, title FROM public.surveys WHERE slug IS NULL ORDER BY created_at LOOP
    UPDATE public.surveys SET slug = public.make_survey_slug(r.title, r.id) WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS surveys_slug_key ON public.surveys(slug);

CREATE OR REPLACE FUNCTION public.resolve_survey_link(_key text)
RETURNS TABLE(id uuid, slug text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.slug FROM public.surveys s
  WHERE s.slug = lower(_key)
     OR (_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND s.id = _key::uuid)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.resolve_survey_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_survey_link(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.make_survey_slug(text, uuid) FROM PUBLIC, anon, authenticated;