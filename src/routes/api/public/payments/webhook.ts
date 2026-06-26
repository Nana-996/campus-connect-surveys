import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";
import { getBundleByPriceId, CREDIT_BUNDLES } from "@/lib/credit-bundles";

/* eslint-disable @typescript-eslint/no-explicit-any */

function resolveBundle(data: any) {
  // Prefer the bundleId we passed in customData at checkout — most reliable
  // because transaction events don't always include `price.importMeta`.
  const bundleId = data.customData?.bundleId as string | undefined;
  if (bundleId) {
    const direct = CREDIT_BUNDLES.find((b) => b.id === bundleId);
    if (direct) return direct;
  }
  const item = data.items?.[0];
  const priceExternalId = item?.price?.importMeta?.externalId as string | undefined;
  if (priceExternalId) {
    return getBundleByPriceId(priceExternalId);
  }
  return undefined;
}

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const userId = data.customData?.userId as string | undefined;
  if (!userId) {
    console.error("payments-webhook: missing customData.userId on transaction", data.id);
    return;
  }
  const bundle = resolveBundle(data);
  if (!bundle) {
    console.warn("payments-webhook: unknown bundle for transaction", data.id);
    return;
  }

  const amountMinor = Number(data.details?.totals?.total ?? data.payments?.[0]?.amount ?? 0);
  const currency = (data.currencyCode as string) || "USD";

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("grant_purchased_credits", {
    _user_id: userId,
    _credits: bundle.credits,
    _reference: `paddle:${env}:${data.id}`,
    _amount_minor: amountMinor,
    _currency: currency,
    _pack_label: bundle.id,
    _payload: { paddle_transaction_id: data.id, env, bundle: bundle.id },
  } as never);
  if (error) {
    console.error("payments-webhook: grant_purchased_credits failed", error);
    throw error;
  }
}

async function handleAdjustment(data: any, env: PaddleEnv) {
  // Adjustments cover refunds (and chargebacks). Only act on approved refunds.
  const action = (data.action as string | undefined) ?? "";
  const status = (data.status as string | undefined) ?? "";
  if (action !== "refund" && action !== "chargeback") return;
  if (status && status !== "approved") return; // wait for the approved update

  const txId = data.transactionId as string | undefined;
  if (!txId) {
    console.warn("payments-webhook: adjustment missing transactionId", data.id);
    return;
  }
  const amountMinor = Number(data.totals?.total ?? 0);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("refund_purchased_credits", {
    _reference: `paddle:${env}:${txId}`,
    _refund_reference: `paddle:adj:${env}:${data.id}`,
    _amount_minor: amountMinor,
    _payload: { adjustment_id: data.id, action, status, env },
  } as never);
  if (error) {
    console.error("payments-webhook: refund_purchased_credits failed", error);
    throw error;
  }
}

async function handlePaymentFailed(data: any, env: PaddleEnv) {
  // Record the failure but don't grant credits.
  const userId = data.customData?.userId as string | undefined;
  if (!userId) return;
  const bundle = resolveBundle(data);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("payment_transactions")
    .upsert(
      {
        user_id: userId,
        provider: "paddle",
        reference: `paddle:${env}:${data.id}`,
        amount_minor: Number(data.details?.totals?.total ?? 0),
        currency: (data.currencyCode as string) || "USD",
        credits: bundle?.credits ?? 0,
        pack_label: bundle?.id ?? null,
        status: "failed",
        failure_reason: "payment_failed",
        provider_payload: { paddle_transaction_id: data.id, env },
      } as never,
      { onConflict: "reference" } as never,
    );
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.eventType) {
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(event.data as any, env);
      break;
    case EventName.TransactionPaymentFailed:
      await handlePaymentFailed(event.data as any, env);
      break;
    case "adjustment.created" as EventName:
    case "adjustment.updated" as EventName:
      await handleAdjustment(event.data as any, env);
      break;
    default:
      console.log("payments-webhook: unhandled event", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Resolve env from a server-side variable only. Never trust URL params:
        // a caller-controlled env would let anyone with the sandbox secret mint
        // valid sandbox webhooks against a production deployment.
        const raw = (process.env.PADDLE_ENV || "sandbox").toLowerCase();
        const env: PaddleEnv = raw === "live" ? "live" : "sandbox";
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("payments-webhook: error", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});

