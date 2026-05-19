-- Add expiry column with 6-month default
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '6 months');

-- Backfill existing rows
UPDATE public.surveys SET expires_at = created_at + interval '6 months' WHERE expires_at IS NULL;

-- Update publish trigger: allow user-set response_goal (capped at tier max) and expires_at (capped at 6 months)
CREATE OR REPLACE FUNCTION public.charge_survey_publish_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _earned int; _paid int; _cost int; _tier text; _flagged boolean;
  _max_goal int; _max_expiry timestamptz := now() + interval '6 months';
  _user_goal int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'You must be signed in'; END IF;
  IF NEW.creator_id <> auth.uid() THEN RAISE EXCEPTION 'You can only publish as yourself'; END IF;

  SELECT earned_credits, paid_credits, is_flagged
    INTO _earned, _paid, _flagged
    FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing — refresh and retry'; END IF;
  IF _flagged THEN RAISE EXCEPTION 'Your account is under review. Contact support.'; END IF;

  _tier := COALESCE(NEW.tier, 'basic');
  _user_goal := NEW.response_goal;

  -- Cost + tier max goal
  IF _tier = 'basic' THEN _cost := 2; _max_goal := 25;
  ELSIF _tier = 'targeted' THEN _cost := 5; _max_goal := 100;
  ELSIF _tier = 'boosted' THEN _cost := 20; _max_goal := 250; NEW.boosted_until := now() + interval '48 hours';
  ELSIF _tier = 'pro' THEN _cost := 40; _max_goal := 1000; NEW.boosted_until := now() + interval '7 days';
  ELSE RAISE EXCEPTION 'Unknown tier %', _tier; END IF;

  -- Apply response goal: user-supplied (1.._max_goal) or tier max
  IF _user_goal IS NULL OR _user_goal <= 0 THEN
    NEW.response_goal := _max_goal;
  ELSE
    NEW.response_goal := LEAST(_user_goal, _max_goal);
  END IF;

  -- Apply expiry: user-supplied (future, <=6 months) or 6 months
  IF NEW.expires_at IS NULL OR NEW.expires_at <= now() THEN
    NEW.expires_at := _max_expiry;
  ELSE
    NEW.expires_at := LEAST(NEW.expires_at, _max_expiry);
  END IF;

  -- Basic: strip targeting; allow earned-first then paid
  IF _tier = 'basic' THEN
    NEW.target_department := NULL;
    NEW.target_year := NULL;
    IF _earned + _paid < _cost THEN
      RAISE EXCEPTION 'You need % credits to publish a basic survey', _cost;
    END IF;
    IF _earned >= _cost THEN
      UPDATE public.profiles SET earned_credits = earned_credits - _cost WHERE id = auth.uid();
      INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
        VALUES (auth.uid(),'earned',-_cost,'publish_basic',NEW.id);
    ELSE
      UPDATE public.profiles
        SET earned_credits = 0,
            paid_credits = paid_credits - (_cost - _earned)
        WHERE id = auth.uid();
      IF _earned > 0 THEN
        INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
          VALUES (auth.uid(),'earned',-_earned,'publish_basic',NEW.id);
      END IF;
      INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
        VALUES (auth.uid(),'paid',-(_cost - _earned),'publish_basic',NEW.id);
    END IF;
    NEW.paid_cost := _cost;
    RETURN NEW;
  END IF;

  -- Paid tiers
  IF _paid < _cost THEN
    RAISE EXCEPTION 'This tier requires % paid credits — you have %', _cost, _paid;
  END IF;
  UPDATE public.profiles SET paid_credits = paid_credits - _cost WHERE id = auth.uid();
  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
    VALUES (auth.uid(),'paid',-_cost,'publish_'||_tier,NEW.id);
  NEW.paid_cost := _cost;
  RETURN NEW;
END;
$function$;

-- Block responses to expired or goal-reached surveys
DROP POLICY IF EXISTS "Responses: insert own to same-university survey" ON public.survey_responses;
CREATE POLICY "Responses: insert own to same-university survey"
ON public.survey_responses
FOR INSERT
TO authenticated
WITH CHECK (
  respondent_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_responses.survey_id
      AND s.university_domain = current_university_domain()
      AND s.is_active = true
      AND s.creator_id <> auth.uid()
      AND s.expires_at > now()
      AND s.response_count < s.response_goal
  )
);