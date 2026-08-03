
-- ---------- schools ----------
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read schools"
  ON public.schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage schools"
  ON public.schools FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- school invites ----------
CREATE TABLE public.school_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_domain text NOT NULL REFERENCES public.schools(domain) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('faculty','lecturer')),
  token text NOT NULL UNIQUE,
  email text,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  accepted_by uuid,
  accepted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.school_invites TO authenticated;
GRANT ALL ON public.school_invites TO service_role;
ALTER TABLE public.school_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage school invites"
  ON public.school_invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX school_invites_domain_idx ON public.school_invites (school_domain);

-- ---------- admin RPCs ----------
CREATE OR REPLACE FUNCTION public.admin_list_schools()
RETURNS TABLE (
  id uuid, name text, domain text, is_active boolean,
  created_at timestamptz, open_invites bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.name, s.domain, s.is_active, s.created_at,
    (SELECT count(*) FROM public.school_invites i
      WHERE i.school_domain = s.domain AND NOT i.revoked AND i.accepted_by IS NULL
        AND (i.expires_at IS NULL OR i.expires_at > now())) AS open_invites
  FROM public.schools s
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY s.name;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_school(_name text, _domain text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  PERFORM public.require_admin_user();
  INSERT INTO public.schools (name, domain, created_by)
  VALUES (btrim(_name), lower(btrim(_domain)), auth.uid())
  ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_school_active(_domain text, _active boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin_user();
  UPDATE public.schools SET is_active = _active, updated_at = now()
  WHERE domain = lower(btrim(_domain));
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_create_school_invite(
  _domain text, _role text, _email text DEFAULT NULL, _expires_days integer DEFAULT 14
)
RETURNS TABLE (id uuid, token text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d text := lower(btrim(_domain)); _active boolean;
BEGIN
  PERFORM public.require_admin_user();
  IF _role NOT IN ('faculty','lecturer') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  SELECT s.is_active INTO _active FROM public.schools s WHERE s.domain = _d;
  IF _active IS NULL THEN RAISE EXCEPTION 'School not found'; END IF;
  IF NOT _active THEN RAISE EXCEPTION 'School is deactivated'; END IF;

  RETURN QUERY
  INSERT INTO public.school_invites (school_domain, role, token, email, expires_at, created_by)
  VALUES (
    _d, _role, encode(gen_random_bytes(18), 'hex'),
    nullif(lower(btrim(coalesce(_email,''))), ''),
    CASE WHEN _expires_days IS NULL OR _expires_days <= 0 THEN NULL
         ELSE now() + make_interval(days => least(_expires_days, 90)) END,
    auth.uid()
  )
  RETURNING school_invites.id, school_invites.token, school_invites.expires_at;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_school_invites(_domain text)
RETURNS TABLE (
  id uuid, role text, token text, email text, expires_at timestamptz,
  revoked boolean, accepted_at timestamptz, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.role, i.token, i.email, i.expires_at, i.revoked, i.accepted_at, i.created_at
  FROM public.school_invites i
  WHERE public.has_role(auth.uid(), 'admin')
    AND i.school_domain = lower(btrim(_domain))
  ORDER BY i.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_school_invite(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin_user();
  UPDATE public.school_invites SET revoked = true WHERE id = _id;
  RETURN FOUND;
END; $$;

-- ---------- invite lookup + acceptance ----------
CREATE OR REPLACE FUNCTION public.get_school_invite(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'found', i.id IS NOT NULL,
    'role', i.role,
    'school_name', s.name,
    'school_domain', s.domain,
    'school_active', s.is_active,
    'accepted', i.accepted_by IS NOT NULL,
    'revoked', i.revoked,
    'expired', (i.expires_at IS NOT NULL AND i.expires_at <= now())
  )
  FROM public.school_invites i
  JOIN public.schools s ON s.domain = i.school_domain
  WHERE i.token = _token;
$$;

CREATE OR REPLACE FUNCTION public.accept_school_invite(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inv public.school_invites; _school public.schools; _uid uuid := auth.uid(); _prof public.profiles;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO _inv FROM public.school_invites WHERE token = _token;
  IF _inv.id IS NULL THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF _inv.revoked THEN RAISE EXCEPTION 'Invite revoked'; END IF;
  IF _inv.accepted_by IS NOT NULL THEN RAISE EXCEPTION 'Invite already used'; END IF;
  IF _inv.expires_at IS NOT NULL AND _inv.expires_at <= now() THEN RAISE EXCEPTION 'Invite expired'; END IF;

  SELECT * INTO _school FROM public.schools WHERE domain = _inv.school_domain;
  IF NOT _school.is_active THEN RAISE EXCEPTION 'School is deactivated'; END IF;

  SELECT * INTO _prof FROM public.profiles WHERE id = _uid;

  IF _inv.role = 'faculty' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'faculty')
    ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.profiles SET university_name = _school.name WHERE id = _uid;
  ELSE
    INSERT INTO public.lecturers (university_domain, full_name, department, email, created_by)
    VALUES (_school.domain, coalesce(_prof.full_name, 'Lecturer'),
            nullif(_prof.department, ''), _inv.email, _uid);
  END IF;

  UPDATE public.school_invites
    SET accepted_by = _uid, accepted_at = now() WHERE id = _inv.id;

  RETURN jsonb_build_object('ok', true, 'role', _inv.role, 'school', _school.name);
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_school_invite(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_school_invite(text) TO anon, authenticated;

-- Seed schools from existing university data so the directory is not empty
INSERT INTO public.schools (name, domain)
SELECT DISTINCT ON (p.university_domain)
  coalesce(nullif(btrim(p.university_name), ''), p.university_domain), p.university_domain
FROM public.profiles p
WHERE p.university_domain IS NOT NULL AND btrim(p.university_domain) <> ''
ORDER BY p.university_domain, p.created_at
ON CONFLICT (domain) DO NOTHING;
