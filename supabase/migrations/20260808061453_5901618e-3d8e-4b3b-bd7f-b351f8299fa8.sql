-- 1. Columns
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS target_universities text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS university_pick_limit integer NOT NULL DEFAULT 5;

-- 2. Protect the allowance from client-side edits
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.university_pick_limit IS DISTINCT FROM OLD.university_pick_limit THEN
    RAISE EXCEPTION 'You cannot modify protected profile fields';
  END IF;

  -- Allow the owner to set their university_name ONCE if it was previously empty.
  IF NEW.university_name IS DISTINCT FROM OLD.university_name
     AND auth.uid() = NEW.id
     AND COALESCE(NULLIF(TRIM(OLD.university_name), ''), NULL) IS NULL
     AND COALESCE(NULLIF(TRIM(NEW.university_name), ''), NULL) IS NOT NULL
  THEN
    IF NEW.is_flagged IS DISTINCT FROM OLD.is_flagged
       OR NEW.flag_reason IS DISTINCT FROM OLD.flag_reason
       OR NEW.email_hash IS DISTINCT FROM OLD.email_hash
       OR NEW.user_type IS DISTINCT FROM OLD.user_type
       OR NEW.university_domain IS DISTINCT FROM OLD.university_domain
       OR NEW.graduation_date IS DISTINCT FROM OLD.graduation_date
       OR NEW.id IS DISTINCT FROM OLD.id
    THEN
      RAISE EXCEPTION 'You cannot modify protected profile fields';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_flagged IS DISTINCT FROM OLD.is_flagged
     OR NEW.flag_reason IS DISTINCT FROM OLD.flag_reason
     OR NEW.email_hash IS DISTINCT FROM OLD.email_hash
     OR NEW.user_type IS DISTINCT FROM OLD.user_type
     OR NEW.university_domain IS DISTINCT FROM OLD.university_domain
     OR NEW.university_name IS DISTINCT FROM OLD.university_name
     OR NEW.graduation_date IS DISTINCT FROM OLD.graduation_date
     OR NEW.id IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'You cannot modify protected profile fields';
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Enforce the pick cap at publish time
CREATE OR REPLACE FUNCTION public.enforce_university_targeting()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _limit int; _picks text[];
BEGIN
  _picks := ARRAY(
    SELECT DISTINCT lower(btrim(u))
    FROM unnest(COALESCE(NEW.target_universities, '{}'::text[])) AS u
    WHERE btrim(COALESCE(u, '')) <> ''
  );

  IF COALESCE(NEW.tier, 'basic') = 'basic' THEN
    NEW.target_universities := '{}'::text[];
    NEW.required_criteria := array_remove(COALESCE(NEW.required_criteria, '{}'::text[]), 'universities');
    RETURN NEW;
  END IF;

  NEW.target_universities := _picks;

  IF cardinality(_picks) = 0 THEN
    NEW.required_criteria := array_remove(COALESCE(NEW.required_criteria, '{}'::text[]), 'universities');
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT university_pick_limit INTO _limit FROM public.profiles WHERE id = auth.uid();
    _limit := COALESCE(_limit, 5);
    IF cardinality(_picks) > _limit THEN
      RAISE EXCEPTION 'You can target up to % universities. Buy an expansion to pick more.', _limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS surveys_enforce_university_targeting ON public.surveys;
CREATE TRIGGER surveys_enforce_university_targeting
  BEFORE INSERT ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.enforce_university_targeting();

-- 4. Visibility: required university list hides the survey from other campuses
DROP POLICY IF EXISTS "Surveys: read visible" ON public.surveys;
CREATE POLICY "Surveys: read visible" ON public.surveys
  FOR SELECT
  USING (
    (creator_id = auth.uid())
    OR (
      ((university_domain = current_university_domain()) OR (allow_general_respondents = true))
      AND ((NOT ('department' = ANY (required_criteria))) OR target_text_matches(target_department, current_department()))
      AND ((NOT ('year' = ANY (required_criteria))) OR target_text_matches(target_year, current_year()))
      AND ((NOT ('country' = ANY (required_criteria))) OR target_text_matches(target_country, current_country()))
      AND ((NOT ('age_range' = ANY (required_criteria))) OR target_text_matches(target_age_range, current_age_range()))
      AND ((NOT ('interests' = ANY (required_criteria)))
           OR (target_interests IS NULL) OR (cardinality(target_interests) = 0)
           OR (target_interests && current_interests()))
      AND ((NOT ('universities' = ANY (required_criteria)))
           OR (target_universities IS NULL) OR (cardinality(target_universities) = 0)
           OR (lower(COALESCE(current_university_domain(), '')) = ANY (target_universities)))
    )
  );

