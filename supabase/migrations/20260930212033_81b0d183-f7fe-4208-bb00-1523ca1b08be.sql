ALTER FUNCTION public.get_school_partnership(text) SECURITY INVOKER;
GRANT SELECT (name, domain, join_slug, is_active, subscription_status, valid_until) ON public.schools TO anon;