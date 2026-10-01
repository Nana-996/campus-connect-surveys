CREATE OR REPLACE FUNCTION public.admin_platform_analytics(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  _now timestamptz := now();
  _start timestamptz;
  _previous_start timestamptz;
  _bucket text;
  _result jsonb;
BEGIN
  IF _email <> 'nanadjan996@gmail.com' THEN
    RAISE EXCEPTION 'Forbidden: app owner only';
  END IF;

  IF _days NOT IN (0, 7, 30, 90) THEN
    RAISE EXCEPTION 'Invalid analytics period';
  END IF;

  IF _days = 0 THEN
    SELECT LEAST(
      coalesce((SELECT min(created_at) FROM public.profiles), _now),
      coalesce((SELECT min(created_at) FROM public.surveys), _now),
      coalesce((SELECT min(created_at) FROM public.survey_responses), _now)
    ) INTO _start;
    _previous_start := NULL;
    _bucket := 'month';
  ELSE
    _start := _now - make_interval(days => _days);
    _previous_start := _start - make_interval(days => _days);
    _bucket := 'day';
  END IF;

  WITH
  current_users AS (
    SELECT * FROM public.profiles WHERE created_at >= _start AND created_at < _now
  ),
  previous_users AS (
    SELECT * FROM public.profiles
    WHERE _previous_start IS NOT NULL AND created_at >= _previous_start AND created_at < _start
  ),
  current_surveys AS (
    SELECT * FROM public.surveys WHERE created_at >= _start AND created_at < _now
  ),
  previous_surveys AS (
    SELECT * FROM public.surveys
    WHERE _previous_start IS NOT NULL AND created_at >= _previous_start AND created_at < _start
  ),
  current_responses AS (
    SELECT * FROM public.survey_responses WHERE created_at >= _start AND created_at < _now
  ),
  previous_responses AS (
    SELECT * FROM public.survey_responses
    WHERE _previous_start IS NOT NULL AND created_at >= _previous_start AND created_at < _start
  ),
  current_active_users AS (
    SELECT creator_id AS user_id FROM current_surveys
    UNION
    SELECT respondent_id FROM current_responses
  ),
  previous_active_users AS (
    SELECT creator_id AS user_id FROM previous_surveys
    UNION
    SELECT respondent_id FROM previous_responses
  ),
  current_revenue AS (
    SELECT created_at, amount_ghs_kobo::numeric AS pesewas, credits::bigint AS units, 'Credit packs'::text AS source
    FROM public.paystack_purchases WHERE status = 'success' AND created_at >= _start AND created_at < _now
    UNION ALL
    SELECT created_at, price_ghs_pesewas::numeric, 0::bigint, 'Research Boosts'
    FROM public.research_boosts WHERE status IN ('active', 'completed') AND created_at >= _start AND created_at < _now
    UNION ALL
    SELECT created_at, price_ghs_pesewas::numeric, slots::bigint, 'University slots'
    FROM public.university_slot_purchases WHERE status = 'granted' AND created_at >= _start AND created_at < _now
  ),
  previous_revenue AS (
    SELECT amount_ghs_kobo::numeric AS pesewas FROM public.paystack_purchases
    WHERE status = 'success' AND _previous_start IS NOT NULL AND created_at >= _previous_start AND created_at < _start
    UNION ALL
    SELECT price_ghs_pesewas::numeric FROM public.research_boosts
    WHERE status IN ('active', 'completed') AND _previous_start IS NOT NULL AND created_at >= _previous_start AND created_at < _start
    UNION ALL
    SELECT price_ghs_pesewas::numeric FROM public.university_slot_purchases
    WHERE status = 'granted' AND _previous_start IS NOT NULL AND created_at >= _previous_start AND created_at < _start
  ),
  buckets AS (
    SELECT generate_series(
      date_trunc(_bucket, _start),
      date_trunc(_bucket, _now),
      CASE WHEN _bucket = 'month' THEN interval '1 month' ELSE interval '1 day' END
    ) AS bucket_start
  ),
  trend AS (
    SELECT
      b.bucket_start,
      (SELECT count(*) FROM public.profiles p WHERE date_trunc(_bucket, p.created_at) = b.bucket_start)::int AS signups,
      (SELECT count(*) FROM public.surveys s WHERE date_trunc(_bucket, s.created_at) = b.bucket_start)::int AS surveys,
      (SELECT count(*) FROM public.survey_responses r WHERE date_trunc(_bucket, r.created_at) = b.bucket_start)::int AS responses,
      coalesce((SELECT round(sum(cr.pesewas) / 100.0, 2) FROM current_revenue cr WHERE date_trunc(_bucket, cr.created_at) = b.bucket_start), 0) AS revenue_ghs
    FROM buckets b
  ),
  school_rows AS (
    SELECT
      coalesce(nullif(s.name, ''), nullif(p.university_name, ''), domain) AS label,
      domain,
      count(DISTINCT p.id)::int AS users,
      count(DISTINCT sv.id)::int AS surveys,
      coalesce(sum(sr.response_count), 0)::int AS responses,
      bool_or(coalesce(s.subscription_status = 'active' AND (s.valid_until IS NULL OR s.valid_until > _now), false)) AS partner
    FROM (
      SELECT university_domain AS domain FROM public.profiles WHERE university_domain <> ''
      UNION
      SELECT university_domain FROM public.surveys WHERE university_domain <> ''
    ) d
    LEFT JOIN public.schools s ON lower(s.domain) = lower(d.domain)
    LEFT JOIN public.profiles p ON lower(p.university_domain) = lower(d.domain)
    LEFT JOIN public.surveys sv ON lower(sv.university_domain) = lower(d.domain)
    LEFT JOIN LATERAL (
      SELECT coalesce(sum(x.response_count), 0)::int AS response_count
      FROM public.surveys x WHERE lower(x.university_domain) = lower(d.domain)
    ) sr ON true
    GROUP BY coalesce(nullif(s.name, ''), nullif(p.university_name, ''), domain), domain
  ),
  tier_rows AS (
    SELECT tier AS label, count(*)::int AS count
    FROM public.surveys GROUP BY tier ORDER BY count(*) DESC
  ),
  visibility_rows AS (
    SELECT visibility AS label, count(*)::int AS count
    FROM public.surveys GROUP BY visibility ORDER BY count(*) DESC
  ),
  credit_reason_rows AS (
    SELECT reason AS label,
      coalesce(sum(delta) FILTER (WHERE delta > 0), 0)::int AS issued,
      abs(coalesce(sum(delta) FILTER (WHERE delta < 0), 0))::int AS spent
    FROM public.credit_ledger
    WHERE created_at >= _start AND created_at < _now
    GROUP BY reason ORDER BY abs(sum(delta)) DESC LIMIT 10
  )
  SELECT jsonb_build_object(
    'generatedAt', _now,
    'period', jsonb_build_object('days', _days, 'start', _start, 'end', _now, 'bucket', _bucket),
    'summary', jsonb_build_object(
      'totalUsers', (SELECT count(*) FROM public.profiles),
      'newUsers', (SELECT count(*) FROM current_users),
      'previousNewUsers', CASE WHEN _previous_start IS NULL THEN NULL ELSE (SELECT count(*) FROM previous_users) END,
      'activeUsers', (SELECT count(*) FROM current_active_users),
      'previousActiveUsers', CASE WHEN _previous_start IS NULL THEN NULL ELSE (SELECT count(*) FROM previous_active_users) END,
      'students', (SELECT count(*) FROM public.profiles WHERE user_type = 'student'),
      'general', (SELECT count(*) FROM public.profiles WHERE user_type <> 'student'),
      'totalSurveys', (SELECT count(*) FROM public.surveys),
      'newSurveys', (SELECT count(*) FROM current_surveys),
      'previousNewSurveys', CASE WHEN _previous_start IS NULL THEN NULL ELSE (SELECT count(*) FROM previous_surveys) END,
      'liveSurveys', (SELECT count(*) FROM public.surveys WHERE is_active AND expires_at > _now),
      'responses', (SELECT count(*) FROM current_responses),
      'previousResponses', CASE WHEN _previous_start IS NULL THEN NULL ELSE (SELECT count(*) FROM previous_responses) END,
      'totalResponses', (SELECT count(*) FROM public.survey_responses),
      'completedTargets', (SELECT count(*) FROM public.surveys WHERE response_goal > 0 AND response_count >= response_goal),
      'goalCompletion', coalesce((SELECT round(100.0 * sum(response_count) / nullif(sum(response_goal), 0)) FROM public.surveys), 0),
      'partnerSchools', (SELECT count(*) FROM public.schools WHERE is_active AND subscription_status = 'active' AND (valid_until IS NULL OR valid_until > _now)),
      'participatingSchools', (SELECT count(DISTINCT university_domain) FROM public.profiles WHERE university_domain <> ''),
      'openFlags', (SELECT count(*) FROM public.review_flags WHERE NOT resolved),
      'stalledSurveys', (SELECT count(*) FROM public.surveys WHERE is_active AND expires_at > _now AND response_count = 0),
      'expiringSoon', (SELECT count(*) FROM public.surveys WHERE is_active AND expires_at > _now AND expires_at <= _now + interval '3 days')
    ),
    'trend', (SELECT coalesce(jsonb_agg(jsonb_build_object('period', bucket_start, 'signups', signups, 'surveys', surveys, 'responses', responses, 'revenueGhs', revenue_ghs) ORDER BY bucket_start), '[]'::jsonb) FROM trend),
    'accountTypes', jsonb_build_array(
      jsonb_build_object('label', 'Students', 'count', (SELECT count(*) FROM public.profiles WHERE user_type = 'student')),
      jsonb_build_object('label', 'General / Researcher', 'count', (SELECT count(*) FROM public.profiles WHERE user_type <> 'student'))
    ),
    'schools', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.users DESC, x.responses DESC), '[]'::jsonb) FROM (SELECT * FROM school_rows ORDER BY users DESC, responses DESC LIMIT 12) x),
    'surveyTiers', (SELECT coalesce(jsonb_agg(to_jsonb(tier_rows)), '[]'::jsonb) FROM tier_rows),
    'surveyVisibility', (SELECT coalesce(jsonb_agg(to_jsonb(visibility_rows)), '[]'::jsonb) FROM visibility_rows),
    'credits', jsonb_build_object(
      'issued', coalesce((SELECT sum(delta) FROM public.credit_ledger WHERE delta > 0 AND created_at >= _start AND created_at < _now), 0),
      'spent', abs(coalesce((SELECT sum(delta) FROM public.credit_ledger WHERE delta < 0 AND created_at >= _start AND created_at < _now), 0)),
      'earnedBalance', coalesce((SELECT sum(earned_credits) FROM public.profiles), 0),
      'paidBalance', coalesce((SELECT sum(paid_credits) FROM public.profiles), 0),
      'sold', coalesce((SELECT sum(units) FROM current_revenue WHERE source = 'Credit packs'), 0),
      'byReason', (SELECT coalesce(jsonb_agg(to_jsonb(credit_reason_rows)), '[]'::jsonb) FROM credit_reason_rows)
    ),
    'revenue', jsonb_build_object(
      'ghs', coalesce((SELECT round(sum(pesewas) / 100.0, 2) FROM current_revenue), 0),
      'previousGhs', CASE WHEN _previous_start IS NULL THEN NULL ELSE coalesce((SELECT round(sum(pesewas) / 100.0, 2) FROM previous_revenue), 0) END,
      'transactions', (SELECT count(*) FROM current_revenue),
      'bySource', (SELECT coalesce(jsonb_agg(jsonb_build_object('label', source, 'ghs', ghs, 'transactions', transactions) ORDER BY ghs DESC), '[]'::jsonb) FROM (SELECT source, round(sum(pesewas) / 100.0, 2) AS ghs, count(*)::int AS transactions FROM current_revenue GROUP BY source) q)
    ),
    'expiringSoon', (SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.expires_at), '[]'::jsonb) FROM (SELECT id, title, expires_at, response_count, response_goal FROM public.surveys WHERE is_active AND expires_at > _now AND expires_at <= _now + interval '3 days' ORDER BY expires_at LIMIT 12) q),
    'stalled', (SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.created_at), '[]'::jsonb) FROM (SELECT s.id, s.title, s.created_at, p.full_name AS creator_name, s.university_domain FROM public.surveys s LEFT JOIN public.profiles p ON p.id = s.creator_id WHERE s.is_active AND s.expires_at > _now AND s.response_count = 0 ORDER BY s.created_at LIMIT 12) q)
  ) INTO _result;

  RETURN _result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_platform_analytics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_platform_analytics(integer) TO authenticated, service_role;