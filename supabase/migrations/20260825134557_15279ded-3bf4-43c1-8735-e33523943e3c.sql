-- 1) referral codes on profiles
CREATE OR REPLACE FUNCTION public.new_referral_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path TO ''
AS $$
  SELECT upper(substr(replace(md5(gen_random_uuid()::text || clock_timestamp()::text), '0', 'z'), 1, 8));
$$;

REVOKE ALL ON FUNCTION public.new_referral_code() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text;

UPDATE public.profiles SET referral_code = public.new_referral_code() WHERE referral_code IS NULL;

ALTER TABLE public.profiles ALTER COLUMN referral_code SET DEFAULT public.new_referral_code();

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles (referral_code);

-- 2) referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  referred_user_type text NOT NULL,
  credits_awarded integer NOT NULL DEFAULT 0,
  wallet text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral records"
ON public.referrals FOR SELECT TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_id);

-- 3) my referral code (creates one if missing)
CREATE OR REPLACE FUNCTION public.my_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT referral_code INTO _code FROM public.profiles WHERE id = _uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF _code IS NULL THEN
    _code := public.new_referral_code();
    UPDATE public.profiles SET referral_code = _code WHERE id = _uid;
  END IF;

  RETURN _code;
END;
$$;

REVOKE ALL ON FUNCTION public.my_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referral_code() TO authenticated;

-- 4) claim a referral code
CREATE OR REPLACE FUNCTION public.claim_referral(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  _uid uuid := auth.uid();
  _code_clean text := upper(regexp_replace(coalesce(_code, ''), '[^A-Za-z0-9]', '', 'g'));
  _me record;
  _referrer record;
  _amount integer;
  _wallet text;
  _current integer;
  _next integer;
  _alumni boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _code_clean = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  SELECT id, user_type, created_at INTO _me FROM public.profiles WHERE id = _uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_profile');
  END IF;

  -- only newly-created accounts can be attributed
  IF _me.created_at < now() - interval '14 days' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'account_too_old');
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = _uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;

  SELECT id, user_type, graduation_date, earned_credits, paid_credits, is_flagged
    INTO _referrer
  FROM public.profiles
  WHERE referral_code = _code_clean
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;

  IF _referrer.id = _uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_referral');
  END IF;

  _amount := CASE WHEN _me.user_type = 'student' THEN 5 ELSE 3 END;

  _alumni := _referrer.user_type = 'student'
             AND _referrer.graduation_date IS NOT NULL
             AND (_referrer.graduation_date + interval '1 month')::date <= current_date;

  IF _referrer.user_type = 'general' OR _alumni THEN
    _wallet := 'paid';
    _current := coalesce(_referrer.paid_credits, 0);
  ELSE
    _wallet := 'earned';
    _current := coalesce(_referrer.earned_credits, 0);
  END IF;

  -- flagged accounts get the attribution recorded but no credits
  IF coalesce(_referrer.is_flagged, false) THEN
    _amount := 0;
  END IF;

  INSERT INTO public.referrals(referrer_id, referred_user_id, referred_user_type, credits_awarded, wallet)
  VALUES (_referrer.id, _uid, _me.user_type, _amount, _wallet);

  IF _amount > 0 THEN
    _next := _current + _amount;
    -- Credit balances are trigger-protected against client writes; clear the
    -- request claims for this statement so the internal award is allowed.
    PERFORM set_config('request.jwt.claims', '', true);
    IF _wallet = 'paid' THEN
      UPDATE public.profiles SET paid_credits = _next WHERE id = _referrer.id;
    ELSE
      UPDATE public.profiles SET earned_credits = _next WHERE id = _referrer.id;
    END IF;

    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, expires_at)
    VALUES (
      _referrer.id, _wallet, _amount,
      'referral:' || _me.user_type,
      CASE WHEN _wallet = 'earned' THEN now() + interval '30 days' ELSE NULL END
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'credits_awarded', _amount, 'referred_user_type', _me.user_type);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;