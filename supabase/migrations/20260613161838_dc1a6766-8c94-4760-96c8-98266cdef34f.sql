
-- ============================================================
-- 1) Lecturers directory
-- ============================================================
CREATE TABLE public.lecturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_domain text NOT NULL,
  full_name text NOT NULL,
  department text,
  title text,
  email text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lecturers_full_name_len CHECK (char_length(trim(full_name)) BETWEEN 1 AND 200),
  CONSTRAINT lecturers_department_len CHECK (department IS NULL OR char_length(department) <= 120),
  CONSTRAINT lecturers_title_len CHECK (title IS NULL OR char_length(title) <= 60),
  CONSTRAINT lecturers_email_len CHECK (email IS NULL OR char_length(email) <= 254)
);
CREATE UNIQUE INDEX lecturers_domain_name_dept_unique
  ON public.lecturers (university_domain, lower(full_name), lower(coalesce(department,'')));
CREATE INDEX lecturers_domain_idx ON public.lecturers (university_domain);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecturers TO authenticated;
GRANT ALL ON public.lecturers TO service_role;

ALTER TABLE public.lecturers ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can view lecturers from their own university; admins see all.
CREATE POLICY "Lecturers: view own campus"
  ON public.lecturers FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR university_domain = public.current_university_domain()
  );

-- Only admins and managers may add lecturers, and only to their own campus (admins anywhere).
CREATE POLICY "Lecturers: managers insert own campus"
  ON public.lecturers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'manager'::public.app_role)
      AND university_domain = public.current_university_domain()
    )
  );

CREATE POLICY "Lecturers: managers update own campus"
  ON public.lecturers FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'manager'::public.app_role)
      AND university_domain = public.current_university_domain()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'manager'::public.app_role)
      AND university_domain = public.current_university_domain()
    )
  );

CREATE POLICY "Lecturers: managers delete own campus"
  ON public.lecturers FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'manager'::public.app_role)
      AND university_domain = public.current_university_domain()
    )
  );

CREATE TRIGGER update_lecturers_updated_at
  BEFORE UPDATE ON public.lecturers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) Link surveys to lecturers
-- ============================================================
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS lecturer_id uuid REFERENCES public.lecturers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS course_code text,
  ADD COLUMN IF NOT EXISTS is_evaluation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS surveys_lecturer_idx ON public.surveys (lecturer_id) WHERE lecturer_id IS NOT NULL;

-- Protect lecturer linkage and evaluation flag after publish (extend existing trigger fn).
CREATE OR REPLACE FUNCTION public.protect_survey_sensitive_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF pg_trigger_depth() > 1
     AND NEW.response_count IS DISTINCT FROM OLD.response_count
     AND NEW.tier IS NOT DISTINCT FROM OLD.tier
     AND NEW.boosted_until IS NOT DISTINCT FROM OLD.boosted_until
     AND NEW.paid_cost IS NOT DISTINCT FROM OLD.paid_cost
     AND NEW.response_goal IS NOT DISTINCT FROM OLD.response_goal
     AND NEW.target_department IS NOT DISTINCT FROM OLD.target_department
     AND NEW.target_year IS NOT DISTINCT FROM OLD.target_year
     AND NEW.target_country IS NOT DISTINCT FROM OLD.target_country
     AND NEW.target_age_range IS NOT DISTINCT FROM OLD.target_age_range
     AND NEW.target_interests IS NOT DISTINCT FROM OLD.target_interests
     AND NEW.university_domain IS NOT DISTINCT FROM OLD.university_domain
     AND NEW.creator_id IS NOT DISTINCT FROM OLD.creator_id
     AND NEW.expires_at IS NOT DISTINCT FROM OLD.expires_at
     AND NEW.allow_general_respondents IS NOT DISTINCT FROM OLD.allow_general_respondents
     AND NEW.respondent_bonus IS NOT DISTINCT FROM OLD.respondent_bonus
     AND NEW.min_response_seconds IS NOT DISTINCT FROM OLD.min_response_seconds
     AND NEW.lecturer_id IS NOT DISTINCT FROM OLD.lecturer_id
     AND NEW.course_code IS NOT DISTINCT FROM OLD.course_code
     AND NEW.is_evaluation IS NOT DISTINCT FROM OLD.is_evaluation
  THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.boosted_until IS DISTINCT FROM OLD.boosted_until
     OR NEW.paid_cost IS DISTINCT FROM OLD.paid_cost
     OR NEW.response_count IS DISTINCT FROM OLD.response_count
     OR NEW.response_goal IS DISTINCT FROM OLD.response_goal
     OR NEW.target_department IS DISTINCT FROM OLD.target_department
     OR NEW.target_year IS DISTINCT FROM OLD.target_year
     OR NEW.target_country IS DISTINCT FROM OLD.target_country
     OR NEW.target_age_range IS DISTINCT FROM OLD.target_age_range
     OR NEW.target_interests IS DISTINCT FROM OLD.target_interests
     OR NEW.university_domain IS DISTINCT FROM OLD.university_domain
     OR NEW.creator_id IS DISTINCT FROM OLD.creator_id
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.allow_general_respondents IS DISTINCT FROM OLD.allow_general_respondents
     OR NEW.respondent_bonus IS DISTINCT FROM OLD.respondent_bonus
     OR NEW.min_response_seconds IS DISTINCT FROM OLD.min_response_seconds
     OR NEW.lecturer_id IS DISTINCT FROM OLD.lecturer_id
     OR NEW.course_code IS DISTINCT FROM OLD.course_code
     OR NEW.is_evaluation IS DISTINCT FROM OLD.is_evaluation
  THEN
    RAISE EXCEPTION 'You cannot modify protected survey fields after publish';
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- 3) Allow school-run evaluations to skip credit charge
--    (service role only — calling server fn validates admin/manager + lecturer ownership)
-- ============================================================
CREATE OR REPLACE FUNCTION public.charge_survey_publish_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _earned int; _cost int; _bonus int; _bonus_total int;
  _tier text; _flagged boolean; _max_goal int;
  _max_expiry timestamptz := now() + interval '30 days';
  _user_goal int;
