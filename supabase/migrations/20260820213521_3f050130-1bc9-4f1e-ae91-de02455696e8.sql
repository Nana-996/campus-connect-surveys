ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS demographics_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _demog_changed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Credit balances are never client-writable.
  IF NEW.earned_credits IS DISTINCT FROM OLD.earned_credits
     OR NEW.paid_credits IS DISTINCT FROM OLD.paid_credits
  THEN
    RAISE EXCEPTION 'You cannot modify your credit balance';
  END IF;

  IF NEW.university_pick_limit IS DISTINCT FROM OLD.university_pick_limit THEN
    RAISE EXCEPTION 'You cannot modify protected profile fields';
  END IF;

  -- Targeting / identity fields: free to set the first time, then rate-limited.
  _demog_changed :=
      (NEW.department IS DISTINCT FROM OLD.department
        AND NULLIF(TRIM(COALESCE(OLD.department, '')), '') IS NOT NULL)
   OR (NEW.year IS DISTINCT FROM OLD.year
        AND NULLIF(TRIM(COALESCE(OLD.year, '')), '') IS NOT NULL)
   OR (NEW.index_number IS DISTINCT FROM OLD.index_number
        AND NULLIF(TRIM(COALESCE(OLD.index_number, '')), '') IS NOT NULL)
   OR (NEW.country IS DISTINCT FROM OLD.country
        AND NULLIF(TRIM(COALESCE(OLD.country, '')), '') IS NOT NULL)
   OR (NEW.age_range IS DISTINCT FROM OLD.age_range
        AND NULLIF(TRIM(COALESCE(OLD.age_range, '')), '') IS NOT NULL);

  IF _demog_changed THEN
    IF OLD.demographics_updated_at IS NOT NULL
       AND OLD.demographics_updated_at > now() - interval '30 days'
    THEN
      RAISE EXCEPTION 'Your study details were changed recently. They can only be changed once every 30 days — contact support if this is wrong.';
    END IF;
    NEW.demographics_updated_at := now();
  ELSE
    NEW.demographics_updated_at := OLD.demographics_updated_at;
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