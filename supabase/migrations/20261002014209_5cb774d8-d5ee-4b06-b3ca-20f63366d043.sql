CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_student_eligible(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.user_type = 'student') THEN true
    ELSE NOT public.is_alumni(_user_id)
  END
$function$;
REVOKE ALL ON FUNCTION private.is_student_eligible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_student_eligible(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_student_eligible(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $function$
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  RETURN private.is_student_eligible(_user_id);
END
$function$;
GRANT EXECUTE ON FUNCTION public.is_student_eligible(uuid) TO anon, authenticated, service_role;