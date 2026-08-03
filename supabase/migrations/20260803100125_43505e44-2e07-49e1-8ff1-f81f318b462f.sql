REVOKE EXECUTE ON FUNCTION public.is_alumni(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_track_survey(uuid, uuid) FROM anon, authenticated;