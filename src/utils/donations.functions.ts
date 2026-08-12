import { createServerFn } from "@tanstack/react-start";
import { isValidDonationAmount, type DonationFrequency } from "@/lib/donations";

type StartInput = {
  amountGhs: number;
  frequency: DonationFrequency;
  donorName: string;
  donorEmail: string;
  message?: string;
  originUrl: string;
};

/** Start a donation checkout. Open to signed-out supporters as well. */
export const startDonation = createServerFn({ method: "POST" })
  .inputValidator((data: StartInput) => {
    if (!isValidDonationAmount(Number(data?.amountGhs))) throw new Error("Enter an amount between GHS 1 and GHS 100,000");
    if (data.frequency !== "one_time" && data.frequency !== "monthly") throw new Error("Invalid frequency");
    const email = (data.donorEmail || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 255) throw new Error("Enter a valid email address");
    const name = (data.donorName || "").trim().slice(0, 100);
    const message = (data.message || "").trim().slice(0, 500);
    if (!/^https?:\/\//.test(data.originUrl || "")) throw new Error("Invalid origin");
    return { ...data, donorEmail: email, donorName: name, message, amountGhs: Number(data.amountGhs) };
  })
  .handler(async ({ data }) => {
    const amountPesewas = Math.round(data.amountGhs * 100);
    const reference = `don_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertErr } = await supabaseAdmin.from("donations").insert({
      donor_name: data.donorName,
      donor_email: data.donorEmail,
      amount_ghs_pesewas: amountPesewas,
      frequency: data.frequency,
      message: data.message || null,
      paystack_reference: reference,
      status: "pending",
    });
    if (insertErr) throw new Error(`Could not record donation: ${insertErr.message}`);

    const { initializeTransaction, getOrCreateMonthlyDonationPlan } = await import("@/lib/paystack.server");
    const planCode =
      data.frequency === "monthly" ? await getOrCreateMonthlyDonationPlan(amountPesewas) : undefined;

    const result = await initializeTransaction({
      email: data.donorEmail,
      amountGhsPesewas: amountPesewas,
      reference,
      callbackUrl: `${data.originUrl}/donate/thank-you?ref=${encodeURIComponent(reference)}`,
      metadata: { kind: "donation", frequency: data.frequency, donorName: data.donorName },
      ...(planCode ? { planCode } : {}),
    });

    return { authorizationUrl: result.authorization_url, reference };
  });

/**
 * Verify a donation after redirect, mark it paid and email the tax receipt.
 * Idempotent — safe to call repeatedly with the same reference.
 */
export const completeDonation = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string }) => {
    if (!data?.reference || typeof data.reference !== "string" || data.reference.length > 120) {
      throw new Error("reference required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: donation } = await supabaseAdmin
      .from("donations")
      .select("*")
      .eq("paystack_reference", data.reference)
      .maybeSingle();
    if (!donation) throw new Error("Donation not found");

    if (donation.status !== "success") {
      const { verifyTransaction } = await import("@/lib/paystack.server");
      const verified = await verifyTransaction(data.reference);
      if (verified.status !== "success") {
        await supabaseAdmin
          .from("donations")
          .update({ status: "failed", raw: verified as unknown as never })
          .eq("paystack_reference", data.reference);
        return { status: "failed" as const };
      }
      const { error: markErr } = await supabaseAdmin.rpc("mark_donation_paid", {
        _reference: data.reference,
        _raw: verified as unknown as never,
      });
      if (markErr) throw new Error(markErr.message);
    }

    const { data: paid } = await supabaseAdmin
      .from("donations")
      .select("*")
      .eq("paystack_reference", data.reference)
      .maybeSingle();
    if (!paid) throw new Error("Donation not found");

    const amountLabel = `GHS ${(paid.amount_ghs_pesewas / 100).toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    if (!paid.receipt_sent_at) {
      try {
        const { enqueueTemplateEmail } = await import("@/lib/email/enqueue.server");
        await enqueueTemplateEmail({
          templateName: "donation-receipt",
          recipientEmail: paid.donor_email,
          idempotencyKey: `donation-receipt-${paid.paystack_reference}`,
          templateData: {
            donorName: paid.donor_name || undefined,
            amount: amountLabel,
            frequency: paid.frequency === "monthly" ? "Monthly pledge" : "One-time gift",
            receiptNumber: paid.receipt_number ?? "",
            date: new Date(paid.paid_at ?? paid.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            reference: paid.paystack_reference,
          },
        });
        await supabaseAdmin
          .from("donations")
          .update({ receipt_sent_at: new Date().toISOString() })
          .eq("paystack_reference", data.reference);
      } catch (e) {
        console.error("donation receipt email failed:", e instanceof Error ? e.message : e);
      }
    }

    return {
      status: "success" as const,
      amountLabel,
      frequency: paid.frequency as DonationFrequency,
      receiptNumber: paid.receipt_number ?? "",
      donorName: paid.donor_name,
      donorEmail: paid.donor_email,
    };
  });
