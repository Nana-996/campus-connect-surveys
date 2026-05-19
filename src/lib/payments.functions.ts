import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PAYSTACK_BASE = "https://api.paystack.co";

// Server-side source of truth for pack pricing (GHS, in pesewas = amount * 100).
// Student prices; general users pay 1.5× (rounded to nearest cedi).
const PACKS: Record<string, { credits: number; amount_minor: number; label: string }> = {
  starter: { credits: 20, amount_minor: 2000, label: "Starter" },       // GHS 20.00
  researcher: { credits: 50, amount_minor: 3500, label: "Researcher" }, // GHS 35.00
  lab: { credits: 200, amount_minor: 10000, label: "Lab" },             // GHS 100.00
};

const GENERAL_MULT = 1.5;
function priceFor(pack: { credits: number; amount_minor: number; label: string }, userType: string) {
  if (userType !== "general") return pack;
  // Round to nearest 100 pesewas (1 GHS) to keep clean prices.
  const scaled = Math.round((pack.amount_minor * GENERAL_MULT) / 100) * 100;
  return { ...pack, amount_minor: scaled };
}


export const initializePaystackPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      pack: z.enum(["starter", "researcher", "lab"]),
      callback_url: z.string().url(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Payments not configured — missing PAYSTACK_SECRET_KEY");

    const { userId } = context;

    // Fetch user email + user_type to apply the right pricing
    const { data: userRow, error: uErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (uErr || !userRow?.user?.email) throw new Error("Could not read user email");
    const { data: profileRow } = await supabaseAdmin
      .from("profiles").select("user_type").eq("id", userId).maybeSingle();
    const pack = priceFor(PACKS[data.pack], profileRow?.user_type ?? "student");

    const reference = `cv_${userId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;


    // Pre-create the transaction row as pending
    const { error: insErr } = await supabaseAdmin.from("payment_transactions").insert({
      user_id: userId,
      reference,
      amount_minor: pack.amount_minor,
      currency: "GHS",
      credits: pack.credits,
      pack_label: pack.label,
      status: "pending",
    });
    if (insErr) throw new Error(`Could not record transaction: ${insErr.message}`);

    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userRow.user.email,
        amount: pack.amount_minor,
        currency: "GHS",
        reference,
        callback_url: data.callback_url,
        channels: ["card", "mobile_money", "bank", "bank_transfer", "ussd"],
        metadata: {
          user_id: userId,
          credits: pack.credits,
          pack: data.pack,
        },
      }),
    });

    const payload = await res.json();
    if (!res.ok || !payload?.status) {
      await supabaseAdmin.from("payment_transactions")
        .update({ status: "failed", failure_reason: payload?.message ?? "init_failed" })
        .eq("reference", reference);
      throw new Error(payload?.message ?? "Paystack initialization failed");
    }

    return {
      reference,
      authorization_url: payload.data.authorization_url as string,
      access_code: payload.data.access_code as string,
    };
  });

export const verifyPaystackPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reference: z.string().min(4).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Payments not configured");

    // Find local tx
    const { data: tx, error: txErr } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("reference", data.reference)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (txErr) throw new Error(txErr.message);
    if (!tx) throw new Error("Transaction not found");

    // Short-circuit: already credited
    if (tx.status === "success") return { status: "success", credits: tx.credits };

    const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(data.reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const payload = await res.json();
    if (!res.ok || !payload?.status) {
      return { status: tx.status, credits: 0 };
    }

    const psStatus: string = payload.data?.status;
    const psAmount: number = payload.data?.amount;

    if (psStatus === "success" && psAmount === tx.amount_minor) {
      await creditUserAndMarkSuccess(tx.id, tx.user_id, tx.credits, tx.amount_minor, payload.data);
      return { status: "success", credits: tx.credits };
    }
    if (psStatus === "failed" || psStatus === "abandoned") {
      await supabaseAdmin.from("payment_transactions")
        .update({ status: psStatus, failure_reason: payload.data?.gateway_response ?? psStatus, provider_payload: payload.data })
        .eq("id", tx.id);
      return { status: psStatus, credits: 0 };
    }
    return { status: "pending", credits: 0 };
  });

// Shared helper used by both verify + webhook. Idempotent.
export async function creditUserAndMarkSuccess(
  txId: string,
  userId: string,
  credits: number,
  expectedAmountMinor: number,
  providerPayload: unknown,
) {
  // Atomic guard: only flip pending -> success once
  const { data: updated, error } = await supabaseAdmin
    .from("payment_transactions")
    .update({
      status: "success",
      credited_at: new Date().toISOString(),
      provider_payload: providerPayload as any,
    })
    .eq("id", txId)
    .eq("status", "pending")
    .eq("amount_minor", expectedAmountMinor)
    .select("id, user_id, credits")
    .maybeSingle();

  if (error) throw error;
  if (!updated) return; // already credited by another path

  // Bump paid_credits + ledger
  const { data: prof } = await supabaseAdmin
    .from("profiles").select("paid_credits").eq("id", userId).single();
  await supabaseAdmin.from("profiles")
    .update({ paid_credits: (prof?.paid_credits ?? 0) + credits })
    .eq("id", userId);
  await supabaseAdmin.from("credit_ledger").insert({
    user_id: userId,
    wallet: "paid",
    delta: credits,
    reason: `paystack_purchase_${txId}`,
  });
}
