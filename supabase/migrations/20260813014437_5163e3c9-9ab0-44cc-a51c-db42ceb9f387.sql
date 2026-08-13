CREATE OR REPLACE FUNCTION public.charge_survey_publish_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _earned int; _paid int; _cost int; _bonus int;
  _tier text; _flagged boolean; _max_goal int;
  _user_type text; _mult int := 1; _total int;
  _max_expiry timestamptz := now() + interval '30 days';
  _user_goal int; _grad date; _alumni boolean := false;
BEGIN
  _tier := COALESCE(NEW.tier, 'basic');

  IF _tier = 'research_boost' THEN
    IF auth.uid() IS NOT NULL AND NEW.creator_id <> auth.uid() THEN
      RAISE EXCEPTION 'You can only publish as yourself';
    END IF;
    NEW.is_active := false;
    NEW.boosted_until := NULL;
    NEW.respondent_bonus := 0;
    NEW.paid_cost := 0;
    IF NEW.response_goal IS NULL OR NEW.response_goal <= 0 THEN
      NEW.response_goal := 50;
    ELSE
      NEW.response_goal := LEAST(NEW.response_goal, 500);
    END IF;
    NEW.expires_at := now() + interval '30 days';
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
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

  -- Respondent bonus credits are granted by the platform to respondents;
  -- they are NOT deducted from the creator's balance.
  _total := _cost;

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
  END IF;

  NEW.paid_cost := 0;
  RETURN NEW;
END;
$function$;