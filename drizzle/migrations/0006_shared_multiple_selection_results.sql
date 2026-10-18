DO $$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.get_shared_dashboard(text)'::regprocedure) INTO definition;
  definition := replace(definition, 'IF _qtype IN (''choice'',''rating'') THEN', 'IF _qtype IN (''choice'',''multi_choice'',''rating'') THEN');
  definition := replace(definition, 'WHERE survey_id = _survey_id AND (answers->>_qid) = _opt;', 'WHERE survey_id = _survey_id AND (CASE WHEN _qtype = ''multi_choice'' THEN (answers->_qid) @> jsonb_build_array(_opt) ELSE (answers->>_qid) = _opt END);');
  EXECUTE definition;
END; $$;
DO $$
BEGIN
  IF NOT public.valid_multi_choice_answer('["A","B"]'::jsonb,'["A","B","C"]'::jsonb,true) THEN RAISE EXCEPTION 'Two selections must be accepted'; END IF;
  IF public.valid_multi_choice_answer('[]'::jsonb,'["A","B"]'::jsonb,true) THEN RAISE EXCEPTION 'Required empty must be rejected'; END IF;
  IF NOT public.valid_multi_choice_answer('[]'::jsonb,'["A","B"]'::jsonb,false) THEN RAISE EXCEPTION 'Optional empty must be accepted'; END IF;
  IF public.valid_multi_choice_answer('["A","A"]'::jsonb,'["A","B"]'::jsonb,true) THEN RAISE EXCEPTION 'Duplicates must be rejected'; END IF;
  IF public.valid_multi_choice_answer('["X"]'::jsonb,'["A","B"]'::jsonb,true) THEN RAISE EXCEPTION 'Unknown selections must be rejected'; END IF;
END; $$;