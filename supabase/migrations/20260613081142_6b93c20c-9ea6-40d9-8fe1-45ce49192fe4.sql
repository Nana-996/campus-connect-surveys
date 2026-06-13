
-- 1) Column-level protection for profiles: revoke UPDATE on sensitive columns from authenticated;
-- grant UPDATE only on user-editable columns. Triggers/admin (definer/service_role) still work.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, department, year, country, age_range, interests, interests_raw, index_number)
  ON public.profiles TO authenticated;
