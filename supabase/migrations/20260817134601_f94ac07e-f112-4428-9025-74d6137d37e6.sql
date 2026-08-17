-- 1. Visibility column -------------------------------------------------
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'everyone';

UPDATE public.surveys
   SET visibility = CASE WHEN allow_general_respondents THEN 'everyone' ELSE 'campus' END;

ALTER TABLE public.surveys
  DROP CONSTRAINT IF EXISTS surveys_visibility_check;
ALTER TABLE public.surveys
  ADD CONSTRAINT surveys_visibility_check
  CHECK (visibility IN ('campus', 'students', 'everyone', 'private'));

-- 2. Invite list for private surveys ------------------------------------
CREATE TABLE IF NOT EXISTS public.survey_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, email)
);

GRANT SELECT, INSERT, DELETE ON public.survey_invites TO authenticated;
GRANT ALL ON public.survey_invites TO service_role;

ALTER TABLE public.survey_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invites: creator manage" ON public.survey_invites;
CREATE POLICY "invites: creator manage" ON public.survey_invites
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.creator_id = auth.uid()))
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.creator_id = auth.uid())
  );

DROP POLICY IF EXISTS "invites: invitee reads own" ON public.survey_invites;
CREATE POLICY "invites: invitee reads own" ON public.survey_invites
  FOR SELECT TO authenticated
  USING (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), '')));

CREATE OR REPLACE FUNCTION public.is_survey_invited(_survey_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.survey_invites i
    WHERE i.survey_id = _survey_id
      AND lower(i.email) = lower(COALESCE((auth.jwt() ->> 'email'), '~none~'))
  );
$$;

REVOKE ALL ON FUNCTION public.is_survey_invited(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_survey_invited(uuid) TO authenticated, service_role;

-- 3. Keep the legacy allow_general_respondents flag in sync -------------
CREATE OR REPLACE FUNCTION public.a_sync_survey_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.visibility IS NULL THEN
    NEW.visibility := CASE WHEN NEW.allow_general_respondents THEN 'everyone' ELSE 'campus' END;
  END IF;
  NEW.allow_general_respondents := (NEW.visibility = 'everyone');
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.a_sync_survey_visibility() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS a_sync_survey_visibility ON public.surveys;
CREATE TRIGGER a_sync_survey_visibility
  BEFORE INSERT OR UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.a_sync_survey_visibility();

-- 4. Allow the creator to change visibility after publish ---------------
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

  -- The survey owner may re-target who can participate at any time. Only the
  -- visibility setting (and its derived open flag) may change here.
  IF auth.uid() = OLD.creator_id
     AND NEW.visibility IS DISTINCT FROM OLD.visibility
     AND NEW.tier IS NOT DISTINCT FROM OLD.tier
     AND NEW.boosted_until IS NOT DISTINCT FROM OLD.boosted_until
     AND NEW.paid_cost IS NOT DISTINCT FROM OLD.paid_cost
     AND NEW.response_count IS NOT DISTINCT FROM OLD.response_count
     AND NEW.response_goal IS NOT DISTINCT FROM OLD.response_goal
     AND NEW.target_department IS NOT DISTINCT FROM OLD.target_department
     AND NEW.target_year IS NOT DISTINCT FROM OLD.target_year
     AND NEW.target_country IS NOT DISTINCT FROM OLD.target_country
     AND NEW.target_age_range IS NOT DISTINCT FROM OLD.target_age_range
     AND NEW.target_interests IS NOT DISTINCT FROM OLD.target_interests
     AND NEW.university_domain IS NOT DISTINCT FROM OLD.university_domain
     AND NEW.creator_id IS NOT DISTINCT FROM OLD.creator_id
     AND NEW.expires_at IS NOT DISTINCT FROM OLD.expires_at
     AND NEW.respondent_bonus IS NOT DISTINCT FROM OLD.respondent_bonus
     AND NEW.min_response_seconds IS NOT DISTINCT FROM OLD.min_response_seconds
     AND NEW.lecturer_id IS NOT DISTINCT FROM OLD.lecturer_id
     AND NEW.course_code IS NOT DISTINCT FROM OLD.course_code
     AND NEW.is_evaluation IS NOT DISTINCT FROM OLD.is_evaluation
  THEN
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

-- 5. Visibility-aware access policies -----------------------------------
DROP POLICY IF EXISTS "Surveys: read visible" ON public.surveys;
CREATE POLICY "Surveys: read visible" ON public.surveys
  FOR SELECT
  USING (
    creator_id = auth.uid()
    OR (
      CASE visibility
        WHEN 'everyone' THEN true
        WHEN 'students' THEN public.is_student_eligible(auth.uid())
        WHEN 'private' THEN public.is_survey_invited(id)
        ELSE (
          CASE
            WHEN target_universities IS NOT NULL AND cardinality(target_universities) > 0
              THEN lower(COALESCE(public.current_university_domain(), '')) = ANY (target_universities)
            ELSE university_domain = public.current_university_domain()
          END
        )
      END
      AND ((NOT ('department' = ANY (required_criteria))) OR public.target_text_matches(target_department, public.current_department()))
      AND ((NOT ('year' = ANY (required_criteria))) OR public.target_text_matches(target_year, public.current_year()))
      AND ((NOT ('country' = ANY (required_criteria))) OR public.target_text_matches(target_country, public.current_country()))
      AND ((NOT ('age_range' = ANY (required_criteria))) OR public.target_text_matches(target_age_range, public.current_age_range()))
      AND ((NOT ('interests' = ANY (required_criteria))) OR target_interests IS NULL OR cardinality(target_interests) = 0 OR (target_interests && public.current_interests()))
    )
  );

DROP POLICY IF EXISTS "Surveys: insert own" ON public.surveys;
CREATE POLICY "Surveys: insert own" ON public.surveys
  FOR INSERT
  WITH CHECK (
    creator_id = auth.uid()
    AND university_domain = public.current_university_domain()
    AND (
      public.is_student_eligible(auth.uid())
      OR (
        visibility <> 'campus'
        AND COALESCE(target_department, '') = ''
        AND COALESCE(target_year, '') = ''
      )
    )
  );

DROP POLICY IF EXISTS "Responses: insert allowed" ON public.survey_responses;
CREATE POLICY "Responses: insert allowed" ON public.survey_responses
  FOR INSERT
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
          CASE s.visibility
            WHEN 'everyone' THEN true
            WHEN 'students' THEN public.is_student_eligible(auth.uid())
            WHEN 'private' THEN public.is_survey_invited(s.id)
            ELSE (
              CASE
                WHEN s.target_universities IS NOT NULL AND cardinality(s.target_universities) > 0
                  THEN lower(COALESCE(public.current_university_domain(), '')) = ANY (s.target_universities)
                ELSE s.university_domain = public.current_university_domain()
              END
              AND public.is_student_eligible(auth.uid())
            )
          END
        )
        AND ((NOT ('department' = ANY (s.required_criteria))) OR public.target_text_matches(s.target_department, public.current_department()))
        AND ((NOT ('year' = ANY (s.required_criteria))) OR public.target_text_matches(s.target_year, public.current_year()))
        AND ((NOT ('country' = ANY (s.required_criteria))) OR public.target_text_matches(s.target_country, public.current_country()))
        AND ((NOT ('age_range' = ANY (s.required_criteria))) OR public.target_text_matches(s.target_age_range, public.current_age_range()))
        AND ((NOT ('interests' = ANY (s.required_criteria))) OR s.target_interests IS NULL OR cardinality(s.target_interests) = 0 OR (s.target_interests && public.current_interests()))
    )
  );