DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, PUBLIC', r.proname, r.args);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.get_shared_dashboard(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_survey_share_card(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_poll_results(uuid) TO anon;