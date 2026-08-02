ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS graduation_date date;

CREATE OR REPLACE FUNCTION public.is_alumni(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.user_type = 'student'
            AND p.graduation_date IS NOT NULL
            AND (p.graduation_date + interval '1 month')::date <= current_date
     FROM public.profiles p WHERE p.id = _user_id),
    false)
$$;

REVOKE EXECUTE ON FUNCTION public.is_alumni(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_alumni(uuid) TO authenticated;

-- Protect graduation_date from self-edits after signup
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    IF NEW.is_flagged IS DISTINCT FROM OLD.is_flagged
       OR NEW.flag_reason IS DISTINCT FROM OLD.flag_reason
       OR NEW.email_hash IS DISTINCT FROM OLD.email_hash
       OR NEW.user_type IS DISTINCT FROM OLD.user_type
       OR NEW.university_domain IS DISTINCT FROM OLD.university_domain
       OR NEW.graduation_date IS DISTINCT FROM OLD.graduation_date
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
     OR NEW.graduation_date IS DISTINCT FROM OLD.graduation_date
     OR NEW.id IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'You cannot modify protected profile fields';
  END IF;

  RETURN NEW;
END;
$function$;

-- Capture graduation date at signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _domain text; uni text; _hash text; _disposable boolean;
  _user_type text; _interests text[]; _interests_raw text[];
  _bonus int; _index_number text; _grad date;
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
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'country',''),''),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'age_range',''),''),
    _interests, _interests_raw, _index_number, _grad
  );

  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, expires_at)
  VALUES (NEW.id,'earned',_bonus,'signup_bonus', now() + interval '30 days');
  RETURN NEW;
END;
$function$;

-- Alumni students no longer earn free credits
CREATE OR REPLACE FUNCTION public.handle_new_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _q jsonb; _total int := 0; _answered int := 0;
  _quality numeric; _flagged boolean;
  _day date := (now() AT TIME ZONE 'UTC')::date;
  _week date := date_trunc('week', now() AT TIME ZONE 'UTC')::date;
  _day_count int := 0; _week_count int := 0;
  _recent_count int;
  _bonus int := 0;
  _award int := 1;
  _started timestamptz;
  _server_duration_ms bigint := 0;
  _effective_duration_ms bigint := 0;
  _min_seconds int := 15;
  _min_ms bigint := 15000;
  _max_client_ms constant bigint := 30 * 60 * 1000;
