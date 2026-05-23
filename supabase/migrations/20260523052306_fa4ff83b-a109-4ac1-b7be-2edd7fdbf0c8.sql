CREATE OR REPLACE FUNCTION public.is_academic_domain(_domain text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT _domain ~* '(^|\.)edu$'
      OR _domain ~* '\.edu\.[a-z]{2,6}$'
      OR _domain ~* '\.ac\.[a-z]{2,6}$'
      OR _domain ~* '\.uni\.[a-z]{2,6}$';
$function$;