import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EXPANSION_PRICE_GHS, EXPANSION_SLOTS } from "@/lib/university-slots";

/** Start a GHS purchase that adds 10 extra university picks to the caller's allowance. */
export const initializeUniversitySlotsCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { originUrl: string }) => {
    if (!/^https?:\/\//.test(data?.originUrl || "")) throw new Error("Invalid origin");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = (claims as { email?: string } | null)?.email;
    if (!email) throw new Error("No email on session");

    const reference = `up_${userId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const pricePesewas = EXPANSION_PRICE_GHS * 100;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertErr } = await supabaseAdmin.from("university_slot_purchases").insert({
      user_id: userId,
      slots: EXPANSION_SLOTS,
      price_ghs_pesewas: pricePesewas,
      paystack_reference: reference,
      status: "pending",
    });
    if (insertErr) throw new Error(`Could not record purchase: ${insertErr.message}`);

    const { initializeTransaction } = await import("@/lib/paystack.server");
    const result = await initializeTransaction({
      email,
      amountGhsPesewas: pricePesewas,
      reference,
      callbackUrl: `${data.originUrl}/create?slots_ref=${encodeURIComponent(reference)}`,
      metadata: { userId, slots: EXPANSION_SLOTS, kind: "university_slots" },
    });

    return { authorizationUrl: result.authorization_url, reference };
  });

/** Verify a slot purchase after redirect and grant the extra picks. Idempotent. */
export const verifyUniversitySlotsCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reference: string }) => {
    if (!data?.reference || typeof data.reference !== "string") throw new Error("reference required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: purchase, error } = await supabase
      .from("university_slot_purchases")
      .select("*")
      .eq("paystack_reference", data.reference)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!purchase) throw new Error("Purchase not found");
    if (purchase.user_id !== userId) throw new Error("Not your purchase");
    if (purchase.status === "granted") {
      return { status: "success" as const, slots: purchase.slots };
    }

    const { verifyTransaction } = await import("@/lib/paystack.server");
    const verified = await verifyTransaction(data.reference);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (verified.status !== "success") {
      await supabaseAdmin
        .from("university_slot_purchases")
        .update({ status: "failed", raw: verified as unknown as never })
        .eq("paystack_reference", data.reference);
      return { status: "failed" as const };
    }

    if (verified.amount < purchase.price_ghs_pesewas) {
      throw new Error("Verified amount below expected");
    }

    const { error: grantErr } = await supabaseAdmin.rpc("grant_university_slots", {
      _reference: data.reference,
      _raw: verified as unknown as never,
    });
    if (grantErr) throw new Error(grantErr.message);

    return { status: "success" as const, slots: purchase.slots };
  });
