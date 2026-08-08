-- 1. Allow the new tier
ALTER TABLE public.surveys DROP CONSTRAINT IF EXISTS surveys_tier_check;
ALTER TABLE public.surveys ADD CONSTRAINT surveys_tier_check
  CHECK (tier = ANY (ARRAY['basic'::text,'targeted'::text,'boosted'::text,'pro'::text,'research_boost'::text]));

-- 2. Research boosts table
CREATE TABLE public.research_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  survey_id uuid REFERENCES public.surveys(id) ON DELETE SET NULL,
  boost_tier text NOT NULL CHECK (boost_tier = ANY (ARRAY['starter','standard','advanced','campus'])),
  target_responses integer NOT NULL CHECK (target_responses > 0 AND target_responses <= 500),
  price_ghs_pesewas bigint NOT NULL CHECK (price_ghs_pesewas > 0),
  paystack_reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending','paid','active','completed','expired','failed'])),
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw jsonb,
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.research_boosts TO authenticated;
GRANT ALL ON public.research_boosts TO service_role;

ALTER TABLE public.research_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Boosts: read own" ON public.research_boosts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX research_boosts_survey_idx ON public.research_boosts(survey_id);
CREATE INDEX research_boosts_user_idx ON public.research_boosts(user_id);

CREATE TRIGGER research_boosts_updated_at
  BEFORE UPDATE ON public.research_boosts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Publishing trigger: research_boost surveys cost no credits and start unpublished
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
  _tier := COALESCE(NEW.tier, 'basic');

  -- Research Boost: paid with money, activated only after Paystack confirms.
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

-- 4. Activation on confirmed payment (service-role only)
CREATE OR REPLACE FUNCTION public.activate_research_boost(_reference text, _raw jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _b public.research_boosts;
BEGIN
  SELECT * INTO _b FROM public.research_boosts WHERE paystack_reference = _reference FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown research boost reference: %', _reference;
  END IF;

  IF _b.status IN ('active','completed') THEN
    RETURN jsonb_build_object('ok', true, 'already', true,
      'survey_id', _b.survey_id, 'target_responses', _b.target_responses);
  END IF;

  UPDATE public.research_boosts
    SET status = 'active',
        raw = _raw,
        activated_at = now(),
        expires_at = now() + interval '30 days'
    WHERE id = _b.id;

  IF _b.survey_id IS NOT NULL THEN
    UPDATE public.surveys
      SET is_active = true,
          boosted_until = now() + interval '30 days',
          response_goal = _b.target_responses,
          expires_at = now() + interval '30 days'
      WHERE id = _b.survey_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'already', false,
    'survey_id', _b.survey_id, 'target_responses', _b.target_responses);
END;
$function$;

REVOKE ALL ON FUNCTION public.activate_research_boost(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_research_boost(text, jsonb) TO service_role;

-- 5. Auto-close a boosted survey once the paid quota is filled
CREATE OR REPLACE FUNCTION public.research_boost_autoclose()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tier = 'research_boost'
     AND NEW.is_active
     AND NEW.response_count >= NEW.response_goal THEN
    NEW.is_active := false;
    UPDATE public.research_boosts
      SET status = 'completed'
      WHERE survey_id = NEW.id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER surveys_research_boost_autoclose
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.research_boost_autoclose();

-- 6. Admin listing
CREATE OR REPLACE FUNCTION public.admin_list_research_boosts()
 RETURNS TABLE(id uuid, user_id uuid, buyer_name text, survey_id uuid, survey_title text,
               boost_tier text, target_responses integer, delivered integer,
               price_ghs_pesewas bigint, status text, targeting jsonb,
               created_at timestamptz, activated_at timestamptz, expires_at timestamptz)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.require_admin_user();
  RETURN QUERY
  SELECT b.id, b.user_id, COALESCE(p.full_name, 'Unknown'), b.survey_id,
         COALESCE(s.title, '(survey deleted)'), b.boost_tier, b.target_responses,
         COALESCE(s.response_count, 0), b.price_ghs_pesewas, b.status, b.targeting,
         b.created_at, b.activated_at, b.expires_at
  FROM public.research_boosts b
  LEFT JOIN public.profiles p ON p.id = b.user_id
  LEFT JOIN public.surveys s ON s.id = b.survey_id
  ORDER BY b.created_at DESC
  LIMIT 500;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_research_boosts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_research_boosts() TO authenticated, service_role;