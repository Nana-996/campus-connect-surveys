DO $mig$
DECLARE
  _defs text[][] := ARRAY[
    ARRAY['public.get_survey_review(text)', 'IF NOT FOUND THEN RETURN NULL; END IF;', 'IF NOT FOUND OR r.status = ''revoked'' THEN RETURN NULL; END IF;'],
    ARRAY['public.school_admin_decide_topup(uuid,boolean,text)', 'IF r.status <> ''pending''', 'IF r.student_id = auth.uid() THEN RAISE EXCEPTION ''You cannot decide your own request''; END IF;
  IF r.status <> ''pending'''],
    ARRAY['public.handle_new_response()', '_effective_duration_ms := LEAST(COALESCE(NULLIF(NEW.duration_ms, 0), 0), _max_client_ms);', '_effective_duration_ms := 0; -- no server-recorded start: never trust client duration'],
    ARRAY['public.faculty_list_watchlist()', 'WHERE w.faculty_user_id = _uid', 'WHERE w.faculty_user_id = _uid AND _domain IS NOT NULL AND p.university_domain = _domain'],
    ARRAY['public.redeem_promo_code(text)', 'r := public._promo_check(_code, _uid);', 'r := public._promo_check(_code, _uid);
  IF r.created_by IS NOT NULL AND r.created_by = _uid THEN RAISE EXCEPTION ''You cannot redeem a code you created''; END IF;'],
    ARRAY['public.get_survey_responses_for_manager(uuid)', 'IF NOT (_is_admin OR (_is_manager AND (_survey_domain = _domain OR _creator_domain = _domain))) THEN', 'IF NOT (COALESCE(_is_admin,false) OR (COALESCE(_is_manager,false) AND _domain IS NOT NULL AND (_survey_domain = _domain OR COALESCE(_creator_domain = _domain,false)))) THEN']
  ];
  _i int; _def text;
BEGIN
  FOR _i IN 1..array_length(_defs,1) LOOP
    _def := pg_get_functiondef(_defs[_i][1]::regprocedure);
    IF position(_defs[_i][2] IN _def) = 0 THEN
      RAISE EXCEPTION 'Pattern not found in %', _defs[_i][1];
    END IF;
    EXECUTE replace(_def, _defs[_i][2], _defs[_i][3]);
  END LOOP;
END $mig$;

DROP POLICY IF EXISTS "Faculty add own watchlist" ON public.faculty_student_watchlist;
CREATE POLICY "Faculty add own watchlist" ON public.faculty_student_watchlist
  FOR INSERT TO authenticated
  WITH CHECK (
    faculty_user_id = auth.uid()
    AND public.has_role(auth.uid(), 'faculty'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = student_user_id
        AND p.user_type = 'student'
        AND p.university_domain = public.current_university_domain()
    )
  );