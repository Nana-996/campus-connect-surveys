REVOKE EXECUTE ON FUNCTION public.get_poll_results(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_poll_results(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_user_matches_admin_email() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_matches_admin_email() TO service_role, postgres;