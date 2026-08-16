CREATE TABLE public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  label text,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.social_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_links TO authenticated;
GRANT ALL ON public.social_links TO service_role;

ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active links"
  ON public.social_links FOR SELECT
  TO anon, authenticated
  USING (is_active);

CREATE POLICY "Admins manage links"
  ON public.social_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER social_links_updated_at
  BEFORE UPDATE ON public.social_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();