import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBundleByBundleId } from "@/lib/credit-bundles";

/**
 * Initialize a Paystack transaction for a credit bundle purchase.
 * Uses the live USD→GHS rate + 5% buffer sent from the client (must be a positive number).
 * Records a pending row in paystack_purchases, returns an authorization_url to redirect to.
 */
export const initializePaystackCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bundleId: string; amountGhs: number; originUrl: string }) => {
    if (!data?.bundleId) throw new Error("bundleId required");
    if (!Number.isFinite(data.amountGhs) || data.amountGhs <= 0) throw new Error("Invalid GHS amount");
    if (data.amountGhs > 100000) throw new Error("Amount out of range");
    if (!/^https?:\/\//.test(data.originUrl || "")) throw new Error("Invalid origin");
    return data;
  })
  .handler(async ({ data, context }) => {
    const bundle = getBundleByBundleId(data.bundleId);
    if (!bundle || bundle.usdAmount <= 0) throw new Error("Unknown bundle");

    const { supabase, userId, claims } = context;

    // Ensure this is a general user — students earn credits, they don't buy.
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.user_type !== "general") throw new Error("Credit purchases are only available for general users");

    const email = (claims as { email?: string } | null)?.email;
    if (!email) throw new Error("No email on session");

    // Re-derive GHS server-side upper bound so a malicious client can't underpay too badly.
    // We accept the client's rate but cap deviation to +/-30% vs a floor of 10 GHS/USD.
    const minAcceptableGhs = bundle.usdAmount * 10 * 1.0;
    if (data.amountGhs < minAcceptableGhs * 0.7) throw new Error("Amount below acceptable range");

    const amountGhsPesewas = Math.round(data.amountGhs * 100);
    const reference = `cv_${userId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertErr } = await supabaseAdmin.from("paystack_purchases").insert({
      user_id: userId,
      reference,
      bundle_id: bundle.id,
      credits: bundle.credits,
      amount_usd: bundle.usdAmount,
      amount_ghs_kobo: amountGhsPesewas,
      status: "pending",
    });
    if (insertErr) throw new Error(`Could not record purchase: ${insertErr.message}`);

    const { initializeTransaction } = await import("@/lib/paystack.server");
    const result = await initializeTransaction({
      email,
      amountGhsPesewas,
      reference,
      callbackUrl: `${data.originUrl}/buy-credits?paystack_ref=${encodeURIComponent(reference)}`,
      metadata: { userId, bundleId: bundle.id, credits: bundle.credits },
    });

    return { authorizationUrl: result.authorization_url, reference };
  });

/**
 * Verify a Paystack transaction after redirect back and credit the user's balance.
 * Idempotent — safe to call multiple times.
 */
export const verifyPaystackCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reference: string }) => {
    if (!data?.reference || typeof data.reference !== "string") throw new Error("reference required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: purchase, error } = await supabase
      .from("paystack_purchases")
      .select("*")
      .eq("reference", data.reference)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!purchase) throw new Error("Purchase not found");
    if (purchase.user_id !== userId) throw new Error("Not your purchase");
    if (purchase.status === "success") {
      return { status: "success" as const, credits: purchase.credits };
    }

    const { verifyTransaction } = await import("@/lib/paystack.server");
    const verified = await verifyTransaction(data.reference);

    if (verified.status !== "success") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("paystack_purchases")
        .update({ status: "failed", raw: verified as unknown as never })
        .eq("reference", data.reference);
      return { status: "failed" as const };
    }

    // Sanity check amount matches what we recorded.
    if (verified.amount < purchase.amount_ghs_kobo) {
      throw new Error("Verified amount below expected");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: creditErr } = await supabaseAdmin.rpc("credit_paystack_purchase", {
      _reference: data.reference,
      _raw: verified as unknown as Record<string, unknown>,
    });
    if (creditErr) throw new Error(creditErr.message);

    return { status: "success" as const, credits: purchase.credits };
  });
