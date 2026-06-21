
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles';
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles
  (id, full_name, university_name, university_domain, department, year, earned_credits, country, age_range, interests, interests_raw);
