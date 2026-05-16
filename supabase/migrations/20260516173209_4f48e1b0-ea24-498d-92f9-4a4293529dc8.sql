DROP POLICY IF EXISTS "Profiles: read same university" ON public.profiles;

CREATE POLICY "Profiles: read own and same university"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR university_domain = public.current_university_domain()
);