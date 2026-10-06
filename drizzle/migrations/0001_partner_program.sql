CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  partner_email text NOT NULL,
  contact text,
  target_paying integer NOT NULL DEFAULT 50,
  reward_note text,
  clicks integer NOT NULL DEFAULT 0,
  milestones_paid integer NOT NULL DEFAULT 0,
  last_paid_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.partner_referrals (
  user_id uuid PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.partner_referrals TO service_role;
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_partner_click(_slug text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (UPDATE public.partners SET clicks = clicks + 1
    WHERE slug = lower(_slug) AND is_active RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;
REVOKE ALL ON FUNCTION public.record_partner_click(text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_partner_click(text) TO anon, authenticated;

-- Only accounts created in the last 7 days can be attributed, once.
CREATE OR REPLACE FUNCTION public.claim_partner_referral(_slug text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid uuid; _created timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'no_auth'; END IF;
  SELECT id INTO _pid FROM public.partners WHERE slug = lower(_slug) AND is_active;
  IF _pid IS NULL THEN RETURN 'unknown'; END IF;
  SELECT created_at INTO _created FROM auth.users WHERE id = auth.uid();
  IF _created < now() - interval '7 days' THEN RETURN 'too_old'; END IF;
  INSERT INTO public.partner_referrals(user_id, partner_id) VALUES (auth.uid(), _pid)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION public.claim_partner_referral(text) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_partner_referral(text) TO authenticated;

-- Aggregate stats; no personal data of referred users is returned.
CREATE OR REPLACE FUNCTION public.partner_stats(_partner_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH r AS (
    SELECT pr.user_id, pr.created_at, p.user_type
    FROM public.partner_referrals pr LEFT JOIN public.profiles p ON p.id = pr.user_id
    WHERE pr.partner_id = _partner_id
  ), pay AS (
    SELECT user_id, amount_ghs_kobo::numeric/100 AS ghs, credited_at AS at FROM public.paystack_purchases WHERE credited_at IS NOT NULL AND user_id IN (SELECT user_id FROM r)
    UNION ALL
    SELECT user_id, price_ghs_pesewas::numeric/100, activated_at FROM public.research_boosts WHERE activated_at IS NOT NULL AND user_id IN (SELECT user_id FROM r)
    UNION ALL
    SELECT user_id, price_ghs_pesewas::numeric/100, granted_at FROM public.university_slot_purchases WHERE granted_at IS NOT NULL AND user_id IN (SELECT user_id FROM r)
  )
  SELECT jsonb_build_object(
    'signups', (SELECT count(*) FROM r),
    'students', (SELECT count(*) FROM r WHERE user_type = 'student'),
    'general', (SELECT count(*) FROM r WHERE user_type IS DISTINCT FROM 'student'),
    'paying', (SELECT count(DISTINCT user_id) FROM pay),
    'revenue_ghs', (SELECT coalesce(sum(ghs),0) FROM pay),
    'activity', coalesce((SELECT jsonb_agg(a ORDER BY a->>'at' DESC) FROM (
        SELECT jsonb_build_object('kind', CASE WHEN user_type='student' THEN 'Student joined' ELSE 'Researcher/general member joined' END, 'at', created_at) a FROM r
        UNION ALL SELECT jsonb_build_object('kind','Paid purchase','at',at) FROM pay
        ORDER BY 1 LIMIT 30) x), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.partner_stats(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_stats(uuid) TO service_role;