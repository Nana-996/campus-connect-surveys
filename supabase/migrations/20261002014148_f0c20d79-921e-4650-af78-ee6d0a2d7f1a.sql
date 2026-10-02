DO $mig$
DECLARE
  _fn regprocedure;
  _def text;
BEGIN
  FOR _fn IN SELECT oid::regprocedure FROM pg_proc WHERE proname = 'admin_platform_analytics' AND pronamespace = 'public'::regnamespace LOOP
    _def := pg_get_functiondef(_fn);
    _def := replace(_def, $r$coalesce(nullif(s.name, ''), max(nullif(p.university_name, '')), d.domain) AS label$r$, $r$coalesce(max(nullif(s.name, '')), max(nullif(p.university_name, '')), d.domain) AS label$r$);
    _def := replace(_def, $r$GROUP BY coalesce(nullif(s.name, ''), d.domain), d.domain$r$, $r$GROUP BY d.domain$r$);
    EXECUTE _def;
  END LOOP;
END
$mig$;

GRANT EXECUTE ON FUNCTION public.is_student_eligible(uuid) TO anon;