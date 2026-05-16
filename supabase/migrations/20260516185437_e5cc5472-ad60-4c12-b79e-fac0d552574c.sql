
-- ===== Extensions =====
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ===== Roles =====
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles: self or admin can read" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles: admin can write" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== Profiles: dual wallet + fraud fields =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS earned_credits int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_credits int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS email_hash text;

-- Migrate legacy 'credits' into earned_credits
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='credits'
  ) THEN
    UPDATE public.profiles SET earned_credits = COALESCE(credits, 0) WHERE earned_credits = 0;
    ALTER TABLE public.profiles DROP COLUMN credits;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_hash_idx ON public.profiles(email_hash) WHERE email_hash IS NOT NULL;

-- ===== Credit ledger =====
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet text NOT NULL CHECK (wallet IN ('earned','paid')),
  delta int NOT NULL,
  reason text NOT NULL,
  survey_id uuid,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger: own read" ON public.credit_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS credit_ledger_user_idx ON public.credit_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS credit_ledger_expiry_idx ON public.credit_ledger(expires_at) WHERE expires_at IS NOT NULL;

-- ===== Earning caps =====
CREATE TABLE IF NOT EXISTS public.earning_caps (
  user_id uuid PRIMARY KEY,
  day_bucket date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  week_bucket date NOT NULL DEFAULT date_trunc('week', now() AT TIME ZONE 'UTC')::date,
  day_count int NOT NULL DEFAULT 0,
  week_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.earning_caps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "caps: own read" ON public.earning_caps
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ===== Review flags =====
CREATE TABLE IF NOT EXISTS public.review_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags: self or admin read" ON public.review_flags
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "flags: admin update" ON public.review_flags
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== Disposable email domains =====
CREATE TABLE IF NOT EXISTS public.disposable_domains (
  domain text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.disposable_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disposable: read all" ON public.disposable_domains
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "disposable: admin write" ON public.disposable_domains
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.disposable_domains(domain) VALUES
  ('mailinator.com'),('tempmail.com'),('temp-mail.org'),('10minutemail.com'),
  ('guerrillamail.com'),('throwawaymail.com'),('yopmail.com'),('trashmail.com'),
  ('getnada.com'),('sharklasers.com'),('maildrop.cc'),('dispostable.com'),
  ('fakeinbox.com'),('mintemail.com'),('spambox.us')
ON CONFLICT (domain) DO NOTHING;

-- ===== Surveys: tiers =====
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic','targeted','boosted','pro')),
  ADD COLUMN IF NOT EXISTS paid_cost int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boosted_until timestamptz,
  ADD COLUMN IF NOT EXISTS response_goal int NOT NULL DEFAULT 25;

-- ===== Responses: quality fields =====
ALTER TABLE public.survey_responses
  ADD COLUMN IF NOT EXISTS duration_ms int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score numeric NOT NULL DEFAULT 0;

-- ===== Charge on publish (rewrite) =====
CREATE OR REPLACE FUNCTION public.charge_survey_publish_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _earned int; _paid int; _cost int; _tier text; _flagged boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'You must be signed in'; END IF;
  IF NEW.creator_id <> auth.uid() THEN RAISE EXCEPTION 'You can only publish as yourself'; END IF;

  SELECT earned_credits, paid_credits, is_flagged
    INTO _earned, _paid, _flagged
    FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing — refresh and retry'; END IF;
  IF _flagged THEN RAISE EXCEPTION 'Your account is under review. Contact support.'; END IF;

  _tier := COALESCE(NEW.tier, 'basic');

  -- Define cost & paid requirement by tier
  IF _tier = 'basic' THEN
    _cost := 2;
    NEW.response_goal := LEAST(COALESCE(NEW.response_goal,25), 25);
    -- Strip targeting from basic surveys
    NEW.target_department := NULL;
    NEW.target_year := NULL;
    -- Allow earned or paid
    IF _earned + _paid < _cost THEN
      RAISE EXCEPTION 'You need % credits to publish a basic survey', _cost;
    END IF;
    -- Prefer earned first
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
  IF _tier = 'targeted' THEN _cost := 5; NEW.response_goal := 100;
  ELSIF _tier = 'boosted' THEN _cost := 10; NEW.response_goal := 250; NEW.boosted_until := now() + interval '48 hours';
  ELSIF _tier = 'pro' THEN _cost := 20; NEW.response_goal := 1000; NEW.boosted_until := now() + interval '7 days';
  ELSE RAISE EXCEPTION 'Unknown tier %', _tier; END IF;

  IF _paid < _cost THEN
    RAISE EXCEPTION 'This tier requires % paid credits — you have %', _cost, _paid;
  END IF;
  UPDATE public.profiles SET paid_credits = paid_credits - _cost WHERE id = auth.uid();
  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
    VALUES (auth.uid(),'paid',-_cost,'publish_'||_tier,NEW.id);
  NEW.paid_cost := _cost;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS surveys_charge_credit ON public.surveys;
CREATE TRIGGER surveys_charge_credit BEFORE INSERT ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.charge_survey_publish_credit();

-- ===== Earn on response (rewrite) =====
CREATE OR REPLACE FUNCTION public.handle_new_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _q jsonb; _total int := 0; _answered int := 0;
  _quality numeric; _flagged boolean;
  _day date := (now() AT TIME ZONE 'UTC')::date;
  _week date := date_trunc('week', now() AT TIME ZONE 'UTC')::date;
  _day_count int := 0; _week_count int := 0;
  _recent_count int;
BEGIN
  -- Always count the response
  UPDATE public.surveys SET response_count = response_count + 1 WHERE id = NEW.survey_id;

  -- Quality score: fraction of questions answered
  SELECT questions INTO _q FROM public.surveys WHERE id = NEW.survey_id;
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

  -- Suspicious: more than 5 responses in last 10 min
  SELECT COUNT(*) INTO _recent_count FROM public.survey_responses
    WHERE respondent_id = NEW.respondent_id AND created_at > now() - interval '10 minutes';
  IF _recent_count > 5 THEN
    INSERT INTO public.review_flags(user_id, type, details)
      VALUES (NEW.respondent_id, 'rapid_fire', jsonb_build_object('count',_recent_count));
  END IF;

  -- Quality + speed gate (skip earning if low quality, too fast, or flagged)
  IF _flagged OR _quality < 0.8 OR COALESCE(NEW.duration_ms,0) < 15000 THEN
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
      VALUES (NEW.respondent_id,'earned',0,'response_no_credit_low_quality',NEW.survey_id);
    RETURN NEW;
  END IF;

  -- Caps
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

  UPDATE public.profiles SET earned_credits = earned_credits + 1 WHERE id = NEW.respondent_id;
  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id, expires_at)
    VALUES (NEW.respondent_id,'earned',1,'response',NEW.survey_id, now() + interval '30 days');
  UPDATE public.earning_caps
    SET day_bucket=_day, week_bucket=_week,
        day_count=_day_count+1, week_count=_week_count+1, updated_at=now()
    WHERE user_id = NEW.respondent_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS responses_handle_new ON public.survey_responses;
CREATE TRIGGER responses_handle_new AFTER INSERT ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_response();

-- Prevent duplicate response from same user
CREATE UNIQUE INDEX IF NOT EXISTS survey_responses_unique_respondent
  ON public.survey_responses(survey_id, respondent_id);

-- ===== Signup: validate email, store hash =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  domain text; uni text; _hash text; _disposable boolean;
BEGIN
  domain := lower(split_part(NEW.email, '@', 2));
  SELECT EXISTS(SELECT 1 FROM public.disposable_domains WHERE disposable_domains.domain = handle_new_user.domain) INTO _disposable;
  IF _disposable THEN RAISE EXCEPTION 'Disposable email addresses are not allowed'; END IF;

  _hash := encode(digest(lower(trim(NEW.email)), 'sha256'), 'hex');
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email_hash = _hash) THEN
    RAISE EXCEPTION 'An account already exists for this email';
  END IF;

  uni := COALESCE(NEW.raw_user_meta_data->>'university_name',
                  initcap(split_part(domain, '.', 1)) || ' University');

  INSERT INTO public.profiles (id, full_name, university_name, university_domain, department, year, earned_credits, paid_credits, email_hash)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    uni, domain,
    COALESCE(NEW.raw_user_meta_data->>'department',''),
    COALESCE(NEW.raw_user_meta_data->>'year',''),
    3, -- starter earned
    0,
    _hash
  );
  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, expires_at)
    VALUES (NEW.id,'earned',3,'signup_bonus', now() + interval '30 days');
  RETURN NEW;
END;
$$;

-- ===== Expire stale earned credits =====
CREATE OR REPLACE FUNCTION public.expire_earned_credits()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; _expired int;
BEGIN
  FOR r IN
    SELECT user_id, SUM(delta)::int AS owed
    FROM public.credit_ledger
    WHERE wallet='earned' AND delta>0
      AND expires_at IS NOT NULL AND expires_at < now()
      AND NOT EXISTS (
        SELECT 1 FROM public.credit_ledger c2
        WHERE c2.user_id = credit_ledger.user_id
          AND c2.reason = 'expiry'
          AND c2.created_at > credit_ledger.expires_at
      )
    GROUP BY user_id
  LOOP
    _expired := LEAST(r.owed, (SELECT earned_credits FROM public.profiles WHERE id = r.user_id));
    IF _expired > 0 THEN
      UPDATE public.profiles SET earned_credits = earned_credits - _expired WHERE id = r.user_id;
      INSERT INTO public.credit_ledger(user_id, wallet, delta, reason)
        VALUES (r.user_id,'earned',-_expired,'expiry');
    END IF;
  END LOOP;
END;
$$;
