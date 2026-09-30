ALTER FUNCTION public.get_school_partnership(text) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.get_school_partnership(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_school_partnership(text) TO anon, authenticated, service_role;