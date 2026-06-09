
-- 1. Block credit changes on profile updates and add user_type protection on insert
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

-- 2. Sanitize protected columns on INSERT so users cannot self-grant credits
CREATE OR REPLACE FUNCTION public.sanitize_profile_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sanitize_profile_on_insert_trg ON public.profiles;
CREATE TRIGGER sanitize_profile_on_insert_trg
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_profile_on_insert();

-- 3. Prevent removing the last admin via direct table writes
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _remaining int;
BEGIN
  IF TG_OP = 'DELETE' AND OLD.role = 'admin'::public.app_role THEN
    SELECT COUNT(*) INTO _remaining FROM public.user_roles
      WHERE role = 'admin'::public.app_role AND user_id <> OLD.user_id;
    IF _remaining = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last admin';
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.role = 'admin'::public.app_role
        AND NEW.role IS DISTINCT FROM OLD.role THEN
    SELECT COUNT(*) INTO _remaining FROM public.user_roles
      WHERE role = 'admin'::public.app_role AND user_id <> OLD.user_id;
    IF _remaining = 0 THEN
      RAISE EXCEPTION 'Cannot demote the last admin';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS prevent_last_admin_removal_trg ON public.user_roles;
CREATE TRIGGER prevent_last_admin_removal_trg
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();
