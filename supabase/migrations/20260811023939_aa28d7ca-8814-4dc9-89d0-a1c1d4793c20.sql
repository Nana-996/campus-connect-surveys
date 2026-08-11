DROP FUNCTION IF EXISTS public.admin_list_users(text);

CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, full_name text, university_name text, university_domain text, user_type text, earned_credits integer, paid_credits integer, is_flagged boolean, flag_reason text, created_at timestamp with time zone, roles app_role[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _safe text := nullif(regexp_replace(coalesce(_search, ''), '[(),.%_]', '', 'g'), '');
BEGIN
  PERFORM public.require_admin_user();

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.university_name,
    p.university_domain,
    p.user_type,
    p.earned_credits,
    p.paid_credits,
    p.is_flagged,
    p.flag_reason,
    p.created_at,
    coalesce(array_agg(ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}'::public.app_role[]) AS roles
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE _safe IS NULL
     OR p.full_name ILIKE '%' || _safe || '%'
     OR p.university_domain ILIKE '%' || _safe || '%'
     OR p.university_name ILIKE '%' || _safe || '%'
  GROUP BY p.id
  ORDER BY p.created_at DESC
  LIMIT 200;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_users(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text) TO authenticated, service_role;