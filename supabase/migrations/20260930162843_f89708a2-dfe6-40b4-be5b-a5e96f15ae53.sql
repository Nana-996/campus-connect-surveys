CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _domain text; uni text; _hash text; _disposable boolean;
  _user_type text; _interests text[]; _interests_raw text[];
  _bonus int; _index_number text; _grad date; _reason text := 'signup_bonus';
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

  BEGIN
    _grad := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'graduation_date','')), '')::date;
  EXCEPTION WHEN others THEN _grad := NULL; END;
  IF _user_type = 'student' THEN
    IF _grad IS NULL THEN
      RAISE EXCEPTION 'Student accounts require an expected graduation date';
    END IF;
    IF _grad < (current_date - interval '10 years')::date
       OR _grad > (current_date + interval '12 years')::date THEN
      RAISE EXCEPTION 'Expected graduation date is out of range';
    END IF;
  ELSE
    _grad := NULL;
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
  IF _user_type = 'student' AND public.is_school_subscribed(_domain) THEN
    _bonus := 50; _reason := 'school_signup_bonus';
  END IF;

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
    country, age_range, interests, interests_raw, index_number, graduation_date
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    uni, _domain,
    CASE WHEN _user_type = 'student' THEN COALESCE(NEW.raw_user_meta_data->>'department','') ELSE '' END,
    CASE WHEN _user_type = 'student' THEN COALESCE(NEW.raw_user_meta_data->>'year','') ELSE '' END,
    _bonus, 0, _hash, _user_type,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'country',''),'') ,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'age_range',''),'') ,
    _interests, _interests_raw, _index_number, _grad
  );

  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, expires_at)
  VALUES (NEW.id,'earned',_bonus,_reason,NULL);
  RETURN NEW;
END;
$function$;