
CREATE OR REPLACE FUNCTION public.faculty_search_student_by_index(_index_number text)
RETURNS TABLE(student_id uuid, full_name text, index_number text, department text, year text, already_on_watchlist boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _norm text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'faculty'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: faculty only';
  END IF;
  _norm := lower(trim(coalesce(_index_number, '')));
  IF length(_norm) = 0 THEN RETURN; END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.index_number, p.department, p.year,
         EXISTS (
           SELECT 1 FROM public.faculty_student_watchlist w
           WHERE w.faculty_user_id = _uid AND w.student_user_id = p.id
         )
  FROM public.profiles p
  WHERE p.user_type = 'student'
    AND lower(p.index_number) = _norm
  LIMIT 20;
END;
$function$;

CREATE OR REPLACE FUNCTION public.faculty_add_to_watchlist(_student_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _student_type text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'faculty'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: faculty only';
  END IF;

  SELECT user_type INTO _student_type
    FROM public.profiles WHERE id = _student_user_id;

  IF _student_type IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  IF _student_type <> 'student' THEN RAISE EXCEPTION 'That user is not a student'; END IF;

  INSERT INTO public.faculty_student_watchlist(faculty_user_id, student_user_id)
  VALUES (_uid, _student_user_id)
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$function$;
