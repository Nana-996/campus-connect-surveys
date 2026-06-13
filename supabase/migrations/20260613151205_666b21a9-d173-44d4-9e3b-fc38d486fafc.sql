-- Restrict realtime publication of profiles to safe columns only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles';
  END IF;
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles (id, full_name, university_name, university_domain, department, year, earned_credits, paid_credits, user_type, country, age_range, interests, index_number, created_at)';
END $$;

ALTER TABLE public.profiles REPLICA IDENTITY DEFAULT;