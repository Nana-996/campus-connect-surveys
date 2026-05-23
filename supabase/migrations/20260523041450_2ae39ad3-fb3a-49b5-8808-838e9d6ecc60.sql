CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _domain text; uni text; _hash text; _disposable boolean; _user_type text;
BEGIN
  _domain := lower(split_part(NEW.email, '@', 2));
  SELECT EXISTS(SELECT 1 FROM public.disposable_domains d WHERE d.domain = _domain) INTO _disposable;
  IF _disposable THEN RAISE EXCEPTION 'Disposable email addresses are not allowed'; END IF;

  _hash := encode(digest(lower(trim(NEW.email)), 'sha256'), 'hex');
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email_hash = _hash) THEN
    RAISE EXCEPTION 'An account already exists for this email';
  END IF;

  _user_type := lower(COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'));
  IF _user_type NOT IN ('student','general') THEN _user_type := 'student'; END IF;

  IF _user_type = 'student' AND NOT public.is_academic_domain(_domain) THEN
    RAISE EXCEPTION 'Student accounts require an academic email (.edu, .edu.xx, or .ac.xx)';
  END IF;

  uni := COALESCE(NEW.raw_user_meta_data->>'university_name',
                  CASE WHEN _user_type='student'
                    THEN initcap(split_part(_domain,'.',1)) || ' University'
                    ELSE 'General'
                  END);

  INSERT INTO public.profiles (id, full_name, university_name, university_domain, department, year, earned_credits, paid_credits, email_hash, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    uni, _domain,
    COALESCE(NEW.raw_user_meta_data->>'department',''),
    COALESCE(NEW.raw_user_meta_data->>'year',''),
    3, 0, _hash, _user_type
  );
  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, expires_at)
    VALUES (NEW.id,'earned',3,'signup_bonus', now() + interval '30 days');
  RETURN NEW;
END;
$function$;