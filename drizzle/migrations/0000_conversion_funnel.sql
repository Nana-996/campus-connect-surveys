ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_kind_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_kind_check CHECK (kind IN ('school','demo','study'));
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS sample_size text CHECK (sample_size IS NULL OR char_length(sample_size) <= 120);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_preference text CHECK (contact_preference IS NULL OR contact_preference IN ('email','whatsapp','phone'));

CREATE TABLE public.conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL CHECK (event IN ('buyer_cta_click','pricing_view','checkout_start','payment_success','boost_start','boost_success','lead_submit','upgrade_prompt_view')),
  user_id uuid,
  source text CHECK (source IS NULL OR char_length(source) <= 60),
  detail text CHECK (detail IS NULL OR char_length(detail) <= 60),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.conversion_events TO service_role;
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conversion events are server only" ON public.conversion_events FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX conversion_events_created_idx ON public.conversion_events (created_at DESC, event);