BEGIN
  -- Service-role (auth.uid() IS NULL) callers: skip credit charging entirely.
  -- This is used by admin/manager-run lecturer evaluations issued via supabaseAdmin
  -- after server-side role checks. Still apply sensible defaults.
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

  SELECT earned_credits, is_flagged
    INTO _earned, _flagged
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
  IF _earned < (_cost + _bonus_total) THEN
    RAISE EXCEPTION 'Need % more credits — answer surveys in your feed to earn them.',
      (_cost + _bonus_total) - _earned;
  END IF;

  UPDATE public.profiles
    SET earned_credits = earned_credits - (_cost + _bonus_total)
    WHERE id = auth.uid();

  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
    VALUES (auth.uid(), 'earned', -_cost, 'publish_' || _tier, NEW.id);

  IF _bonus_total > 0 THEN
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
      VALUES (auth.uid(), 'earned', -_bonus_total, 'responder_bonus_pool', NEW.id);
  END IF;

  NEW.paid_cost := 0;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 4) Helper: list evaluations for a lecturer
--    (admins always; managers of the lecturer's campus; the lecturer
--     themselves if their email matches a user account)
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_lecturer_evaluations(_lecturer_id uuid)
 RETURNS TABLE(
   survey_id uuid, title text, course_code text,
   response_count integer, response_goal integer,
   is_active boolean, created_at timestamptz, expires_at timestamptz
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _domain text; _lec_domain text; _lec_email text;
  _is_admin boolean; _is_manager boolean; _is_owner boolean := false;
  _my_email text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT university_domain, lower(coalesce(email,''))
    INTO _lec_domain, _lec_email
    FROM public.lecturers WHERE id = _lecturer_id;
  IF _lec_domain IS NULL THEN RAISE EXCEPTION 'Lecturer not found'; END IF;

  _is_admin := public.has_role(_uid, 'admin'::public.app_role);
  _is_manager := public.has_role(_uid, 'manager'::public.app_role);
  SELECT university_domain INTO _domain FROM public.profiles WHERE id = _uid;

  IF NOT _is_admin THEN
    SELECT lower(email) INTO _my_email FROM auth.users WHERE id = _uid;
    IF _lec_email <> '' AND _my_email IS NOT NULL AND _my_email = _lec_email THEN
      _is_owner := true;
    END IF;
    IF NOT (_is_owner OR (_is_manager AND _domain = _lec_domain)) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  RETURN QUERY
    SELECT s.id, s.title, s.course_code,
           s.response_count, s.response_goal, s.is_active,
           s.created_at, s.expires_at
    FROM public.surveys s
    WHERE s.lecturer_id = _lecturer_id
    ORDER BY s.created_at DESC
    LIMIT 500;
END;
$function$;
