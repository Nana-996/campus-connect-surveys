
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'student'
  CHECK (user_type IN ('student','general'));

ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS allow_general_respondents boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_academic_domain(_domain text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _domain ~* '(^|\.)edu$'
      OR _domain ~* '\.edu\.[a-z]{2,3}$'
      OR _domain ~* '\.ac\.[a-z]{2,3}$';
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  domain text; uni text; _hash text; _disposable boolean; _user_type text;
BEGIN
  domain := lower(split_part(NEW.email, '@', 2));
  SELECT EXISTS(SELECT 1 FROM public.disposable_domains WHERE disposable_domains.domain = handle_new_user.domain) INTO _disposable;
  IF _disposable THEN RAISE EXCEPTION 'Disposable email addresses are not allowed'; END IF;

  _hash := encode(digest(lower(trim(NEW.email)), 'sha256'), 'hex');
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email_hash = _hash) THEN
    RAISE EXCEPTION 'An account already exists for this email';
  END IF;

  _user_type := lower(COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'));
  IF _user_type NOT IN ('student','general') THEN _user_type := 'student'; END IF;

  IF _user_type = 'student' AND NOT public.is_academic_domain(domain) THEN
    RAISE EXCEPTION 'Student accounts require an academic email (.edu, .edu.xx, or .ac.xx)';
  END IF;

  uni := COALESCE(NEW.raw_user_meta_data->>'university_name',
                  CASE WHEN _user_type='student'
                    THEN initcap(split_part(domain,'.',1)) || ' University'
                    ELSE 'General'
                  END);

  INSERT INTO public.profiles (id, full_name, university_name, university_domain, department, year, earned_credits, paid_credits, email_hash, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    uni, domain,
    COALESCE(NEW.raw_user_meta_data->>'department',''),
    COALESCE(NEW.raw_user_meta_data->>'year',''),
    3, 0, _hash, _user_type
  );
  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, expires_at)
    VALUES (NEW.id,'earned',3,'signup_bonus', now() + interval '30 days');
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Surveys: read same university" ON public.surveys;
CREATE POLICY "Surveys: read visible"
ON public.surveys FOR SELECT
TO authenticated
USING (
  university_domain = current_university_domain()
  OR allow_general_respondents = true
  OR creator_id = auth.uid()
);

DROP POLICY IF EXISTS "Responses: insert own to same-university survey" ON public.survey_responses;
CREATE POLICY "Responses: insert allowed"
ON public.survey_responses FOR INSERT
TO authenticated
WITH CHECK (
  respondent_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_responses.survey_id
      AND s.is_active = true
      AND s.creator_id <> auth.uid()
      AND s.expires_at > now()
      AND s.response_count < s.response_goal
      AND (
        s.university_domain = current_university_domain()
        OR s.allow_general_respondents = true
      )
  )
);