BEGIN
  UPDATE public.surveys SET response_count = response_count + 1 WHERE id = NEW.survey_id;

  SELECT started_at INTO _started
    FROM public.survey_response_starts
    WHERE user_id = NEW.respondent_id AND survey_id = NEW.survey_id;
  IF _started IS NOT NULL THEN
    _server_duration_ms := GREATEST(0, (EXTRACT(EPOCH FROM (now() - _started)) * 1000)::bigint);
    _effective_duration_ms := _server_duration_ms;
  ELSE
    _effective_duration_ms := LEAST(COALESCE(NULLIF(NEW.duration_ms, 0), 0), _max_client_ms);
  END IF;
  UPDATE public.survey_responses SET duration_ms = _effective_duration_ms WHERE id = NEW.id;

  SELECT questions, COALESCE(respondent_bonus, 0), COALESCE(min_response_seconds, 15)
    INTO _q, _bonus, _min_seconds
    FROM public.surveys WHERE id = NEW.survey_id;
  _min_ms := GREATEST(0, _min_seconds)::bigint * 1000;

  IF _q IS NOT NULL THEN
    SELECT COUNT(*) INTO _total
      FROM jsonb_array_elements(_q) AS q
      WHERE COALESCE((q->>'required')::boolean, true) = true;
    IF _total = 0 THEN
      _total := jsonb_array_length(_q);
      SELECT COUNT(*) INTO _answered
        FROM jsonb_array_elements(_q) AS q
        WHERE length(trim(COALESCE(NEW.answers->>(q->>'id'), ''))) > 0;
    ELSE
      SELECT COUNT(*) INTO _answered
        FROM jsonb_array_elements(_q) AS q
        WHERE COALESCE((q->>'required')::boolean, true) = true
          AND length(trim(COALESCE(NEW.answers->>(q->>'id'), ''))) > 0;
    END IF;
  END IF;

  IF _total > 0 THEN
    _quality := _answered::numeric / _total::numeric;
  ELSE
    _quality := 0;
  END IF;
  UPDATE public.survey_responses SET quality_score = _quality WHERE id = NEW.id;

  SELECT is_flagged INTO _flagged FROM public.profiles WHERE id = NEW.respondent_id;

  SELECT COUNT(*) INTO _recent_count FROM public.survey_responses
    WHERE respondent_id = NEW.respondent_id AND created_at > now() - interval '10 minutes';
  IF _recent_count > 5 THEN
    INSERT INTO public.review_flags(user_id, type, details)
      VALUES (NEW.respondent_id, 'rapid_fire', jsonb_build_object('count',_recent_count));
  END IF;

  IF _min_ms > 0 AND _effective_duration_ms < _min_ms THEN
    INSERT INTO public.review_flags(user_id, type, details)
      VALUES (NEW.respondent_id, 'speed_trap',
              jsonb_build_object('survey_id', NEW.survey_id,
                                 'duration_ms', _effective_duration_ms,
                                 'min_ms', _min_ms));
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
      VALUES (NEW.respondent_id,'earned',0,'response_no_credit_speed_trap',NEW.survey_id);
    RETURN NEW;
  END IF;

  IF _flagged OR _quality < 0.8 THEN
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
      VALUES (NEW.respondent_id,'earned',0,'response_no_credit_low_quality',NEW.survey_id);
    RETURN NEW;
  END IF;

  -- Graduated students lose free student earning
  IF public.is_alumni(NEW.respondent_id) THEN
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
      VALUES (NEW.respondent_id,'earned',0,'response_no_credit_graduated',NEW.survey_id);
    RETURN NEW;
  END IF;

  INSERT INTO public.earning_caps(user_id) VALUES (NEW.respondent_id)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT day_bucket, week_bucket, day_count, week_count
    INTO _day, _week, _day_count, _week_count
    FROM public.earning_caps WHERE user_id = NEW.respondent_id FOR UPDATE;
  IF _day <> (now() AT TIME ZONE 'UTC')::date THEN _day := (now() AT TIME ZONE 'UTC')::date; _day_count := 0; END IF;
  IF _week <> date_trunc('week', now() AT TIME ZONE 'UTC')::date THEN
    _week := date_trunc('week', now() AT TIME ZONE 'UTC')::date; _week_count := 0;
  END IF;
  IF _day_count >= 3 OR _week_count >= 10 THEN
    UPDATE public.earning_caps
      SET day_bucket=_day, week_bucket=_week, day_count=_day_count, week_count=_week_count, updated_at=now()
      WHERE user_id = NEW.respondent_id;
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
      VALUES (NEW.respondent_id,'earned',0,'cap_reached',NEW.survey_id);
    RETURN NEW;
  END IF;

  _award := 1 + COALESCE(_bonus, 0);

  UPDATE public.profiles SET earned_credits = earned_credits + _award WHERE id = NEW.respondent_id;
  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id, expires_at)
    VALUES (NEW.respondent_id,'earned',_award,
            CASE WHEN _bonus > 0 THEN 'response_with_bonus' ELSE 'response' END,
            NEW.survey_id, now() + interval '30 days');
  UPDATE public.earning_caps
    SET day_bucket=_day, week_bucket=_week,
        day_count=_day_count+1, week_count=_week_count+1, updated_at=now()
    WHERE user_id = NEW.respondent_id;
  RETURN NEW;
END;
$function$;

