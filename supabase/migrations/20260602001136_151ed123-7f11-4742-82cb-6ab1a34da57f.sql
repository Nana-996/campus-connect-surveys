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

  -- Internal database triggers/functions manage system fields like earned credits.
  -- Direct user profile edits still pass through the protection below.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.earned_credits IS DISTINCT FROM OLD.earned_credits
     OR NEW.paid_credits IS DISTINCT FROM OLD.paid_credits
     OR NEW.is_flagged IS DISTINCT FROM OLD.is_flagged
     OR NEW.flag_reason IS DISTINCT FROM OLD.flag_reason
     OR NEW.email_hash IS DISTINCT FROM OLD.email_hash
     OR NEW.user_type IS DISTINCT FROM OLD.user_type
     OR NEW.university_domain IS DISTINCT FROM OLD.university_domain
     OR NEW.university_name IS DISTINCT FROM OLD.university_name
     OR NEW.id IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'You cannot modify protected profile fields';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS surveys_charge_credit ON public.surveys;
DROP TRIGGER IF EXISTS charge_survey_publish_credit_before_insert ON public.surveys;
CREATE TRIGGER charge_survey_publish_credit_before_insert
BEFORE INSERT ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.charge_survey_publish_credit();

DROP TRIGGER IF EXISTS on_response_created ON public.survey_responses;
DROP TRIGGER IF EXISTS responses_handle_new ON public.survey_responses;
DROP TRIGGER IF EXISTS on_survey_response_created ON public.survey_responses;
CREATE TRIGGER on_survey_response_created
AFTER INSERT ON public.survey_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_response();