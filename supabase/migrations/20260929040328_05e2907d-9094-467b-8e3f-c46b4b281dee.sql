CREATE TABLE public.credit_topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  school_domain text NOT NULL,
  amount integer NOT NULL CHECK (amount BETWEEN 1 AND 100),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  decision_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_topup_requests TO authenticated;
GRANT ALL ON public.credit_topup_requests TO service_role;
ALTER TABLE public.credit_topup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own topup requests" ON public.credit_topup_requests
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE INDEX ON public.credit_topup_requests (school_domain, status);
CREATE UNIQUE INDEX credit_topup_one_pending ON public.credit_topup_requests (student_id) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.request_credit_topup(_amount integer, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE p record; s record; _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_type, university_domain INTO p FROM public.profiles WHERE id = auth.uid();
  IF p.user_type IS DISTINCT FROM 'student' THEN RAISE EXCEPTION 'Only students can request top-ups'; END IF;
  SELECT domain INTO s FROM public.schools
   WHERE admin_user_id IS NOT NULL AND is_active
     AND (lower(p.university_domain) = lower(domain) OR lower(p.university_domain) LIKE '%.' || lower(domain))
   LIMIT 1;
  IF s.domain IS NULL THEN RAISE EXCEPTION 'Your school has no school admin yet'; END IF;
  IF _amount < 1 OR _amount > 100 THEN RAISE EXCEPTION 'Amount must be between 1 and 100'; END IF;
  IF EXISTS (SELECT 1 FROM public.credit_topup_requests WHERE student_id = auth.uid() AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending request';
  END IF;
  INSERT INTO public.credit_topup_requests(student_id, school_domain, amount, reason)
  VALUES (auth.uid(), s.domain, _amount, left(trim(_reason), 500)) RETURNING id INTO _id;
  RETURN _id;
END; $$;
REVOKE ALL ON FUNCTION public.request_credit_topup(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_credit_topup(integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.school_admin_list_topups()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE s record;
BEGIN
  SELECT domain INTO s FROM public.schools WHERE admin_user_id = auth.uid() LIMIT 1;
  IF s.domain IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', r.id, 'amount', r.amount, 'reason', r.reason, 'status', r.status,
    'decision_note', r.decision_note, 'created_at', r.created_at, 'decided_at', r.decided_at,
    'student_name', p.full_name, 'department', p.department, 'index_number', p.index_number,
    'earned_credits', p.earned_credits) ORDER BY (r.status='pending') DESC, r.created_at DESC)
    FROM public.credit_topup_requests r JOIN public.profiles p ON p.id = r.student_id
    WHERE r.school_domain = s.domain), '[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.school_admin_list_topups() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_admin_list_topups() TO authenticated;

CREATE OR REPLACE FUNCTION public.school_admin_decide_topup(_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
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
    UPDATE public.profiles SET earned_credits = earned_credits + r.amount WHERE id = r.student_id;
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, expires_at)
    VALUES (r.student_id, 'earned', r.amount, 'school_topup:' || r.id::text, now() + interval '30 days');
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;
REVOKE ALL ON FUNCTION public.school_admin_decide_topup(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_admin_decide_topup(uuid, boolean, text) TO authenticated;