-- Graduated students publish at general-account pricing, paid credits only
CREATE OR REPLACE FUNCTION public.charge_survey_publish_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _earned int; _paid int; _cost int; _bonus int; _bonus_total int;
  _tier text; _flagged boolean; _max_goal int;
  _user_type text; _mult int := 1; _total int;
  _max_expiry timestamptz := now() + interval '30 days';
  _user_goal int; _grad date; _alumni boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    _tier := COALESCE(NEW.tier, 'basic');
    IF _tier = 'basic' THEN _max_goal := 50;
    ELSIF _tier = 'targeted' THEN _max_goal := 200;
    ELSIF _tier = 'boosted' THEN _max_goal := 500; NEW.boosted_until := now() + interval '72 hours';
    ELSIF _tier = 'pro' THEN _max_goal := 2000; NEW.boosted_until := now() + interval '7 days';
    ELSE RAISE EXCEPTION 'Unknown tier %', _tier;
    END IF;
    IF NEW.response_goal IS NULL OR NEW.response_goal <= 0 THEN
      NEW.response_goal := _max_goal;
    ELSE
      NEW.response_goal := LEAST(NEW.response_goal, _max_goal);
    END IF;
    IF NEW.expires_at IS NULL OR NEW.expires_at <= now() THEN
      NEW.expires_at := _max_expiry;
    ELSE
      NEW.expires_at := LEAST(NEW.expires_at, _max_expiry);
    END IF;
    NEW.respondent_bonus := 0;
    NEW.paid_cost := 0;
    RETURN NEW;
  END IF;

  IF NEW.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only publish as yourself';
  END IF;

  SELECT earned_credits, paid_credits, is_flagged, user_type, graduation_date
    INTO _earned, _paid, _flagged, _user_type, _grad
    FROM public.profiles
    WHERE id = auth.uid()
    FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing — refresh and retry'; END IF;
  IF _flagged THEN RAISE EXCEPTION 'Your account is under review. Contact support.'; END IF;

  _alumni := _user_type = 'student'
             AND _grad IS NOT NULL
             AND (_grad + interval '1 month')::date <= current_date;

  _tier := COALESCE(NEW.tier, 'basic');
  _user_goal := NEW.response_goal;
  _bonus := COALESCE(NEW.respondent_bonus, 0);

  IF _tier = 'basic' THEN
    _cost := 1; _max_goal := 50;
  ELSIF _tier = 'targeted' THEN
    _cost := 3; _max_goal := 200;
  ELSIF _tier = 'boosted' THEN
    _cost := 8; _max_goal := 500;
    NEW.boosted_until := now() + interval '72 hours';
  ELSIF _tier = 'pro' THEN
    _cost := 15; _max_goal := 2000;
    NEW.boosted_until := now() + interval '7 days';
  ELSE
    RAISE EXCEPTION 'Unknown tier %', _tier;
  END IF;

  IF _user_type = 'general' OR _alumni THEN
    _mult := 2;
  END IF;
  _cost := _cost * _mult;

  IF _tier <> 'pro' AND _bonus > 0 THEN
    RAISE EXCEPTION 'Responder bonus credits are only available on the Pro tier';
  END IF;
  IF _bonus < 0 OR _bonus > 3 THEN
    RAISE EXCEPTION 'Responder bonus must be between 0 and 3';
  END IF;
  NEW.respondent_bonus := _bonus;

  IF _user_goal IS NULL OR _user_goal <= 0 THEN
    NEW.response_goal := _max_goal;
  ELSE
    NEW.response_goal := LEAST(_user_goal, _max_goal);
  END IF;

  IF NEW.expires_at IS NULL OR NEW.expires_at <= now() THEN
    NEW.expires_at := _max_expiry;
  ELSE
    NEW.expires_at := LEAST(NEW.expires_at, _max_expiry);
  END IF;

  IF _tier = 'basic' THEN
    NEW.target_department := NULL;
    NEW.target_year := NULL;
    NEW.target_country := NULL;
    NEW.target_age_range := NULL;
    NEW.target_interests := '{}';
  END IF;

  _bonus_total := _bonus * NEW.response_goal;
  _total := _cost + _bonus_total;

  IF _user_type = 'general' OR _alumni THEN
    IF _paid < _total THEN
      RAISE EXCEPTION 'Need % more credits — visit Buy Credits to top up.',
        (_total - _paid);
    END IF;
    UPDATE public.profiles
      SET paid_credits = paid_credits - _total
      WHERE id = auth.uid();
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
      VALUES (auth.uid(), 'paid', -_cost, 'publish_' || _tier, NEW.id);
    IF _bonus_total > 0 THEN
      INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
        VALUES (auth.uid(), 'paid', -_bonus_total, 'responder_bonus_pool', NEW.id);
    END IF;
  ELSE
    IF _earned < _total THEN
      RAISE EXCEPTION 'Need % more credits — answer surveys in your feed to earn them.',
        (_total - _earned);
    END IF;
    UPDATE public.profiles
      SET earned_credits = earned_credits - _total
      WHERE id = auth.uid();
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
      VALUES (auth.uid(), 'earned', -_cost, 'publish_' || _tier, NEW.id);
    IF _bonus_total > 0 THEN
      INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
        VALUES (auth.uid(), 'earned', -_bonus_total, 'responder_bonus_pool', NEW.id);
    END IF;
  END IF;

  NEW.paid_cost := 0;
  RETURN NEW;
END;
$function$;