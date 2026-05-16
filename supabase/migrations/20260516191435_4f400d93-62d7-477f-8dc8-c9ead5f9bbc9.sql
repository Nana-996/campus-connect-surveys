
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'paystack',
  reference text NOT NULL UNIQUE,
  amount_minor integer NOT NULL,             -- amount in kobo/pesewas (smallest unit)
  currency text NOT NULL DEFAULT 'GHS',
  credits integer NOT NULL,
  pack_label text,
  status text NOT NULL DEFAULT 'pending',    -- pending | success | failed | abandoned
  failure_reason text,
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_tx_user ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX idx_payment_tx_status ON public.payment_transactions(status);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tx: own or admin read"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies: only service-role (server) writes.

CREATE TRIGGER set_payment_tx_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
