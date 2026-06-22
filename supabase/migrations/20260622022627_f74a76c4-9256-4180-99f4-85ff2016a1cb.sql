REVOKE ALL ON FUNCTION public.get_my_manager_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_manager_scope() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_manager_scope() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_manager_scope() TO service_role;

REVOKE ALL ON FUNCTION public.get_survey_tracking_scope(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_survey_tracking_scope(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_survey_tracking_scope(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_survey_tracking_scope(uuid) TO service_role;