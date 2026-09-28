CREATE OR REPLACE FUNCTION public.transition_graduated_students()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.profiles
     SET user_type = 'general'
   WHERE user_type = 'student'
     AND graduation_date IS NOT NULL
     AND (graduation_date + interval '1 month')::date <= current_date;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transition_graduated_students() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('transition-graduated-students')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'transition-graduated-students');
SELECT cron.schedule('transition-graduated-students', '0 2 * * *', $$SELECT public.transition_graduated_students();$$);

SELECT public.transition_graduated_students();