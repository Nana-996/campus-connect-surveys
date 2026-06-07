
-- 1. Server-managed start timestamps
CREATE TABLE IF NOT EXISTS public.survey_response_starts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, survey_id)
);

GRANT ALL ON public.survey_response_starts TO service_role;
-- No grants to anon/authenticated: this table is touched only by SECURITY DEFINER functions.

ALTER TABLE public.survey_response_starts ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: all access must go through SECURITY DEFINER RPCs/triggers.

-- 2. RPC that respondents call when they open a survey.
-- Only the first call counts — subsequent calls do NOT reset started_at,
-- so a user cannot game the timer by calling this right before submitting.
CREATE OR REPLACE FUNCTION public.begin_survey_response(_survey_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _started timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.surveys WHERE id = _survey_id AND is_active = true) THEN
    RAISE EXCEPTION 'Survey not available';
  END IF;
  INSERT INTO public.survey_response_starts(user_id, survey_id)
    VALUES (_uid, _survey_id)
    ON CONFLICT (user_id, survey_id) DO NOTHING;
  SELECT started_at INTO _started
    FROM public.survey_response_starts
    WHERE user_id = _uid AND survey_id = _survey_id;
  RETURN _started;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_survey_response(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_survey_response(uuid) TO authenticated;

-- 3. Re-create handle_new_response so duration_ms is computed server-side
-- from the recorded start time. The client-supplied value is overwritten.
CREATE OR REPLACE FUNCTION public.handle_new_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
BEGIN
  UPDATE public.surveys SET response_count = response_count + 1 WHERE id = NEW.survey_id;

  -- Server-side duration: difference between recorded start and now.
  -- If no start record exists (user bypassed begin_survey_response), treat as 0ms.
  SELECT started_at INTO _started
    FROM public.survey_response_starts
    WHERE user_id = NEW.respondent_id AND survey_id = NEW.survey_id;
  IF _started IS NOT NULL THEN
    _server_duration_ms := GREATEST(0, (EXTRACT(EPOCH FROM (now() - _started)) * 1000)::bigint);
  END IF;
  -- Overwrite any client-supplied value so downstream readers see truth.
  UPDATE public.survey_responses SET duration_ms = _server_duration_ms WHERE id = NEW.id;

  SELECT questions, COALESCE(respondent_bonus, 0)
    INTO _q, _bonus
    FROM public.surveys WHERE id = NEW.survey_id;
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

  IF _flagged OR _quality < 0.8 OR _server_duration_ms < 15000 THEN
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
$function$;
