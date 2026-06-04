
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS respondent_bonus integer NOT NULL DEFAULT 0
  CHECK (respondent_bonus >= 0 AND respondent_bonus <= 3);

-- Update charge function to factor in bonus credits
CREATE OR REPLACE FUNCTION public.charge_survey_publish_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _earned int;
  _cost int;
  _bonus int;
  _bonus_total int;
  _tier text;
  _flagged boolean;
  _max_goal int;
  _max_expiry timestamptz := now() + interval '30 days';
  _user_goal int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in';
  END IF;

  IF NEW.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only publish as yourself';
  END IF;

  SELECT earned_credits, is_flagged
    INTO _earned, _flagged
    FROM public.profiles
    WHERE id = auth.uid()
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile missing — refresh and retry';
  END IF;

  IF _flagged THEN
    RAISE EXCEPTION 'Your account is under review. Contact support.';
  END IF;

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

  -- Bonus per response only allowed for Pro tier
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
  IF _earned < (_cost + _bonus_total) THEN
    RAISE EXCEPTION 'Need % more credits — answer surveys in your feed to earn them.',
      (_cost + _bonus_total) - _earned;
  END IF;

  UPDATE public.profiles
    SET earned_credits = earned_credits - (_cost + _bonus_total)
    WHERE id = auth.uid();

  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
    VALUES (auth.uid(), 'earned', -_cost, 'publish_' || _tier, NEW.id);

  IF _bonus_total > 0 THEN
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
      VALUES (auth.uid(), 'earned', -_bonus_total, 'responder_bonus_pool', NEW.id);
  END IF;

  NEW.paid_cost := 0;
  RETURN NEW;
END;
$function$;

-- Update response handler to award base + bonus
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
BEGIN
  UPDATE public.surveys SET response_count = response_count + 1 WHERE id = NEW.survey_id;

  SELECT questions, COALESCE(respondent_bonus, 0)
    INTO _q, _bonus
    FROM public.surveys WHERE id = NEW.survey_id;
  IF _q IS NOT NULL THEN _total := jsonb_array_length(_q); END IF;
  IF _total > 0 THEN
    SELECT COUNT(*) INTO _answered
      FROM jsonb_each_text(NEW.answers) WHERE value IS NOT NULL AND length(trim(value)) > 0;
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

  IF _flagged OR _quality < 0.8 OR COALESCE(NEW.duration_ms,0) < 15000 THEN
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
      VALUES (NEW.respondent_id,'earned',0,'response_no_credit_low_quality',NEW.survey_id);
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

-- Allow respondent_bonus to be set at insert time but locked after publish (matches other protected fields)
CREATE OR REPLACE FUNCTION public.protect_survey_sensitive_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF pg_trigger_depth() > 1
     AND NEW.response_count IS DISTINCT FROM OLD.response_count
     AND NEW.tier IS NOT DISTINCT FROM OLD.tier
     AND NEW.boosted_until IS NOT DISTINCT FROM OLD.boosted_until
     AND NEW.paid_cost IS NOT DISTINCT FROM OLD.paid_cost
     AND NEW.response_goal IS NOT DISTINCT FROM OLD.response_goal
     AND NEW.target_department IS NOT DISTINCT FROM OLD.target_department
     AND NEW.target_year IS NOT DISTINCT FROM OLD.target_year
     AND NEW.target_country IS NOT DISTINCT FROM OLD.target_country
     AND NEW.target_age_range IS NOT DISTINCT FROM OLD.target_age_range
     AND NEW.target_interests IS NOT DISTINCT FROM OLD.target_interests
     AND NEW.university_domain IS NOT DISTINCT FROM OLD.university_domain
     AND NEW.creator_id IS NOT DISTINCT FROM OLD.creator_id
     AND NEW.expires_at IS NOT DISTINCT FROM OLD.expires_at
     AND NEW.allow_general_respondents IS NOT DISTINCT FROM OLD.allow_general_respondents
     AND NEW.respondent_bonus IS NOT DISTINCT FROM OLD.respondent_bonus
  THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.boosted_until IS DISTINCT FROM OLD.boosted_until
     OR NEW.paid_cost IS DISTINCT FROM OLD.paid_cost
     OR NEW.response_count IS DISTINCT FROM OLD.response_count
     OR NEW.response_goal IS DISTINCT FROM OLD.response_goal
     OR NEW.target_department IS DISTINCT FROM OLD.target_department
     OR NEW.target_year IS DISTINCT FROM OLD.target_year
     OR NEW.target_country IS DISTINCT FROM OLD.target_country
     OR NEW.target_age_range IS DISTINCT FROM OLD.target_age_range
     OR NEW.target_interests IS DISTINCT FROM OLD.target_interests
     OR NEW.university_domain IS DISTINCT FROM OLD.university_domain
     OR NEW.creator_id IS DISTINCT FROM OLD.creator_id
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.allow_general_respondents IS DISTINCT FROM OLD.allow_general_respondents
     OR NEW.respondent_bonus IS DISTINCT FROM OLD.respondent_bonus
  THEN
    RAISE EXCEPTION 'You cannot modify protected survey fields after publish';
  END IF;

  RETURN NEW;
END;
$function$;
