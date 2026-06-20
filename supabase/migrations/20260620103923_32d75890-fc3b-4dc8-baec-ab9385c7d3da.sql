REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_dashboard_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_metrics() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_users(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_grant_credits(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_credits(uuid, integer, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_user_flag(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_flag(uuid, boolean, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_grant_admin_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_admin_by_email(text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_surveys() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_surveys() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_survey_active(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_survey_active(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_delete_survey(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_survey(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_disposable_domains() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_disposable_domains() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_add_disposable_domain(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_disposable_domain(text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_remove_disposable_domain(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_disposable_domain(text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_open_flags() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_open_flags() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_resolve_flag(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_flag(uuid) TO authenticated;