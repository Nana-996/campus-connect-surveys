REVOKE SELECT (email) ON public.lecturers FROM authenticated;
REVOKE SELECT (email) ON public.lecturers FROM anon;
GRANT SELECT (id, full_name, department, title, university_domain, created_by, created_at, updated_at) ON public.lecturers TO authenticated;