REVOKE ALL ON TABLE public.lecturers FROM anon;
REVOKE SELECT (email) ON public.lecturers FROM anon, authenticated;
GRANT SELECT (id, university_domain, full_name, department, title, created_by, created_at, updated_at) ON public.lecturers TO authenticated;