
CREATE OR REPLACE FUNCTION public.protect_survey_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.response_count IS DISTINCT FROM OLD.response_count
       OR NEW.paid_cost IS DISTINCT FROM OLD.paid_cost
       OR NEW.boosted_until IS DISTINCT FROM OLD.boosted_until
    THEN
      RAISE EXCEPTION 'You cannot modify protected survey fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_columns();

CREATE OR REPLACE FUNCTION public.protect_survey_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF has_role(auth.uid(), 'admin'::app_role) THEN
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
  THEN
    RAISE EXCEPTION 'You cannot modify protected survey fields after publish';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_survey_sensitive_columns ON public.surveys;
CREATE TRIGGER protect_survey_sensitive_columns
BEFORE UPDATE ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.protect_survey_sensitive_columns();

DROP POLICY IF EXISTS "tx: deny client insert" ON public.payment_transactions;
CREATE POLICY "tx: deny client insert"
ON public.payment_transactions
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

REVOKE ALL ON FUNCTION public.charge_survey_publish_credit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_response() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_earned_credits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_sensitive_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_survey_sensitive_columns() FROM PUBLIC, anon, authenticated;
