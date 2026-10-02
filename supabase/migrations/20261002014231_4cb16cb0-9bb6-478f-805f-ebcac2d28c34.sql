CREATE OR REPLACE FUNCTION private.is_survey_invited(_survey_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.survey_invites i
    WHERE i.survey_id = _survey_id
      AND lower(i.email) = lower(COALESCE((auth.jwt() ->> 'email'), '~none~'))
  );
$function$;
REVOKE ALL ON FUNCTION private.is_survey_invited(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_survey_invited(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_survey_invited(_survey_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  RETURN private.is_survey_invited(_survey_id);
END
$function$;
GRANT EXECUTE ON FUNCTION public.is_survey_invited(uuid) TO anon, authenticated, service_role;