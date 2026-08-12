CREATE TABLE public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_name text NOT NULL DEFAULT '',
  donor_email text NOT NULL,
  amount_ghs_pesewas bigint NOT NULL CHECK (amount_ghs_pesewas >= 100),
  frequency text NOT NULL DEFAULT 'one_time' CHECK (frequency IN ('one_time','monthly')),
  message text,
  paystack_reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  receipt_number text UNIQUE,
  receipt_sent_at timestamptz,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

GRANT SELECT ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donors can view their own donations"
ON public.donations FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_donations_updated_at
BEFORE UPDATE ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_donations_reference ON public.donations (paystack_reference);
CREATE INDEX idx_donations_email ON public.donations (donor_email);

CREATE SEQUENCE IF NOT EXISTS public.donation_receipt_seq START 1001;
REVOKE ALL ON SEQUENCE public.donation_receipt_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.donation_receipt_seq TO service_role;

CREATE OR REPLACE FUNCTION public.mark_donation_paid(_reference text, _raw jsonb)
RETURNS public.donations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  d public.donations;
BEGIN
  SELECT * INTO d FROM public.donations WHERE paystack_reference = _reference FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown donation reference %', _reference;
  END IF;

  IF d.status = 'success' THEN
    RETURN d;
  END IF;

  UPDATE public.donations
  SET status = 'success',
      paid_at = now(),
      raw = _raw,
      receipt_number = COALESCE(receipt_number, 'CV-' || to_char(now(), 'YYYY') || '-' || nextval('public.donation_receipt_seq')::text)
  WHERE id = d.id
  RETURNING * INTO d;

  RETURN d;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_donation_paid(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_donation_paid(text, jsonb) TO service_role;