import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const surveyIdSchema = z.object({ surveyId: z.string().uuid() });

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
      { data: responses, error: responseError },
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
        .from("survey_report_views")
        .select("id, survey_id, creator_id, name, config, created_at")
        .eq("survey_id", data.surveyId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("survey_share_tokens")
        .select("id, survey_id, creator_id, token, expires_at, revoked, created_at")
        .eq("survey_id", data.surveyId)
        .order("created_at", { ascending: false }),
    ]);
    if (responseError || vizError || savedViewsError || shareTokensError) throw new Error("Could not load survey responses");

    const respondentIds = Array.from(new Set((responses ?? []).map((r) => r.respondent_id)));
    const { data: profiles, error: profileError } = respondentIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, department, year, country, age_range, university_name")
          .in("id", respondentIds)
      : { data: [], error: null };
    if (profileError) throw new Error("Could not load response demographics");

    return {
      survey,
      responses: responses ?? [],
      profiles: (profiles ?? []).map((p) => ({ ...p, full_name: "" })),
      visualizations: visualizations ?? [],
      savedViews: savedViews ?? [],
      shareTokens: shareTokens ?? [],
    };
  });