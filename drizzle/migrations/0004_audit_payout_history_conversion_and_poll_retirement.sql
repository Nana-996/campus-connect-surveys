CREATE TABLE public.partner_payouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 partner_id uuid NOT NULL REFERENCES public.partners(id),
 milestone integer NOT NULL CHECK (milestone > 0),
 target_paying integer NOT NULL CHECK (target_paying > 0),
 paying_at_payout integer,
 reward_note text,
 paid_at timestamptz DEFAULT now(),
 recorded_by uuid,
 legacy boolean NOT NULL DEFAULT false,
 UNIQUE (partner_id, milestone)
);
GRANT ALL ON public.partner_payouts TO service_role;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payout history is service only" ON public.partner_payouts FOR ALL TO service_role USING (true) WITH CHECK (true);
INSERT INTO public.partner_payouts (partner_id, milestone, target_paying, reward_note, paid_at, legacy)
SELECT p.id, n, p.target_paying, p.reward_note, CASE WHEN n = p.milestones_paid THEN p.last_paid_at ELSE NULL END, true
FROM public.partners p CROSS JOIN LATERAL generate_series(1, p.milestones_paid) n;
CREATE OR REPLACE FUNCTION public.record_partner_payout(_partner_id uuid, _expected_paid integer, _actor uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.partners; paying integer;
BEGIN
 SELECT * INTO p FROM public.partners WHERE id = _partner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partner not found'; END IF;
 IF p.milestones_paid <> _expected_paid THEN RAISE EXCEPTION 'Payout already recorded or progress changed. Refresh before continuing.'; END IF;
 paying := (public.partner_stats(p.id)->>'paying')::integer;
 IF paying < (p.milestones_paid + 1) * p.target_paying THEN RAISE EXCEPTION 'The paying-customer milestone has not been reached'; END IF;
 INSERT INTO public.partner_payouts(partner_id, milestone, target_paying, paying_at_payout, reward_note, recorded_by)
 VALUES(p.id, p.milestones_paid + 1, p.target_paying, paying, p.reward_note, _actor);
 UPDATE public.partners SET milestones_paid = p.milestones_paid + 1, last_paid_at = now() WHERE id = p.id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_partner_payout(uuid, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_partner_payout(uuid, integer, uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.protect_paid_partner_target() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF OLD.milestones_paid > 0 AND NEW.target_paying <> OLD.target_paying THEN
 RAISE EXCEPTION 'A milestone target cannot change after a payout has been recorded';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER protect_paid_partner_target BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.protect_paid_partner_target();
CREATE OR REPLACE FUNCTION public.capture_purchase_conversion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE evt text; src text; ref text; confirmed boolean;
BEGIN
 IF TG_TABLE_NAME = 'paystack_purchases' THEN
  src := 'credits'; ref := NEW.reference;
  IF TG_OP = 'INSERT' THEN evt := 'checkout_start';
  ELSIF NEW.credited_at IS NOT NULL AND OLD.credited_at IS NULL THEN evt := 'payment_success'; END IF;
 ELSE
  src := 'research_boost'; ref := NEW.paystack_reference;
  IF TG_OP = 'INSERT' THEN evt := 'boost_start';
  ELSIF NEW.activated_at IS NOT NULL AND OLD.activated_at IS NULL THEN evt := 'boost_success'; END IF;
 END IF;
 IF evt IS NOT NULL THEN
  INSERT INTO public.conversion_events(event, user_id, source, detail) VALUES(evt, NEW.user_id, src, left(ref, 60));
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER capture_credit_conversion AFTER INSERT OR UPDATE ON public.paystack_purchases FOR EACH ROW EXECUTE FUNCTION public.capture_purchase_conversion();
CREATE TRIGGER capture_boost_conversion AFTER INSERT OR UPDATE ON public.research_boosts FOR EACH ROW EXECUTE FUNCTION public.capture_purchase_conversion();
CREATE OR REPLACE FUNCTION public.capture_lead_conversion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.conversion_events(event, source, detail) VALUES('lead_submit', 'enquiry', NEW.kind);
 RETURN NEW;
END;
$$;
CREATE TRIGGER capture_lead_conversion AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.capture_lead_conversion();
CREATE OR REPLACE FUNCTION public.conversion_summary() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
 SELECT event, count(*) AS total, count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS last_30_days
 FROM public.conversion_events GROUP BY event ORDER BY event
 ) x;
$$;
REVOKE ALL ON FUNCTION public.conversion_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.conversion_summary() TO service_role;
REVOKE ALL ON public.polls, public.poll_responses FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_poll_results(uuid) FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE public.polls IS 'DEPRECATED: Polls removed from CampusVerify; archived only, no application access.';
COMMENT ON TABLE public.poll_responses IS 'DEPRECATED: Polls removed from CampusVerify; archived only, no application access.';
COMMENT ON FUNCTION public.get_poll_results(uuid) IS 'DEPRECATED: Poll results disabled; no application access.';