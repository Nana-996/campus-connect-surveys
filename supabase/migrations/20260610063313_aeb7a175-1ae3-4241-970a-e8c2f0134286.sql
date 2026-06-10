DROP POLICY IF EXISTS "Starts: insert own" ON public.survey_response_starts;
REVOKE INSERT ON public.survey_response_starts FROM authenticated;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role)
$$;

GRANT EXECUTE ON FUNCTION public.admin_exists() TO authenticated, anon;