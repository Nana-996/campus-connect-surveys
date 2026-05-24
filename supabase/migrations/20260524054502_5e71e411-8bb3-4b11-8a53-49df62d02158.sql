-- Drop over-permissive SELECT policy
DROP POLICY IF EXISTS "Profiles: read own and same university" ON public.profiles;

-- Own-profile read only on the base table
CREATE POLICY "Profiles: read own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Safe directory view for same-university lookups
CREATE OR REPLACE VIEW public.campus_directory
WITH (security_invoker = on) AS
  SELECT id, full_name, university_name, university_domain,
         department, year, user_type, country, age_range, created_at
  FROM public.profiles
  WHERE id = auth.uid()
     OR university_domain = public.current_university_domain();

GRANT SELECT ON public.campus_directory TO authenticated;