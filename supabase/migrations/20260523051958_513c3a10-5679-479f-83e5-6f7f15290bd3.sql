CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _domain text;
  uni text;
  _hash text;
  _disposable boolean;
  _user_type text;
  _interests text[];
  _interests_raw text[];
  _bonus int;
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
    RAISE EXCEPTION 'Student accounts require an academic email (.edu, .edu.xx, or .ac.xx)';
  END IF;

  uni := COALESCE(
    NEW.raw_user_meta_data->>'university_name',
    CASE WHEN _user_type = 'student' THEN initcap(split_part(_domain,'.',1)) || ' University' ELSE 'General' END
  );

  BEGIN
    SELECT COALESCE(array_agg(value::text), '{}')
      INTO _interests
      FROM jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'interests','[]'::jsonb)) AS value;
  EXCEPTION WHEN others THEN _interests := '{}'; END;
  BEGIN
    SELECT COALESCE(array_agg(value::text), '{}')
      INTO _interests_raw
      FROM jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'interests_raw','[]'::jsonb)) AS value;
  EXCEPTION WHEN others THEN _interests_raw := '{}'; END;

  _bonus := CASE WHEN _user_type = 'student' THEN 10 ELSE 5 END;

  INSERT INTO public.profiles (
    id, full_name, university_name, university_domain,
    department, year, earned_credits, paid_credits, email_hash, user_type,
    country, age_range, interests, interests_raw
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    uni,
    _domain,
    COALESCE(NEW.raw_user_meta_data->>'department',''),
    COALESCE(NEW.raw_user_meta_data->>'year',''),
    _bonus,
    0,
    _hash,
    _user_type,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'country',''),''),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'age_range',''),''),
    _interests,
    _interests_raw
  );

  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, expires_at)
  VALUES (NEW.id,'earned',_bonus,'signup_bonus', now() + interval '30 days');

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();