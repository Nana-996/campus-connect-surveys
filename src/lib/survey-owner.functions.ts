import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const surveyIdSchema = z.object({ surveyId: z.string().uuid() });

// Stable opaque pseudonym per (survey, respondent). Owners see a UUID-shaped
// token they can use as a grouping key, but it cannot be linked back to a
// real user account.
function pseudonymize(surveyId: string, respondentId: string): string {
  const h = createHash("sha256").update(`${surveyId}:${respondentId}`).digest("hex");
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join("-");
}

export const getOwnerSurveyResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => surveyIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: survey, error: surveyError } = await supabaseAdmin
      .from("surveys")
      .select(
        "id, creator_id, title, description, questions, response_count, response_goal, expires_at, created_at, tier, university_domain, target_department, target_year, is_active",
      )
      .eq("id", data.surveyId)
      .maybeSingle();
    if (surveyError) throw new Error("Could not load survey results");
    if (!survey || survey.creator_id !== context.userId) {
      return { survey: null, responses: [], profiles: [], visualizations: [] };
    }

    const [
      { data: rawResponses, error: responseError },
      { data: visualizations, error: vizError },
      { data: savedViews, error: savedViewsError },
      { data: shareTokens, error: shareTokensError },
    ] = await Promise.all([
      supabaseAdmin
        .from("survey_responses")
        .select("id, survey_id, respondent_id, answers, created_at, duration_ms")
        .eq("survey_id", data.surveyId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("survey_visualizations")
        .select("question_id, chart_type")
        .eq("survey_id", data.surveyId),
      supabaseAdmin
        .from("survey_report_views" as any)
        .select("id, survey_id, creator_id, name, config, created_at")
        .eq("survey_id", data.surveyId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("survey_share_tokens" as any)
        .select("id, survey_id, creator_id, token, expires_at, revoked, created_at")
        .eq("survey_id", data.surveyId)
        .order("created_at", { ascending: false }),
    ]);
    if (responseError || vizError || savedViewsError || shareTokensError) throw new Error("Could not load survey responses");

    // Map real respondent_id -> opaque pseudonym before anything leaves the server.
    // This prevents survey creators from correlating a real user UUID with
    // their exact answers, while keeping a stable grouping key for analytics.
    const realToPseudo = new Map<string, string>();
    for (const r of rawResponses ?? []) {
      if (!realToPseudo.has(r.respondent_id)) {
        realToPseudo.set(r.respondent_id, pseudonymize(data.surveyId, r.respondent_id));
      }
    }
    const responses = (rawResponses ?? []).map((r) => ({
      id: r.id,
      survey_id: r.survey_id,
      respondent_id: realToPseudo.get(r.respondent_id)!,
      answers: r.answers,
      created_at: r.created_at,
      duration_ms: r.duration_ms,
    }));

    const respondentIds = Array.from(realToPseudo.keys());
    const { data: rawProfiles, error: profileError } = respondentIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, department, year, country, age_range, university_name")
          .in("id", respondentIds)
      : { data: [], error: null };
    if (profileError) throw new Error("Could not load response demographics");

    // Re-key profile rows by the same pseudonym so analyze/report UIs keep
    // working without changes.
    const profiles = (rawProfiles ?? []).map((p) => ({
      ...p,
      id: realToPseudo.get(p.id) ?? p.id,
      full_name: "",
    }));

    return {
      survey,
      responses,
      profiles,
      visualizations: visualizations ?? [],
      savedViews: savedViews ?? [],
      shareTokens: shareTokens ?? [],
    };
  });
