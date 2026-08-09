REVOKE ALL ON public.lecturers FROM anon;
REVOKE ALL ON public.lecturers FROM authenticated;

GRANT SELECT (id, university_domain, full_name, department, title, created_by, created_at, updated_at) ON public.lecturers TO authenticated;
GRANT INSERT (id, university_domain, full_name, department, title, email, created_by, created_at, updated_at) ON public.lecturers TO authenticated;
GRANT UPDATE (id, university_domain, full_name, department, title, email, created_by, created_at, updated_at) ON public.lecturers TO authenticated;
GRANT DELETE ON public.lecturers TO authenticated;

GRANT ALL ON public.lecturers TO service_role;