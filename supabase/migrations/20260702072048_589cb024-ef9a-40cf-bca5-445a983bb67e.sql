
-- 1) Allow one-time self-set of university_name on profiles (only when previously empty)
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Allow the owner to set their university_name ONCE if it was previously empty.
  IF NEW.university_name IS DISTINCT FROM OLD.university_name
     AND auth.uid() = NEW.id
     AND COALESCE(NULLIF(TRIM(OLD.university_name), ''), NULL) IS NULL
     AND COALESCE(NULLIF(TRIM(NEW.university_name), ''), NULL) IS NOT NULL
  THEN
    -- permitted; fall through to remaining checks (other columns unchanged)
    IF NEW.is_flagged IS DISTINCT FROM OLD.is_flagged
       OR NEW.flag_reason IS DISTINCT FROM OLD.flag_reason
       OR NEW.email_hash IS DISTINCT FROM OLD.email_hash
       OR NEW.user_type IS DISTINCT FROM OLD.user_type
       OR NEW.university_domain IS DISTINCT FROM OLD.university_domain
       OR NEW.id IS DISTINCT FROM OLD.id
    THEN
      RAISE EXCEPTION 'You cannot modify protected profile fields';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_flagged IS DISTINCT FROM OLD.is_flagged
     OR NEW.flag_reason IS DISTINCT FROM OLD.flag_reason
     OR NEW.email_hash IS DISTINCT FROM OLD.email_hash
     OR NEW.user_type IS DISTINCT FROM OLD.user_type
     OR NEW.university_domain IS DISTINCT FROM OLD.university_domain
     OR NEW.university_name IS DISTINCT FROM OLD.university_name
     OR NEW.id IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'You cannot modify protected profile fields';
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Faculty self-service: set my university if not already set
CREATE OR REPLACE FUNCTION public.faculty_set_my_university(_university_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _norm text := NULLIF(TRIM(COALESCE(_university_name, '')), '');
  _existing text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'faculty'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: faculty only';
  END IF;
  IF _norm IS NULL OR length(_norm) < 2 THEN
    RAISE EXCEPTION 'University name is required';
  END IF;

  SELECT NULLIF(TRIM(university_name), '') INTO _existing
    FROM public.profiles WHERE id = _uid;

  IF _existing IS NOT NULL THEN
    RAISE EXCEPTION 'University is already set on your profile. Ask an admin to change it.';
  END IF;

  UPDATE public.profiles SET university_name = _norm WHERE id = _uid;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.faculty_set_my_university(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.faculty_set_my_university(text) TO authenticated;

-- 3) Admin: set (or overwrite) a user's university name
CREATE OR REPLACE FUNCTION public.admin_set_user_university(_target_user_id uuid, _university_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _norm text := NULLIF(TRIM(COALESCE(_university_name, '')), '');
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: admins only';
  END IF;
  IF _norm IS NULL OR length(_norm) < 2 THEN
    RAISE EXCEPTION 'University name is required';
  END IF;

  UPDATE public.profiles SET university_name = _norm WHERE id = _target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_university(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_university(uuid, text) TO authenticated;

-- 4) Restore university-scoped search: match on normalized university_name.
CREATE OR REPLACE FUNCTION public.faculty_search_student_by_index(_index_number text)
RETURNS TABLE(student_id uuid, full_name text, index_number text, department text, year text, already_on_watchlist boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _norm text;
  _uni  text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'faculty'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: faculty only';
  END IF;

  SELECT NULLIF(TRIM(LOWER(university_name)), '') INTO _uni
    FROM public.profiles WHERE id = _uid;

  IF _uni IS NULL THEN
    RAISE EXCEPTION 'Your university is not set. Ask an admin to set it, or set it in your Faculty dashboard.';
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
    AND lower(trim(p.university_name)) = _uni
  LIMIT 20;
END;
$$;

-- 5) Restrict watchlist adds to same-university students.
CREATE OR REPLACE FUNCTION public.faculty_add_to_watchlist(_student_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _faculty_uni text;
  _student_uni text;
  _student_type text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'faculty'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: faculty only';
  END IF;

  SELECT NULLIF(TRIM(LOWER(university_name)), '') INTO _faculty_uni
    FROM public.profiles WHERE id = _uid;
  IF _faculty_uni IS NULL THEN
    RAISE EXCEPTION 'Your university is not set. Ask an admin to set it, or set it in your Faculty dashboard.';
  END IF;

  SELECT user_type, NULLIF(TRIM(LOWER(university_name)), '')
    INTO _student_type, _student_uni
    FROM public.profiles WHERE id = _student_user_id;

  IF _student_type IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
  IF _student_type <> 'student' THEN RAISE EXCEPTION 'That user is not a student'; END IF;
  IF _student_uni IS DISTINCT FROM _faculty_uni THEN
    RAISE EXCEPTION 'You can only add students from your own university';
  END IF;

  INSERT INTO public.faculty_student_watchlist(faculty_user_id, student_user_id)
  VALUES (_uid, _student_user_id)
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;
