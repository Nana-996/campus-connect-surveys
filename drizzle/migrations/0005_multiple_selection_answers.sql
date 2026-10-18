CREATE OR REPLACE FUNCTION public.valid_multi_choice_answer(_answer jsonb, _options jsonb, _required boolean)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF _answer IS NULL THEN RETURN NOT _required; END IF;
  IF jsonb_typeof(_answer) <> 'array' THEN RETURN false; END IF;
  IF _required AND jsonb_array_length(_answer) = 0 THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_answer) v WHERE jsonb_typeof(v) <> 'string' OR NOT COALESCE(_options, '[]'::jsonb) @> jsonb_build_array(v)) THEN RETURN false; END IF;
  RETURN (SELECT count(*) = count(DISTINCT v) FROM jsonb_array_elements(_answer) v);
END; $$;
REVOKE ALL ON FUNCTION public.valid_multi_choice_answer(jsonb,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.valid_multi_choice_answer(jsonb,jsonb,boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.validate_multi_choice_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _questions jsonb; _question jsonb;
BEGIN
  SELECT questions INTO _questions FROM public.surveys WHERE id = NEW.survey_id;
  FOR _question IN SELECT value FROM jsonb_array_elements(_questions) WHERE value->>'type' = 'multi_choice' LOOP
    IF NOT public.valid_multi_choice_answer(NEW.answers->(_question->>'id'), _question->'options', COALESCE((_question->>'required')::boolean,true)) THEN
      RAISE EXCEPTION 'Select valid options for the multiple-selection question.' USING ERRCODE = '23514';
    END IF;
    IF NEW.answers->(_question->>'id') = '[]'::jsonb THEN
      NEW.answers := NEW.answers - (_question->>'id');
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_multi_choice_response() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_multi_choice_response() TO service_role;
CREATE TRIGGER validate_multi_choice_response BEFORE INSERT ON public.survey_responses FOR EACH ROW EXECUTE FUNCTION public.validate_multi_choice_response();
