DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.get_survey_tracking_scope'::regproc);
  d := replace(d, '  RETURN jsonb_build_object(
    ''surveyId'', _survey.id,', '  IF NOT (_can_track OR _can_see_answers) THEN
    RETURN jsonb_build_object(
      ''surveyId'', _survey_id, ''title'', NULL, ''creatorName'', NULL,
      ''universityDomain'', NULL, ''responseCount'', NULL, ''responseGoal'', NULL,
      ''isAdmin'', _is_admin, ''isManager'', _is_manager,
      ''hasTrackingGrant'', _has_tracking_grant, ''canTrack'', false, ''canSeeAnswers'', false);
  END IF;

  RETURN jsonb_build_object(
    ''surveyId'', _survey.id,');
  IF position('IF NOT (_can_track OR _can_see_answers)' in d) = 0 THEN RAISE EXCEPTION 'patch failed'; END IF;
  EXECUTE d;
END $do$;