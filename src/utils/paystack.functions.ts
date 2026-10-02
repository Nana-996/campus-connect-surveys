import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBundleByBundleId } from "@/lib/credit-bundles";
import { safeOrigin } from "@/lib/safe-origin";

export const getPaystackTestMode = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.PAYSTACK_SECRET_KEY || "";
  return { testMode: key.startsWith("sk_test_") };
});

/**
 * Initialize a Paystack transaction for a credit bundle purchase.
 * Uses the live USD→GHS rate + 5% buffer sent from the client (must be a positive number).
 * Records a pending row in paystack_purchases, returns an authorization_url to redirect to.
 */
export const initializePaystackCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bundleId: string; amountGhs: number; originUrl: string; promoCode?: string }) => {
    if (!data?.bundleId) throw new Error("bundleId required");
    if (!Number.isFinite(data.amountGhs) || data.amountGhs <= 0) throw new Error("Invalid GHS amount");
    if (data.amountGhs > 100000) throw new Error("Amount out of range");
    if (!/^https?:\/\//.test(data.originUrl || "")) throw new Error("Invalid origin");
    if (data.promoCode && !/^[A-Za-z0-9_-]{3,32}$/.test(data.promoCode.trim())) throw new Error("Invalid code");
    return data;
  })
  .handler(async ({ data, context }) => {
    const bundle = getBundleByBundleId(data.bundleId);
    if (!bundle || bundle.usdAmount <= 0) throw new Error("Unknown bundle");

    const { supabase, userId, claims } = context;

    // General users pay full price. Students from schools that are NOT onboarded pay half.
    // Students from onboarded schools get credits through their school and can't buy.
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", userId)
      .maybeSingle();
    let priceFactor = 1;
    if (profile?.user_type === "student") {
      const { data: onboarded } = await supabase.rpc("my_school_onboarded" as never);
      if (onboarded) throw new Error("Your school covers your credits — ask your school admin for a top-up.");
      priceFactor = 0.5;
    } else if (profile?.user_type !== "general") {
      throw new Error("Credit purchases are not available for this account");
    }
    const usdPrice = bundle.usdAmount * priceFactor;

    const email = (claims as { email?: string } | null)?.email;
    if (!email) throw new Error("No email on session");

    let serverRate = 0;
    try {
      const r = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      if (r.ok) serverRate = Number((await r.json())?.rates?.GHS) || 0;
    } catch { /* fall through */ }
    // The charged amount is always derived on the server (live rate + 5% buffer, matching
    // the displayed price). The client-supplied amount is never used for billing.
    const rateOk = serverRate > 5 && serverRate < 100;
    if (!rateOk) throw new Error("Pricing is temporarily unavailable — please try again shortly.");
    const serverAmountGhs = Math.round(usdPrice * serverRate * 1.05 * 100) / 100;

    const reference = `cv_${userId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let discount = 0;
    if (data.promoCode?.trim()) {
      const { data: pct, error: promoErr } = await supabaseAdmin.rpc("reserve_promo_discount" as never, {
        _code: data.promoCode.trim(),
        _user: userId,
        _reference: reference,
      } as never);
      if (promoErr) throw new Error(promoErr.message);
      discount = Number(pct) || 0;
    }
    const amountGhsPesewas = Math.max(100, Math.round(data.amountGhs * (1 - discount / 100) * 100));

    const { error: insertErr } = await supabaseAdmin.from("paystack_purchases").insert({
      user_id: userId,
      reference,
      bundle_id: bundle.id,
      credits: bundle.credits,
      amount_usd: usdPrice,
      amount_ghs_kobo: amountGhsPesewas,
      status: "pending",
    });
    if (insertErr) throw new Error(`Could not record purchase: ${insertErr.message}`);

    const { initializeTransaction } = await import("@/lib/paystack.server");
    const result = await initializeTransaction({
      email,
      amountGhsPesewas,
      reference,
      callbackUrl: `${safeOrigin(data.originUrl)}/buy-credits?paystack_ref=${encodeURIComponent(reference)}`,
      metadata: { userId, bundleId: bundle.id, credits: bundle.credits, discount },
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
      _raw: verified as unknown as never,
    });
    if (creditErr) throw new Error(creditErr.message);

    return { status: "success" as const, credits: purchase.credits };
  });
