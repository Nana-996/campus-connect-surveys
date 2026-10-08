-- Fix: partner_stats() 'activity' returned the 30 OLDEST events instead of the newest.
-- 'ORDER BY 1' applied to the whole UNION sorted the jsonb objects ascending (the 'at' key
-- sorts before 'kind'), so 'LIMIT 30' kept the oldest rows and the outer jsonb_agg could
-- only re-sort those 30. Carry the event timestamp as its own column and order it descending
-- before limiting, so the list always shows the most recent activity.
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
    'activity', coalesce((SELECT jsonb_agg(a ORDER BY at DESC) FROM (
        SELECT created_at AS at, jsonb_build_object('kind', CASE WHEN user_type='student' THEN 'Student joined' ELSE 'Researcher/general member joined' END, 'at', created_at) a FROM r
        UNION ALL SELECT at, jsonb_build_object('kind','Paid purchase','at',at) FROM pay
        ORDER BY at DESC NULLS LAST LIMIT 30) x), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.partner_stats(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_stats(uuid) TO service_role;