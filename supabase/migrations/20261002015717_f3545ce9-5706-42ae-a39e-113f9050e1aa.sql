DROP POLICY IF EXISTS "disposable: read all" ON public.disposable_domains;
DROP POLICY IF EXISTS "interest_tags: read all" ON public.interest_tags;
CREATE POLICY "Admins can read interest tags" ON public.interest_tags FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Signed-in users can read schools" ON public.schools;
CREATE POLICY "Signed-in users can read current partnerships or their own school" ON public.schools
FOR SELECT TO authenticated
USING (
  admin_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR (is_active AND subscription_status IN ('trial','active') AND (valid_until IS NULL OR valid_until > now()))
);
REVOKE SELECT ON public.schools FROM authenticated;
GRANT SELECT (id, name, domain, join_slug, is_active, subscription_status, valid_until, admin_user_id, created_at, updated_at) ON public.schools TO authenticated;