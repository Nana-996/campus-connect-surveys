REVOKE SELECT (email) ON public.lecturers FROM authenticated;
-- service_role retains GRANT ALL; admin/manager staff reads go through supabaseAdmin (listLecturersForStaff).