-- 5. Universities directory
CREATE OR REPLACE FUNCTION public.list_universities()
 RETURNS TABLE(domain text, name text, members bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT lower(p.university_domain) AS domain,
         COALESCE(max(p.university_name), lower(p.university_domain)) AS name,
         count(*)::bigint AS members
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND COALESCE(p.university_domain, '') <> ''
    AND p.user_type = 'student'
  GROUP BY lower(p.university_domain)
  ORDER BY members DESC, name
  LIMIT 500;
$function$;

REVOKE ALL ON FUNCTION public.list_universities() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_universities() TO authenticated, service_role;

-- 6. Reach estimate now accounts for university targeting
DROP FUNCTION IF EXISTS public.estimate_survey_reach(boolean, text, text, text, text, text[], text[]);
CREATE OR REPLACE FUNCTION public.estimate_survey_reach(
  _allow_general boolean,
  _department text DEFAULT NULL,
  _year text DEFAULT NULL,
  _country text DEFAULT NULL,
  _age_range text DEFAULT NULL,
  _interests text[] DEFAULT '{}'::text[],
  _required text[] DEFAULT '{}'::text[],
  _universities text[] DEFAULT '{}'::text[]
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _domain text := public.current_university_domain();
  _unis text[] := ARRAY(SELECT DISTINCT lower(btrim(u)) FROM unnest(COALESCE(_universities, '{}'::text[])) u WHERE btrim(COALESCE(u,'')) <> '');
  _pool int;
  _eligible int;
  _perfect int;
BEGIN
  IF _me IS NULL THEN
    RETURN jsonb_build_object('pool', 0, 'eligible', 0, 'perfect', 0);
  END IF;

  WITH base AS (
    SELECT p.*
    FROM public.profiles p
    WHERE p.id <> _me
      AND (_allow_general OR p.university_domain = _domain)
      AND (_allow_general OR public.is_student_eligible(p.id))
  ), scored AS (
    SELECT
      (NOT ('department' = ANY (_required)) OR public.target_text_matches(_department, b.department)) AS r_dept,
      (NOT ('year'       = ANY (_required)) OR public.target_text_matches(_year, b.year))             AS r_year,
      (NOT ('country'    = ANY (_required)) OR public.target_text_matches(_country, b.country))       AS r_country,
      (NOT ('age_range'  = ANY (_required)) OR public.target_text_matches(_age_range, b.age_range))   AS r_age,
      (NOT ('interests'  = ANY (_required)) OR coalesce(cardinality(_interests), 0) = 0
        OR _interests && coalesce(b.interests, '{}'::text[]))                                          AS r_int,
      (NOT ('universities' = ANY (_required)) OR coalesce(cardinality(_unis), 0) = 0
        OR lower(coalesce(b.university_domain, '')) = ANY (_unis))                                     AS r_uni,
      public.target_text_matches(_department, b.department) AS p_dept,
      public.target_text_matches(_year, b.year)             AS p_year,
      public.target_text_matches(_country, b.country)       AS p_country,
      public.target_text_matches(_age_range, b.age_range)   AS p_age,
      (coalesce(cardinality(_interests), 0) = 0 OR _interests && coalesce(b.interests, '{}'::text[])) AS p_int,
      (coalesce(cardinality(_unis), 0) = 0
        OR lower(coalesce(b.university_domain, '')) = ANY (_unis))                                     AS p_uni
    FROM base b
  )
  SELECT
    count(*),
    count(*) FILTER (WHERE r_dept AND r_year AND r_country AND r_age AND r_int AND r_uni),
    count(*) FILTER (WHERE p_dept AND p_year AND p_country AND p_age AND p_int AND p_uni)
  INTO _pool, _eligible, _perfect
  FROM scored;

  RETURN jsonb_build_object('pool', _pool, 'eligible', _eligible, 'perfect', _perfect);
END;
$function$;

REVOKE ALL ON FUNCTION public.estimate_survey_reach(boolean, text, text, text, text, text[], text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estimate_survey_reach(boolean, text, text, text, text, text[], text[], text[]) TO authenticated, service_role;

-- 7. Paid expansion: +10 university picks for GHS 10
CREATE TABLE public.university_slot_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slots integer NOT NULL DEFAULT 10 CHECK (slots > 0 AND slots <= 50),
  price_ghs_pesewas bigint NOT NULL CHECK (price_ghs_pesewas > 0),
  paystack_reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending','granted','failed'])),
  raw jsonb,
  granted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.university_slot_purchases TO authenticated;
GRANT ALL ON public.university_slot_purchases TO service_role;

ALTER TABLE public.university_slot_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Slot purchases: read own" ON public.university_slot_purchases
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER university_slot_purchases_updated_at
  BEFORE UPDATE ON public.university_slot_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.grant_university_slots(_reference text, _raw jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _p public.university_slot_purchases; _limit int;
BEGIN
  SELECT * INTO _p FROM public.university_slot_purchases
    WHERE paystack_reference = _reference FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown slot purchase reference: %', _reference;
  END IF;

  IF _p.status = 'granted' THEN
    SELECT university_pick_limit INTO _limit FROM public.profiles WHERE id = _p.user_id;
    RETURN jsonb_build_object('ok', true, 'already', true, 'limit', _limit);
  END IF;

  UPDATE public.university_slot_purchases
    SET status = 'granted', raw = _raw, granted_at = now()
    WHERE id = _p.id;

  UPDATE public.profiles
    SET university_pick_limit = LEAST(100, university_pick_limit + _p.slots)
    WHERE id = _p.user_id
    RETURNING university_pick_limit INTO _limit;

  RETURN jsonb_build_object('ok', true, 'already', false, 'limit', _limit);
END;
$function$;

REVOKE ALL ON FUNCTION public.grant_university_slots(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_university_slots(text, jsonb) TO service_role;