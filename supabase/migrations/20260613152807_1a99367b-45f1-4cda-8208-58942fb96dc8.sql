CREATE OR REPLACE FUNCTION public.handle_new_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  _q jsonb; _total int := 0; _answered int := 0;
  _quality numeric; _flagged boolean;
  _day date := (now() AT TIME ZONE 'UTC')::date;
  _week date := date_trunc('week', now() AT TIME ZONE 'UTC')::date;
  _day_count int := 0; _week_count int := 0;
  _recent_count int;
  _bonus int := 0;
  _award int := 1;
  _started timestamptz;
  _server_duration_ms bigint := 0;
  _effective_duration_ms bigint := 0;
  _min_seconds int := 15;
  _min_ms bigint := 15000;
BEGIN
  UPDATE public.surveys SET response_count = response_count + 1 WHERE id = NEW.survey_id;

  SELECT started_at INTO _started
    FROM public.survey_response_starts
    WHERE user_id = NEW.respondent_id AND survey_id = NEW.survey_id;
  IF _started IS NOT NULL THEN
    _server_duration_ms := GREATEST(0, (EXTRACT(EPOCH FROM (now() - _started)) * 1000)::bigint);
  END IF;

  -- Prefer client-tracked duration when available (critical for offline-synced responses);
  -- fall back to server-calculated duration otherwise.
  _effective_duration_ms := COALESCE(NULLIF(NEW.duration_ms, 0), _server_duration_ms);
  UPDATE public.survey_responses SET duration_ms = _effective_duration_ms WHERE id = NEW.id;

  SELECT questions, COALESCE(respondent_bonus, 0), COALESCE(min_response_seconds, 15)
    INTO _q, _bonus, _min_seconds
    FROM public.surveys WHERE id = NEW.survey_id;
  _min_ms := GREATEST(0, _min_seconds)::bigint * 1000;

  IF _q IS NOT NULL THEN _total := jsonb_array_length(_q); END IF;
  IF _total > 0 THEN
    SELECT COUNT(*) INTO _answered
      FROM jsonb_each_text(NEW.answers) WHERE value IS NOT NULL AND length(trim(value)) > 0;
    _quality := _answered::numeric / _total::numeric;
  ELSE
    _quality := 0;
  END IF;
  UPDATE public.survey_responses SET quality_score = _quality WHERE id = NEW.id;

  SELECT is_flagged INTO _flagged FROM public.profiles WHERE id = NEW.respondent_id;

  SELECT COUNT(*) INTO _recent_count FROM public.survey_responses
    WHERE respondent_id = NEW.respondent_id AND created_at > now() - interval '10 minutes';
  IF _recent_count > 5 THEN
    INSERT INTO public.review_flags(user_id, type, details)
      VALUES (NEW.respondent_id, 'rapid_fire', jsonb_build_object('count',_recent_count));
  END IF;

  -- Speed trap: faster than owner-set minimum = no credit + review flag
  IF _min_ms > 0 AND _effective_duration_ms < _min_ms THEN
    INSERT INTO public.review_flags(user_id, type, details)
      VALUES (NEW.respondent_id, 'speed_trap',
              jsonb_build_object('survey_id', NEW.survey_id,
                                 'duration_ms', _effective_duration_ms,
                                 'min_ms', _min_ms));
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
      VALUES (NEW.respondent_id,'earned',0,'response_no_credit_speed_trap',NEW.survey_id);
    RETURN NEW;
  END IF;

  IF _flagged OR _quality < 0.8 THEN
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
      VALUES (NEW.respondent_id,'earned',0,'response_no_credit_low_quality',NEW.survey_id);
    RETURN NEW;
  END IF;

  INSERT INTO public.earning_caps(user_id) VALUES (NEW.respondent_id)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT day_bucket, week_bucket, day_count, week_count
    INTO _day, _week, _day_count, _week_count
    FROM public.earning_caps WHERE user_id = NEW.respondent_id FOR UPDATE;
  IF _day <> (now() AT TIME ZONE 'UTC')::date THEN _day := (now() AT TIME ZONE 'UTC')::date; _day_count := 0; END IF;
  IF _week <> date_trunc('week', now() AT TIME ZONE 'UTC')::date THEN
    _week := date_trunc('week', now() AT TIME ZONE 'UTC')::date; _week_count := 0;
  END IF;
  IF _day_count >= 3 OR _week_count >= 10 THEN
    UPDATE public.earning_caps
      SET day_bucket=_day, week_bucket=_week, day_count=_day_count, week_count=_week_count, updated_at=now()
      WHERE user_id = NEW.respondent_id;
    INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id)
      VALUES (NEW.respondent_id,'earned',0,'cap_reached',NEW.survey_id);
    RETURN NEW;
  END IF;

  _award := 1 + COALESCE(_bonus, 0);

  UPDATE public.profiles SET earned_credits = earned_credits + _award WHERE id = NEW.respondent_id;
  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason, survey_id, expires_at)
    VALUES (NEW.respondent_id,'earned',_award,
            CASE WHEN _bonus > 0 THEN 'response_with_bonus' ELSE 'response' END,
            NEW.survey_id, now() + interval '30 days');
  UPDATE public.earning_caps
    SET day_bucket=_day, week_bucket=_week,
        day_count=_day_count+1, week_count=_week_count+1, updated_at=now()
    WHERE user_id = NEW.respondent_id;
  RETURN NEW;
END;
$function$