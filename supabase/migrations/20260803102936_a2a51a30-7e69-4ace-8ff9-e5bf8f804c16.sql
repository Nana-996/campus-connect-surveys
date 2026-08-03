REVOKE ALL ON FUNCTION public.is_alumni(uuid) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.can_track_survey(uuid, uuid) FROM anon, authenticated, PUBLIC;

REVOKE ALL ON FUNCTION public.accept_school_invite(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_school_invite(text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_upsert_school(text, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_school(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_school_active(text, boolean) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_school_active(text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_schools() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_schools() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_create_school_invite(text, text, text, integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_school_invite(text, text, text, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_school_invites(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_school_invites(text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_revoke_school_invite(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_school_invite(uuid) TO authenticated;