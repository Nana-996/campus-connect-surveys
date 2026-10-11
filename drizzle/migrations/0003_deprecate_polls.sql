REVOKE ALL ON public.polls, public.poll_responses FROM anon, authenticated;
COMMENT ON TABLE public.polls IS 'DEPRECATED: polls feature removed from the app';
COMMENT ON TABLE public.poll_responses IS 'DEPRECATED: polls feature removed from the app';