CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code = upper(code) AND length(code) BETWEEN 3 AND 32),
  bonus_credits integer NOT NULL DEFAULT 0 CHECK (bonus_credits BETWEEN 0 AND 1000),
  discount_percent integer NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 90),
  expires_at timestamptz,
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  uses_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (bonus_credits > 0 OR discount_percent > 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage promo codes" ON public.promo_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('credits','discount')),
  credits_granted integer NOT NULL DEFAULT 0,
  discount_percent integer NOT NULL DEFAULT 0,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);
GRANT SELECT ON public.promo_redemptions TO authenticated;
GRANT ALL ON public.promo_redemptions TO service_role;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own redemptions" ON public.promo_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Shared validation. Returns the code row or raises.
CREATE OR REPLACE FUNCTION public._promo_check(_code text, _user uuid)
RETURNS public.promo_codes LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.promo_codes; _prev public.promo_redemptions;
BEGIN
  SELECT * INTO r FROM public.promo_codes WHERE code = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND OR NOT r.is_active THEN RAISE EXCEPTION 'That code is not valid'; END IF;
  IF r.expires_at IS NOT NULL AND r.expires_at <= now() THEN RAISE EXCEPTION 'That code has expired'; END IF;
  SELECT * INTO _prev FROM public.promo_redemptions WHERE code_id = r.id AND user_id = _user;
  IF FOUND THEN
    -- A discount reserved on an unpaid checkout can be reused.
    IF _prev.kind = 'discount' AND NOT EXISTS (
      SELECT 1 FROM public.paystack_purchases WHERE reference = _prev.reference AND status = 'success') THEN
      RETURN r;
    END IF;
    RAISE EXCEPTION 'You have already used this code';
  END IF;
  IF r.max_uses IS NOT NULL AND r.uses_count >= r.max_uses THEN RAISE EXCEPTION 'This code has reached its limit'; END IF;
  RETURN r;
END; $$;
REVOKE EXECUTE ON FUNCTION public._promo_check(text, uuid) FROM PUBLIC, anon, authenticated;

-- Redeem a bonus-credit code (signed-in user).
CREATE OR REPLACE FUNCTION public.redeem_promo_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
  IF _wallet = 'paid' THEN
    UPDATE public.profiles SET paid_credits = paid_credits + r.bonus_credits WHERE id = _uid;
  ELSE
    UPDATE public.profiles SET earned_credits = earned_credits + r.bonus_credits WHERE id = _uid;
  END IF;
  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason) VALUES (_uid, _wallet, r.bonus_credits, 'promo_' || r.code);
  INSERT INTO public.promo_redemptions(code_id, user_id, kind, credits_granted, discount_percent)
    VALUES (r.id, _uid, 'credits', r.bonus_credits, r.discount_percent);
  UPDATE public.promo_codes SET uses_count = uses_count + 1 WHERE id = r.id;
  RETURN jsonb_build_object('ok', true, 'credits', r.bonus_credits, 'discount_percent', r.discount_percent,
    'message', r.bonus_credits || ' credits added to your balance.');
END; $$;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text) TO authenticated;

-- Reserve a discount for a checkout (server only).
CREATE OR REPLACE FUNCTION public.reserve_promo_discount(_code text, _user uuid, _reference text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.promo_codes;
BEGIN
  r := public._promo_check(_code, _user);
  IF r.discount_percent = 0 THEN RAISE EXCEPTION 'This code gives credits, not a discount — redeem it above'; END IF;
  INSERT INTO public.promo_redemptions(code_id, user_id, kind, discount_percent, reference)
    VALUES (r.id, _user, 'discount', r.discount_percent, _reference)
    ON CONFLICT (code_id, user_id) DO UPDATE SET reference = EXCLUDED.reference, created_at = now();
  RETURN r.discount_percent;
END; $$;
REVOKE EXECUTE ON FUNCTION public.reserve_promo_discount(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_promo_discount(text, uuid, text) TO service_role;

-- Count a discount use once its checkout is paid.
CREATE OR REPLACE FUNCTION public.promo_count_paid_discount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'success' AND OLD.status IS DISTINCT FROM 'success' THEN
    UPDATE public.promo_codes c SET uses_count = uses_count + 1
      FROM public.promo_redemptions pr
     WHERE pr.reference = NEW.reference AND pr.kind = 'discount' AND pr.code_id = c.id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.promo_count_paid_discount() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER promo_count_paid_discount AFTER UPDATE OF status ON public.paystack_purchases
  FOR EACH ROW EXECUTE FUNCTION public.promo_count_paid_discount();