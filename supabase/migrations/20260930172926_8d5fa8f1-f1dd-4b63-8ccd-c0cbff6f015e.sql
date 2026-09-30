GRANT EXECUTE ON FUNCTION public.current_user_matches_admin_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_matches_admin_email() TO service_role;
REVOKE EXECUTE ON FUNCTION public.current_user_matches_admin_email() FROM anon;