import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";
import { getBundleByPriceId } from "@/lib/credit-bundles";

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const userId = data.customData?.userId as string | undefined;
  if (!userId) {
    console.error("payments-webhook: missing customData.userId on transaction", data.id);
    return;
  }
  const item = data.items?.[0];
  const priceExternalId = item?.price?.importMeta?.externalId as string | undefined;
  if (!priceExternalId) {
    console.warn("payments-webhook: missing importMeta.externalId on item", item?.price?.id);
    return;
  }
  const bundle = getBundleByPriceId(priceExternalId);
  if (!bundle) {
    console.warn("payments-webhook: unknown bundle priceId", priceExternalId);
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
    _payload: { paddle_transaction_id: data.id, env, price_id: priceExternalId },
  } as never);

  if (error) {
    console.error("payments-webhook: grant_purchased_credits failed", error);
    throw error;
  }
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.eventType) {
    case EventName.TransactionCompleted:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handleTransactionCompleted(event.data as any, env);
      break;
    default:
      console.log("payments-webhook: unhandled event", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
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
