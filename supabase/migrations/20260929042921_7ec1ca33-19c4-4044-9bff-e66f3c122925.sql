CREATE OR REPLACE FUNCTION public.school_admin_decide_topup(_id uuid, _approve boolean, _note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE r record;
BEGIN
  SELECT t.* INTO r FROM public.credit_topup_requests t
   JOIN public.schools sc ON sc.domain = t.school_domain AND sc.admin_user_id = auth.uid()
   WHERE t.id = _id FOR UPDATE OF t;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'Request already decided'; END IF;
  UPDATE public.credit_topup_requests
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'declined' END,
         decision_note = left(_note, 300), decided_by = auth.uid(), decided_at = now()
   WHERE id = _id;
  IF _approve THEN
    PERFORM set_config('app.internal_credit_grant', 'on', true);
    UPDATE public.profiles SET earned_credits = earned_credits + r.amount WHERE id = r.student_id;
    PERFORM set_config('app.internal_credit_grant', 'off', true);
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, expires_at)
    VALUES (r.student_id, 'earned', r.amount, 'school_topup:' || r.id::text, now() + interval '30 days');
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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

  -- Credit balances are never client-writable (except trusted internal grants that set a txn-local flag).
  IF (NEW.earned_credits IS DISTINCT FROM OLD.earned_credits
     OR NEW.paid_credits IS DISTINCT FROM OLD.paid_credits)
     AND COALESCE(current_setting('app.internal_credit_grant', true), 'off') <> 'on'
  THEN
    RAISE EXCEPTION 'You cannot modify your credit balance';
  END IF;

  IF NEW.university_pick_limit IS DISTINCT FROM OLD.university_pick_limit THEN
    RAISE EXCEPTION 'You cannot modify protected profile fields';
  END IF;

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