-- 1. Defense-in-depth on surveys UPDATE: enforce university_domain immutability via WITH CHECK
ALTER POLICY "Surveys: update own" ON public.surveys
  USING (creator_id = auth.uid())
  WITH CHECK (
    creator_id = auth.uid()
    AND university_domain = public.current_university_domain()
  );

-- 2. Restrict realtime publication on profiles to non-sensitive columns
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
  (id, full_name, university_name, department, year,
   earned_credits, paid_credits, user_type, country, age_range,
   interests, created_at);

ALTER TABLE public.profiles REPLICA IDENTITY DEFAULT;
