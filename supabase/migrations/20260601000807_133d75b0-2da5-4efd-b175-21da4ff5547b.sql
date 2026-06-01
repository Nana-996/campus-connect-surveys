CREATE OR REPLACE FUNCTION public.charge_survey_publish_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _earned int;
  _cost int;
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

  IF _earned < _cost THEN
    RAISE EXCEPTION 'Need % more credits — answer surveys in your feed to earn them.', _cost - _earned;
  END IF;

  -- Only update earned_credits; do NOT touch paid_credits (the protect_profile trigger blocks it for non-admins)
  UPDATE public.profiles
    SET earned_credits = earned_credits - _cost
    WHERE id = auth.uid();

  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
    VALUES (auth.uid(), 'earned', -_cost, 'publish_' || _tier, NEW.id);

  NEW.paid_cost := 0;
  RETURN NEW;
END;
$function$;