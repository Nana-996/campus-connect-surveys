CREATE OR REPLACE FUNCTION public.check_survey_eligibility(_survey_id uuid, _email text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.surveys%ROWTYPE; uid uuid := auth.uid(); domain text; eligible boolean; reasons text[] := '{}';
BEGIN
 SELECT * INTO s FROM public.surveys WHERE id = _survey_id;
 IF NOT FOUND OR (s.visibility = 'private' AND (uid IS NULL OR NOT public.is_survey_invited(s.id))) THEN
  RETURN jsonb_build_object('status','unavailable','reasons',jsonb_build_array('This survey is unavailable to this account.'));
 END IF;
 IF NOT s.is_active OR s.expires_at <= now() OR s.response_count >= s.response_goal THEN
  RETURN jsonb_build_object('status','unavailable','reasons',jsonb_build_array('This survey is closed or has reached its response goal.'));
 END IF;
 IF uid IS NOT NULL AND uid = s.creator_id THEN
  RETURN jsonb_build_object('status','mismatch','reasons',jsonb_build_array('You cannot respond to your own survey.'));
 END IF;
 IF uid IS NULL THEN
  domain := lower(btrim(split_part(coalesce(_email,''),'@',2)));
  IF domain = '' THEN RETURN jsonb_build_object('status','needs_verification','reasons',jsonb_build_array('Enter the email you will use for your account to check the audience.')); END IF;
  IF coalesce(s.visibility,'campus') NOT IN ('everyone','private') AND NOT public.is_academic_domain(domain) THEN
   reasons := array_append(reasons,'This study requires a verified, eligible student account with an academic email.');
  END IF;
  IF coalesce(s.visibility,'campus') NOT IN ('everyone','students','private') AND NOT coalesce(CASE WHEN cardinality(s.target_universities) > 0 THEN domain = ANY(s.target_universities) ELSE domain = s.university_domain END,false) THEN
   reasons := array_append(reasons,'Your email is outside the campus audience selected for this study.');
  END IF;
  RETURN jsonb_build_object('status',CASE WHEN cardinality(reasons)>0 THEN 'mismatch' ELSE 'needs_verification' END,'reasons',to_jsonb(reasons));
 END IF;
 eligible := public.is_student_eligible(uid);
 IF s.visibility = 'students' AND NOT coalesce(eligible,false) THEN reasons := array_append(reasons,'This study requires an eligible student account.'); END IF;
 IF coalesce(s.visibility,'campus') NOT IN ('everyone','students','private') THEN
  IF NOT coalesce(eligible,false) THEN reasons := array_append(reasons,'This campus study requires an eligible student account.'); END IF;
  domain := public.current_university_domain();
  IF NOT coalesce(CASE WHEN cardinality(s.target_universities)>0 THEN lower(coalesce(domain,'')) = ANY(s.target_universities) ELSE s.university_domain = domain END,false) THEN
   reasons := array_append(reasons,'Your verified account is outside this study’s campus audience.');
  END IF;
 END IF;
 IF 'department'=ANY(s.required_criteria) AND NOT coalesce(public.target_text_matches(s.target_department,public.current_department()),false) THEN reasons:=array_append(reasons,'Your department does not match a required criterion.'); END IF;
 IF 'year'=ANY(s.required_criteria) AND NOT coalesce(public.target_text_matches(s.target_year,public.current_year()),false) THEN reasons:=array_append(reasons,'Your year of study does not match a required criterion.'); END IF;
 IF 'country'=ANY(s.required_criteria) AND NOT coalesce(public.target_text_matches(s.target_country,public.current_country()),false) THEN reasons:=array_append(reasons,'Your country does not match a required criterion.'); END IF;
 IF 'age_range'=ANY(s.required_criteria) AND NOT coalesce(public.target_text_matches(s.target_age_range,public.current_age_range()),false) THEN reasons:=array_append(reasons,'Your age range does not match a required criterion.'); END IF;
 IF 'interests'=ANY(s.required_criteria) AND cardinality(s.target_interests)>0 AND NOT coalesce(s.target_interests && public.current_interests(),false) THEN reasons:=array_append(reasons,'Your interests do not match a required criterion.'); END IF;
 RETURN jsonb_build_object('status',CASE WHEN cardinality(reasons)>0 THEN 'mismatch' ELSE 'eligible' END,'reasons',to_jsonb(reasons));
END;
$$;
REVOKE ALL ON FUNCTION public.check_survey_eligibility(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_survey_eligibility(uuid,text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.check_survey_eligibility(uuid,text) IS 'Read-only survey preflight; anonymous checks are provisional, authenticated checks mirror mandatory response audience rules; never grants response access.';