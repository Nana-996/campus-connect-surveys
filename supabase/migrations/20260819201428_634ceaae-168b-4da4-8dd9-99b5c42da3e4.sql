CREATE OR REPLACE FUNCTION public.sanitize_profile_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
  _domain text;
BEGIN
  -- Internal triggers (e.g. handle_new_user) may seed initial credits.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  -- Admins may insert with arbitrary values.
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  NEW.earned_credits := 0;
  NEW.paid_credits := 0;
  NEW.is_flagged := false;
  NEW.flag_reason := NULL;

  -- Campus identity must come from the verified account email, never from client input.
  IF auth.uid() IS NOT NULL THEN
    NEW.id := auth.uid();
    SELECT lower(trim(u.email)) INTO _email FROM auth.users u WHERE u.id = auth.uid();
    IF _email IS NULL OR _email = '' THEN
      RAISE EXCEPTION 'Cannot create a profile without a verified email address';
    END IF;
    _domain := split_part(_email, '@', 2);
    NEW.university_domain := _domain;
    NEW.email_hash := encode(extensions.digest(_email, 'sha256'), 'hex');
    IF NEW.user_type = 'student' AND NOT public.is_academic_domain(_domain) THEN
      RAISE EXCEPTION 'Student accounts require an academic email';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;