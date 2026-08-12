import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Paystack webhook — defense-in-depth backup to the redirect-based verify flow.
 * Paystack signs the raw body with HMAC-SHA512 using the secret key.
 * See: https://paystack.com/docs/payments/webhooks/
 */
export const Route = createFileRoute("/api/public/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Not configured", { status: 500 });

        const signature = request.headers.get("x-paystack-signature") ?? "";
        const body = await request.text();

        const expected = createHmac("sha512", secret).update(body).digest("hex");
        try {
          const a = Buffer.from(signature, "hex");
          const b = Buffer.from(expected, "hex");
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
        } catch {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: { event?: string; data?: { reference?: string; status?: string } };
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        if (event.event === "charge.success" && event.data?.reference && event.data.status === "success") {
          const reference = event.data.reference;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const rpc: [string, Record<string, unknown>] = reference.startsWith("rb_")
            ? ["activate_research_boost", { _reference: reference, _raw: event.data as never }]
            : reference.startsWith("up_")
              ? ["grant_university_slots", { _reference: reference, _raw: event.data as never }]
              : reference.startsWith("don_")
                ? ["mark_donation_paid", { _reference: reference, _raw: event.data as never }]
                : ["credit_paystack_purchase", { _reference: reference, _raw: event.data as never }];

          const { error } = await supabaseAdmin.rpc(rpc[0] as never, rpc[1] as never);
          if (error) {
            // Unknown-reference errors are non-fatal — they mean this event isn't ours.
            console.warn("paystack webhook credit error:", error.message);
          }
        }


        return Response.json({ received: true });
      },
    },
  },
});
