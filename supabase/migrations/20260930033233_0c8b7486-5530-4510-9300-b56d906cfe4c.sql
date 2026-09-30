CREATE POLICY "Public can view current school partnerships"
ON public.schools
FOR SELECT
TO anon
USING (
  is_active
  AND subscription_status IN ('trial', 'active')
  AND (valid_until IS NULL OR valid_until > now())
);

GRANT SELECT (name, domain, join_slug) ON public.schools TO anon;

CREATE OR REPLACE FUNCTION public.get_school_partnership(_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
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