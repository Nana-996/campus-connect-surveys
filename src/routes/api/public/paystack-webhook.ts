import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { creditUserAndMarkSuccess } from "@/lib/payments.functions";

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("not configured", { status: 503 });

        const body = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(body).digest("hex");

        const sigBuf = Buffer.from(signature, "hex");
        const expBuf = Buffer.from(expected, "hex");
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return new Response("invalid signature", { status: 401 });
        }

        let event: any;
        try { event = JSON.parse(body); } catch { return new Response("bad json", { status: 400 }); }

        const reference: string | undefined = event?.data?.reference;
        if (!reference) return new Response("missing reference", { status: 400 });

        const { data: tx } = await supabaseAdmin
          .from("payment_transactions")
          .select("id, user_id, credits, amount_minor, status")
          .eq("reference", reference)
          .maybeSingle();
        if (!tx) return new Response("unknown reference", { status: 200 }); // ack, nothing to do

        if (event.event === "charge.success") {
          if (event.data?.amount !== tx.amount_minor) {
            await supabaseAdmin.from("payment_transactions")
              .update({ status: "failed", failure_reason: "amount_mismatch", provider_payload: event.data })
              .eq("id", tx.id);
            return new Response("ok", { status: 200 });
          }
          await creditUserAndMarkSuccess(tx.id, tx.user_id, tx.credits, tx.amount_minor, event.data);
        } else if (event.event === "charge.failed") {
          await supabaseAdmin.from("payment_transactions")
            .update({
              status: "failed",
              failure_reason: event.data?.gateway_response ?? "charge_failed",
              provider_payload: event.data,
            })
            .eq("id", tx.id)
            .eq("status", "pending");
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
