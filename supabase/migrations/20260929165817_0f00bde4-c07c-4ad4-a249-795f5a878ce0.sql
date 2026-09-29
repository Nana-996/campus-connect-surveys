CREATE OR REPLACE FUNCTION public.redeem_promo_code(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.promo_codes; _uid uuid := auth.uid(); _type text; _wallet text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  r := public._promo_check(_code, _uid);
  IF r.bonus_credits = 0 THEN
    RETURN jsonb_build_object('ok', true, 'credits', 0, 'discount_percent', r.discount_percent,
      'message', 'This code gives ' || r.discount_percent || '% off credit packs — apply it at checkout.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.promo_redemptions WHERE code_id = r.id AND user_id = _uid) THEN
    RAISE EXCEPTION 'You have already used this code';
  END IF;
  SELECT user_type INTO _type FROM public.profiles WHERE id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing'; END IF;
  _wallet := CASE WHEN _type = 'general' THEN 'paid' ELSE 'earned' END;
  PERFORM set_config('app.internal_credit_grant','on',true);
  IF _wallet = 'paid' THEN
    UPDATE public.profiles SET paid_credits = paid_credits + r.bonus_credits WHERE id = _uid;
  ELSE
    UPDATE public.profiles SET earned_credits = earned_credits + r.bonus_credits WHERE id = _uid;
  END IF;
  PERFORM set_config('app.internal_credit_grant','off',true);
  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason) VALUES (_uid, _wallet, r.bonus_credits, 'promo_' || r.code);
  INSERT INTO public.promo_redemptions(code_id, user_id, kind, credits_granted, discount_percent)
    VALUES (r.id, _uid, 'credits', r.bonus_credits, r.discount_percent);
  UPDATE public.promo_codes SET uses_count = uses_count + 1 WHERE id = r.id;
  RETURN jsonb_build_object('ok', true, 'credits', r.bonus_credits, 'discount_percent', r.discount_percent,
    'message', r.bonus_credits || ' credits added to your balance.');
END; $function$;