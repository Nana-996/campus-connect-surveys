REVOKE SELECT (email_hash) ON public.profiles FROM authenticated;
REVOKE SELECT (email_hash) ON public.profiles FROM anon;
REVOKE SELECT (paid_cost) ON public.surveys FROM authenticated;
REVOKE SELECT (paid_cost) ON public.surveys FROM anon;