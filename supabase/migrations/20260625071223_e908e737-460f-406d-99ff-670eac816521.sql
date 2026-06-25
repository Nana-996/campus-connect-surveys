
-- 1. Normalize payment_transactions.status values and pin them with a check.
ALTER TABLE public.payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_status_check;
UPDATE public.payment_transactions SET status = 'paid'    WHERE status = 'success';
UPDATE public.payment_transactions SET status = 'pending' WHERE status NOT IN ('pending','paid','refunded','failed','abandoned');
ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_status_check
  CHECK (status IN ('pending','paid','refunded','failed','abandoned'));

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS refunded_credits int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 2. Idempotent refund function used by the webhook on adjustment.updated (refund approved).
CREATE OR REPLACE FUNCTION public.refund_purchased_credits(
  _reference text,
  _refund_reference text,
  _amount_minor int,
  _payload jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tx record;
BEGIN
  SELECT * INTO _tx
    FROM public.payment_transactions
    WHERE reference = _reference
    FOR UPDATE;
  IF NOT FOUND THEN
    -- Nothing to refund (transaction was never recorded).
    RETURN false;
  END IF;

  IF _tx.status = 'refunded' THEN
    RETURN false; -- already processed
  END IF;

  UPDATE public.profiles
    SET paid_credits = paid_credits - _tx.credits
    WHERE id = _tx.user_id;

  INSERT INTO public.credit_ledger(user_id, wallet, delta, reason)
    VALUES (_tx.user_id, 'paid', -_tx.credits,
            'refund_' || COALESCE(_tx.pack_label, 'unknown'));

  UPDATE public.payment_transactions
    SET status = 'refunded',
        refunded_credits = _tx.credits,
        refunded_at = now(),
        provider_payload = COALESCE(provider_payload, '{}'::jsonb)
                         || jsonb_build_object('refund', _payload,
                                               'refund_reference', _refund_reference,
                                               'refund_amount_minor', _amount_minor)
    WHERE reference = _reference;

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.refund_purchased_credits(text,text,int,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_purchased_credits(text,text,int,jsonb) TO service_role;

-- 3. Schedule the existing expire_earned_credits() function nightly via pg_cron.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-earned-credits-daily') THEN
    PERFORM cron.unschedule('expire-earned-credits-daily');
  END IF;
END$$;

SELECT cron.schedule(
  'expire-earned-credits-daily',
  '15 2 * * *', -- 02:15 UTC daily
  $$SELECT public.expire_earned_credits();$$
);
