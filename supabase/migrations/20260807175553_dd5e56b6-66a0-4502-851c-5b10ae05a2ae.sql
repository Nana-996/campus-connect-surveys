-- Audience reach estimation is only meaningful for signed-in survey creators.
REVOKE EXECUTE ON FUNCTION public.estimate_survey_reach(boolean, text, text, text, text, text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estimate_survey_reach(boolean, text, text, text, text, text[], text[]) TO authenticated;

-- Invite lookup stays public (token-gated) but should not be granted to every role.
REVOKE EXECUTE ON FUNCTION public.get_school_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_school_invite(text) TO anon, authenticated;