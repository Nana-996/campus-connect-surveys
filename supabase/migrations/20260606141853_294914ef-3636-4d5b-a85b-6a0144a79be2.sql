
-- index_number column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS index_number text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_university_index_unique
  ON public.profiles (university_domain, lower(index_number))
  WHERE index_number IS NOT NULL AND length(trim(index_number)) > 0;

-- Manager visibility policy on profiles
DROP POLICY IF EXISTS "Profiles: manager reads university students" ON public.profiles;
CREATE POLICY "Profiles: manager reads university students"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager'::public.app_role)
  AND university_domain = public.current_university_domain()
  AND user_type = 'student'
);

-- Patched handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _domain text; uni text; _hash text; _disposable boolean;
  _user_type text; _interests text[]; _interests_raw text[];
  _bonus int; _index_number text;
BEGIN
  _domain := lower(split_part(NEW.email, '@', 2));
  SELECT EXISTS(SELECT 1 FROM public.disposable_domains d WHERE d.domain = _domain) INTO _disposable;
  IF _disposable THEN RAISE EXCEPTION 'Disposable email addresses are not allowed'; END IF;
  _hash := encode(extensions.digest(lower(trim(NEW.email)), 'sha256'), 'hex');
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email_hash = _hash) THEN
    RAISE EXCEPTION 'An account already exists for this email';
  END IF;
  _user_type := lower(COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'));
  IF _user_type NOT IN ('student','general') THEN _user_type := 'student'; END IF;
  IF _user_type = 'student' AND NOT public.is_academic_domain(_domain) THEN
    RAISE EXCEPTION 'Student accounts require an academic email (.edu, .edu.xx, .ac.xx, or .uni.xx)';
  END IF;
  uni := COALESCE(
    NEW.raw_user_meta_data->>'university_name',
    CASE WHEN _user_type = 'student' THEN initcap(split_part(_domain,'.',1)) || ' University' ELSE 'General' END
  );
  BEGIN
    SELECT COALESCE(array_agg(value::text), '{}') INTO _interests
      FROM jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'interests','[]'::jsonb)) AS value;
  EXCEPTION WHEN others THEN _interests := '{}'; END;
  BEGIN
    SELECT COALESCE(array_agg(value::text), '{}') INTO _interests_raw
      FROM jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'interests_raw','[]'::jsonb)) AS value;
  EXCEPTION WHEN others THEN _interests_raw := '{}'; END;
  _bonus := CASE WHEN _user_type = 'student' THEN 10 ELSE 5 END;

  _index_number := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'index_number','')), '');
  IF _user_type = 'student' AND _index_number IS NOT NULL THEN
    IF _index_number !~ '^[A-Za-z0-9/_-]{1,32}$' THEN
      RAISE EXCEPTION 'Invalid index number format';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE university_domain = _domain AND lower(index_number) = lower(_index_number)
    ) THEN
      RAISE EXCEPTION 'That index number is already registered at this university';
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id, full_name, university_name, university_domain,
    department, year, earned_credits, paid_credits, email_hash, user_type,
    country, age_range, interests, interests_raw, index_number
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    uni, _domain,
    CASE WHEN _user_type = 'student' THEN COALESCE(NEW.raw_user_meta_data->>'department','') ELSE '' END,
    CASE WHEN _user_type = 'student' THEN COALESCE(NEW.raw_user_meta_data->>'year','') ELSE '' END,
    _bonus, 0, _hash, _user_type,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'country',''),''),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'age_range',''),''),
    _interests, _interests_raw, _index_number
  );

  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, expires_at)
  VALUES (NEW.id,'earned',_bonus,'signup_bonus', now() + interval '30 days');
  RETURN NEW;
END;
$function$;

-- list_university_surveys
CREATE OR REPLACE FUNCTION public.list_university_surveys()
RETURNS TABLE (
  id uuid, title text, creator_name text,
  response_count int, response_goal int, is_active boolean,
  created_at timestamptz, expires_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid(); _domain text;
  _is_admin boolean; _is_manager boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _is_admin := public.has_role(_uid, 'admin'::public.app_role);
  _is_manager := public.has_role(_uid, 'manager'::public.app_role);
  IF NOT (_is_admin OR _is_manager) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT university_domain INTO _domain FROM public.profiles WHERE profiles.id = _uid;
  RETURN QUERY
    SELECT s.id, s.title,
           COALESCE(p.full_name, 'Unknown') AS creator_name,
           s.response_count, s.response_goal, s.is_active,
           s.created_at, s.expires_at
    FROM public.surveys s
    LEFT JOIN public.profiles p ON p.id = s.creator_id
    WHERE s.university_domain = _domain
      AND COALESCE(s.allow_general_respondents, false) = false
    ORDER BY s.created_at DESC
    LIMIT 500;
END;
$$;

-- get_university_survey_tracking
CREATE OR REPLACE FUNCTION public.get_university_survey_tracking(_survey_id uuid)
RETURNS TABLE (
  student_id uuid, full_name text, index_number text,
  department text, year text, responded_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid(); _domain text; _survey_domain text;
  _is_admin boolean; _is_manager boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _is_admin := public.has_role(_uid, 'admin'::public.app_role);
  _is_manager := public.has_role(_uid, 'manager'::public.app_role);
  IF NOT (_is_admin OR _is_manager) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT university_domain INTO _domain FROM public.profiles WHERE profiles.id = _uid;
  SELECT university_domain INTO _survey_domain FROM public.surveys WHERE surveys.id = _survey_id;
  IF _survey_domain IS NULL THEN RAISE EXCEPTION 'Survey not found'; END IF;
  IF NOT _is_admin AND _survey_domain <> _domain THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
    SELECT p.id AS student_id, p.full_name, p.index_number, p.department, p.year,
           (SELECT MIN(r.created_at)
              FROM public.survey_responses r
              WHERE r.survey_id = _survey_id AND r.respondent_id = p.id) AS responded_at
    FROM public.profiles p
    WHERE p.user_type = 'student' AND p.university_domain = _survey_domain
    ORDER BY p.full_name;
END;
$$;

-- update_my_student_info
CREATE OR REPLACE FUNCTION public.update_my_student_info(_index_number text, _department text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _domain text; _norm text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _norm := NULLIF(trim(COALESCE(_index_number, '')), '');
  IF _norm IS NOT NULL AND _norm !~ '^[A-Za-z0-9/_-]{1,32}$' THEN
    RAISE EXCEPTION 'Invalid index number format';
  END IF;
  SELECT university_domain INTO _domain FROM public.profiles WHERE id = _uid;
  IF _norm IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE university_domain = _domain AND id <> _uid AND lower(index_number) = lower(_norm)
  ) THEN
    RAISE EXCEPTION 'That index number is already registered at this university';
  END IF;
  UPDATE public.profiles
    SET index_number = _norm,
        department = COALESCE(NULLIF(trim(COALESCE(_department,'')), ''), department)
    WHERE id = _uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_university_surveys() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_university_survey_tracking(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_my_student_info(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.list_university_surveys() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_university_survey_tracking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_student_info(text, text) TO authenticated;
