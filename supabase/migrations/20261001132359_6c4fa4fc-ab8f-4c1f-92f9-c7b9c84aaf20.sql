CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.school_survey_is_linked(uuid, text) SET SCHEMA private;
ALTER FUNCTION public.school_admin_tracking_overview() SET SCHEMA private;
ALTER FUNCTION public.school_admin_grant_survey_tracking(uuid, text, text, text) SET SCHEMA private;
ALTER FUNCTION public.school_admin_revoke_survey_tracking(uuid) SET SCHEMA private;
ALTER FUNCTION public.list_my_school_tracking_grants() SET SCHEMA private;
ALTER FUNCTION public.get_my_school_tracking_scope(uuid) SET SCHEMA private;
ALTER FUNCTION public.get_my_school_tracking_roster(uuid) SET SCHEMA private;

REVOKE ALL ON FUNCTION public.school_domain_matches(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_domain_matches(text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.school_survey_is_linked(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.school_admin_tracking_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.school_admin_grant_survey_tracking(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.school_admin_revoke_survey_tracking(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.list_my_school_tracking_grants() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.get_my_school_tracking_scope(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.get_my_school_tracking_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.school_survey_is_linked(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.school_admin_tracking_overview() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.school_admin_grant_survey_tracking(uuid, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.school_admin_revoke_survey_tracking(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.list_my_school_tracking_grants() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_my_school_tracking_scope(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_my_school_tracking_roster(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.school_survey_is_linked(_survey_id uuid, _school_domain text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.school_survey_is_linked(_survey_id, _school_domain) $$;

CREATE OR REPLACE FUNCTION public.school_admin_tracking_overview()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.school_admin_tracking_overview() $$;

CREATE OR REPLACE FUNCTION public.school_admin_grant_survey_tracking(_survey_id uuid, _recipient_email text, _scope text, _department text DEFAULT NULL)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.school_admin_grant_survey_tracking(_survey_id, _recipient_email, _scope, _department) $$;

CREATE OR REPLACE FUNCTION public.school_admin_revoke_survey_tracking(_grant_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.school_admin_revoke_survey_tracking(_grant_id) $$;

CREATE OR REPLACE FUNCTION public.list_my_school_tracking_grants()
RETURNS TABLE (
  survey_id uuid, title text, creator_name text, response_count integer,
  response_goal integer, is_active boolean, expires_at timestamptz,
  scope text, department text, school_name text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT * FROM private.list_my_school_tracking_grants() $$;

CREATE OR REPLACE FUNCTION public.get_my_school_tracking_scope(_survey_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT private.get_my_school_tracking_scope(_survey_id) $$;

CREATE OR REPLACE FUNCTION public.get_my_school_tracking_roster(_survey_id uuid)
RETURNS TABLE (index_number text, department text, response_status text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$ SELECT * FROM private.get_my_school_tracking_roster(_survey_id) $$;

REVOKE ALL ON FUNCTION public.school_survey_is_linked(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.school_admin_tracking_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.school_admin_grant_survey_tracking(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.school_admin_revoke_survey_tracking(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_school_tracking_grants() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_school_tracking_scope(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_school_tracking_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_survey_is_linked(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.school_admin_tracking_overview() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.school_admin_grant_survey_tracking(uuid, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.school_admin_revoke_survey_tracking(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_my_school_tracking_grants() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_school_tracking_scope(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_school_tracking_roster(uuid) TO authenticated, service_role;

CREATE POLICY "School tracking grants are RPC only"
ON public.school_survey_tracking_grants
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);