
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_response() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.charge_survey_publish_credit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_earned_credits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_university_domain() FROM PUBLIC, anon;
