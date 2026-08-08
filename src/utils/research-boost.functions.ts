import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBoostTier } from "@/lib/research-boost";

/**
 * Start a Research Boost purchase for an already-created (unpublished) survey.
 * The survey must belong to the caller and be on the `research_boost` tier.
 */
export const initializeResearchBoostCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { surveyId: string; boostTier: string; originUrl: string }) => {
    if (!data?.surveyId) throw new Error("surveyId required");
    if (!data?.boostTier) throw new Error("boostTier required");
    if (!/^https?:\/\//.test(data.originUrl || "")) throw new Error("Invalid origin");
    return data;
  })
  .handler(async ({ data, context }) => {
    const tier = getBoostTier(data.boostTier);
    if (!tier) throw new Error("Unknown boost");

    const { supabase, userId, claims } = context;

    const { data: survey, error: surveyErr } = await supabase
      .from("surveys")
      .select("id, creator_id, tier, is_active, target_department, target_year, target_country, target_age_range, target_interests, required_criteria, university_domain")
      .eq("id", data.surveyId)
      .maybeSingle();
    if (surveyErr) throw new Error(surveyErr.message);
    if (!survey) throw new Error("Survey not found");
    if (survey.creator_id !== userId) throw new Error("Not your survey");
    if (survey.tier !== "research_boost") throw new Error("This survey is not a Research Boost survey");
    if (survey.is_active) throw new Error("This survey is already live");

    const email = (claims as { email?: string } | null)?.email;
    if (!email) throw new Error("No email on session");

    const reference = `rb_${userId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const pricePesewas = tier.priceGhs * 100;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertErr } = await supabaseAdmin.from("research_boosts").insert({
      user_id: userId,
      survey_id: survey.id,
      boost_tier: tier.id,
      target_responses: tier.responses,
      price_ghs_pesewas: pricePesewas,
      paystack_reference: reference,
      status: "pending",
      targeting: {
        university_domain: survey.university_domain,
        department: survey.target_department,
        year: survey.target_year,
        country: survey.target_country,
        age_range: survey.target_age_range,
        interests: survey.target_interests,
        required: survey.required_criteria,
      },
    });
    if (insertErr) throw new Error(`Could not record boost: ${insertErr.message}`);

    const { initializeTransaction } = await import("@/lib/paystack.server");
    const result = await initializeTransaction({
      email,
      amountGhsPesewas: pricePesewas,
      reference,
      callbackUrl: `${data.originUrl}/create?boost_ref=${encodeURIComponent(reference)}`,
      metadata: { userId, surveyId: survey.id, boostTier: tier.id, responses: tier.responses },
    });

    return { authorizationUrl: result.authorization_url, reference };
  });

/** Verify a Research Boost payment after redirect and activate the survey. Idempotent. */
export const verifyResearchBoostCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reference: string }) => {
    if (!data?.reference || typeof data.reference !== "string") throw new Error("reference required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: boost, error } = await supabase
      .from("research_boosts")
      .select("*")
      .eq("paystack_reference", data.reference)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!boost) throw new Error("Boost not found");
    if (boost.user_id !== userId) throw new Error("Not your boost");
    if (boost.status === "active" || boost.status === "completed") {
      return { status: "success" as const, surveyId: boost.survey_id, responses: boost.target_responses };
    }

    const { verifyTransaction } = await import("@/lib/paystack.server");
    const verified = await verifyTransaction(data.reference);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (verified.status !== "success") {
      await supabaseAdmin
        .from("research_boosts")
        .update({ status: "failed", raw: verified as unknown as never })
        .eq("paystack_reference", data.reference);
      return { status: "failed" as const };
    }

    if (verified.amount < boost.price_ghs_pesewas) {
      throw new Error("Verified amount below expected");
    }

    const { error: activateErr } = await supabaseAdmin.rpc("activate_research_boost", {
      _reference: data.reference,
      _raw: verified as unknown as never,
    });
    if (activateErr) throw new Error(activateErr.message);

    return { status: "success" as const, surveyId: boost.survey_id, responses: boost.target_responses };
  });
