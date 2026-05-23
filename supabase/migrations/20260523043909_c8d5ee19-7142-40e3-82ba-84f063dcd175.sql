
-- 1. Profile audience attributes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS age_range text,
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests_raw text[] NOT NULL DEFAULT '{}';

-- 2. Survey structured targeting
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS target_country text,
  ADD COLUMN IF NOT EXISTS target_age_range text,
  ADD COLUMN IF NOT EXISTS target_interests text[] NOT NULL DEFAULT '{}';

-- 3. Canonical interest tags (seed)
CREATE TABLE IF NOT EXISTS public.interest_tags (
  id text PRIMARY KEY,
  label text NOT NULL
);
ALTER TABLE public.interest_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "interest_tags: read all" ON public.interest_tags;
CREATE POLICY "interest_tags: read all" ON public.interest_tags FOR SELECT TO authenticated USING (true);

INSERT INTO public.interest_tags(id, label) VALUES
  ('tech','Tech'),('ai','AI'),('gaming','Gaming'),('science','Science'),
  ('health','Health'),('fitness','Fitness'),('mental_health','Mental health'),
  ('food','Food'),('travel','Travel'),('fashion','Fashion'),('beauty','Beauty'),
  ('music','Music'),('film','Film & TV'),('books','Books'),('sports','Sports'),
  ('finance','Finance'),('business','Business'),('politics','Politics'),
  ('education','Education'),('environment','Environment'),('parenting','Parenting'),
  ('relationships','Relationships'),('art','Art'),('other','Other')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

-- 4. Stable helpers mirroring current_university_domain()
CREATE OR REPLACE FUNCTION public.current_department() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT department FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.current_year() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT year FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.current_country() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT country FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.current_age_range() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT age_range FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.current_interests() RETURNS text[]
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT COALESCE(interests, '{}') FROM public.profiles WHERE id = auth.uid() $$;

-- 5. Replace surveys SELECT policy with audience-aware version
DROP POLICY IF EXISTS "Surveys: read visible" ON public.surveys;
CREATE POLICY "Surveys: read visible" ON public.surveys FOR SELECT TO authenticated
USING (
  creator_id = auth.uid()
  OR (
    (university_domain = current_university_domain() OR allow_general_respondents = true)
    AND (target_department IS NULL OR target_department = '' OR target_department = current_department())
    AND (target_year       IS NULL OR target_year       = '' OR target_year       = current_year())
    AND (target_country    IS NULL OR target_country    = '' OR target_country    = current_country())
    AND (target_age_range  IS NULL OR target_age_range  = '' OR target_age_range  = current_age_range())
    AND (
      target_interests IS NULL
      OR cardinality(target_interests) = 0
      OR target_interests && current_interests()
    )
  )
);

-- 6. Strip structured targeting on basic-tier in publish trigger
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

  IF _tier = 'basic' THEN _cost := 2; _max_goal := 25;
  ELSIF _tier = 'targeted' THEN _cost := 5; _max_goal := 100;
  ELSIF _tier = 'boosted' THEN _cost := 20; _max_goal := 250; NEW.boosted_until := now() + interval '48 hours';
  ELSIF _tier = 'pro' THEN _cost := 40; _max_goal := 1000; NEW.boosted_until := now() + interval '7 days';
  ELSE RAISE EXCEPTION 'Unknown tier %', _tier; END IF;

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

-- 7. handle_new_user: persist country/age_range/interests from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _domain text;
  uni text;
  _hash text;
  _disposable boolean;
  _user_type text;
  _interests text[];
  _interests_raw text[];
BEGIN
  _domain := lower(split_part(NEW.email, '@', 2));

  SELECT EXISTS(SELECT 1 FROM public.disposable_domains d WHERE d.domain = _domain) INTO _disposable;
  IF _disposable THEN RAISE EXCEPTION 'Disposable email addresses are not allowed'; END IF;

  _hash := encode(extensions.digest(lower(trim(NEW.email)), 'sha256'), 'hex');
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email_hash = _hash) THEN
    RAISE EXCEPTION 'An account already exists for this email';
  END IF;

  _user_type := lower(COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'));
  IF _user_type NOT IN ('student','general') THEN _user_type := 'student'; END IF;

  IF _user_type = 'student' AND NOT public.is_academic_domain(_domain) THEN
    RAISE EXCEPTION 'Student accounts require an academic email (.edu, .edu.xx, or .ac.xx)';
  END IF;

  uni := COALESCE(
    NEW.raw_user_meta_data->>'university_name',
    CASE WHEN _user_type = 'student' THEN initcap(split_part(_domain,'.',1)) || ' University' ELSE 'General' END
  );

  -- Interests arrive as JSON arrays of strings
  BEGIN
    SELECT COALESCE(array_agg(value::text), '{}')
      INTO _interests
      FROM jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'interests','[]'::jsonb)) AS value;
  EXCEPTION WHEN others THEN _interests := '{}'; END;
  BEGIN
    SELECT COALESCE(array_agg(value::text), '{}')
      INTO _interests_raw
      FROM jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'interests_raw','[]'::jsonb)) AS value;
  EXCEPTION WHEN others THEN _interests_raw := '{}'; END;

  INSERT INTO public.profiles (
    id, full_name, university_name, university_domain,
    department, year, earned_credits, paid_credits, email_hash, user_type,
    country, age_range, interests, interests_raw
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    uni,
    _domain,
    COALESCE(NEW.raw_user_meta_data->>'department',''),
    COALESCE(NEW.raw_user_meta_data->>'year',''),
    3,
    0,
    _hash,
    _user_type,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'country',''),''),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'age_range',''),''),
    _interests,
    _interests_raw
  );

  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, expires_at)
  VALUES (NEW.id,'earned',3,'signup_bonus', now() + interval '30 days');

  RETURN NEW;
END;
$function$;
