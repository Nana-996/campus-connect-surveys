CREATE OR REPLACE FUNCTION public.target_text_matches(_target text, _actual text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  t text := lower(btrim(coalesce(_target, '')));
  a text := lower(btrim(coalesce(_actual, '')));
  part text;
  lo int;
  hi int;
  actual_num int;
  m text[];
BEGIN
  -- No target, or wildcard target: everyone matches.
  IF t = '' OR t IN ('all', 'any', 'all years', 'any year', 'all departments') THEN
    RETURN true;
  END IF;

  IF t = a THEN
    RETURN true;
  END IF;

  -- Numeric value inside the actual value, e.g. "Year 2" -> 2
  m := regexp_match(a, '(\d+)');
  IF m IS NOT NULL THEN
    actual_num := m[1]::int;
  END IF;

  -- Comma / slash separated lists, and ranges like "Year 1-6"
  FOREACH part IN ARRAY regexp_split_to_array(t, '\s*[,/|]\s*') LOOP
    part := btrim(part);
    IF part = '' THEN CONTINUE; END IF;
    IF part = a THEN RETURN true; END IF;

    m := regexp_match(part, '(\d+)\s*(?:-|–|—|to)\s*(\d+)');
    IF m IS NOT NULL AND actual_num IS NOT NULL THEN
      lo := m[1]::int;
      hi := m[2]::int;
      IF actual_num >= least(lo, hi) AND actual_num <= greatest(lo, hi) THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.target_text_matches(text, text) FROM PUBLIC, anon, authenticated;