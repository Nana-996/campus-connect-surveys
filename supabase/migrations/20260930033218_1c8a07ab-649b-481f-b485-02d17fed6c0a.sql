CREATE OR REPLACE FUNCTION public.school_join_slug(_name text, _domain text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT trim(both '-' from regexp_replace(
    regexp_replace(lower(coalesce(nullif(btrim(_name), ''), split_part(_domain, '.', 1))), '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g'
  ));
$$;

ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS join_slug text;

WITH proposed AS (
  SELECT id,
         public.school_join_slug(name, domain) AS base_slug,
         count(*) OVER (PARTITION BY public.school_join_slug(name, domain)) AS slug_count
  FROM public.schools
)
UPDATE public.schools AS s
SET join_slug = CASE
  WHEN p.slug_count = 1 THEN p.base_slug
  ELSE p.base_slug || '-' || substr(md5(s.domain), 1, 6)
END
FROM proposed AS p
WHERE p.id = s.id AND s.join_slug IS NULL;

CREATE OR REPLACE FUNCTION public.assign_school_join_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _base text;
BEGIN
  IF NEW.join_slug IS NOT NULL AND btrim(NEW.join_slug) <> '' THEN
    NEW.join_slug := trim(both '-' from regexp_replace(lower(NEW.join_slug), '[^a-z0-9]+', '-', 'g'));
    RETURN NEW;
  END IF;

  _base := public.school_join_slug(NEW.name, NEW.domain);
  IF EXISTS (SELECT 1 FROM public.schools s WHERE s.join_slug = _base AND s.id IS DISTINCT FROM NEW.id) THEN
    NEW.join_slug := _base || '-' || substr(md5(NEW.domain), 1, 6);
  ELSE
    NEW.join_slug := _base;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_school_join_slug_trigger ON public.schools;
CREATE TRIGGER assign_school_join_slug_trigger
BEFORE INSERT OR UPDATE OF join_slug ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.assign_school_join_slug();

ALTER TABLE public.schools ALTER COLUMN join_slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS schools_join_slug_key ON public.schools (join_slug);

CREATE OR REPLACE FUNCTION public.get_school_partnership(_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'name', s.name,
    'domain', s.domain,
    'slug', s.join_slug
  )
  FROM public.schools s
  WHERE s.join_slug = lower(btrim(_slug))
    AND s.is_active
    AND s.subscription_status IN ('trial', 'active')
    AND (s.valid_until IS NULL OR s.valid_until > now())
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_school_partnership(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_school_partnership(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_partnership(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.assign_school_join_slug() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.school_join_slug(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_school_join_slug() TO service_role;
GRANT EXECUTE ON FUNCTION public.school_join_slug(text, text) TO service_role;