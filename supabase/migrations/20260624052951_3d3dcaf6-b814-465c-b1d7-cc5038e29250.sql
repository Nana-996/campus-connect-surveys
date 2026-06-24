-- 1) Replace publish charge to account for user_type and paid wallet
CREATE OR REPLACE FUNCTION public.charge_survey_publish_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _earned int; _paid int; _cost int; _bonus int; _bonus_total int;
  _tier text; _flagged boolean; _max_goal int;
  _user_type text; _mult int := 1; _total int;
  _max_expiry timestamptz := now() + interval '30 days';
  _user_goal int;
BEGIN
  -- Service-role bypass keeps original behavior (admin / manager lecturer evals)
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

  SELECT earned_credits, paid_credits, is_flagged, user_type
    INTO _earned, _paid, _flagged, _user_type
    FROM public.profiles
    WHERE id = auth.uid()
    FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing — refresh and retry'; END IF;
  IF _flagged THEN RAISE EXCEPTION 'Your account is under review. Contact support.'; END IF;

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

  -- General users pay 2x the base tier cost
  IF _user_type = 'general' THEN
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

  IF _user_type = 'general' THEN
    -- Spend purchased credits only
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
    -- Students spend earned credits
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

-- 2) Idempotent purchase grant used by the payments webhook (service role only)
CREATE OR REPLACE FUNCTION public.grant_purchased_credits(
  _user_id uuid,
  _credits int,
  _reference text,
  _amount_minor int,
  _currency text,
  _pack_label text,
  _payload jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_status text;
BEGIN
  IF _credits <= 0 THEN
    RAISE EXCEPTION 'credits must be positive';
  END IF;

  SELECT status INTO _existing_status
    FROM public.payment_transactions
    WHERE reference = _reference
    FOR UPDATE;

  IF FOUND AND _existing_status = 'paid' THEN
    RETURN false; -- already credited
  END IF;

  IF FOUND THEN
    UPDATE public.payment_transactions
      SET status = 'paid',
          credited_at = now(),
          provider = 'paddle',
          credits = _credits,
          amount_minor = _amount_minor,
          currency = _currency,
          pack_label = _pack_label,
          provider_payload = _payload
      WHERE reference = _reference;
  ELSE
    INSERT INTO public.payment_transactions(
      user_id, provider, reference, amount_minor, currency,
      credits, pack_label, status, provider_payload, credited_at
    ) VALUES (
      _user_id, 'paddle', _reference, _amount_minor, _currency,
      _credits, _pack_label, 'paid', _payload, now()
    );
  END IF;

  UPDATE public.profiles
    SET paid_credits = paid_credits + _credits
    WHERE id = _user_id;

  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason)
    VALUES (_user_id, 'paid', _credits, 'purchase_' || _pack_label);

  RETURN true;
END;
$$;

-- Webhook handler executes as service_role; lock down to that role.
REVOKE ALL ON FUNCTION public.grant_purchased_credits(uuid,int,text,int,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_purchased_credits(uuid,int,text,int,text,text,jsonb) TO service_role;