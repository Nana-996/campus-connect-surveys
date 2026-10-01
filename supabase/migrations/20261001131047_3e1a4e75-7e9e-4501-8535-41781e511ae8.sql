REVOKE ALL ON FUNCTION public.admin_platform_analytics(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_platform_analytics(integer) TO service_role;