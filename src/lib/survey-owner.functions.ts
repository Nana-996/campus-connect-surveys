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

    const [{ data: responses, error: responseError }, { data: visualizations, error: vizError }] = await Promise.all([
      supabaseAdmin
        .from("survey_responses")
        .select("id, survey_id, respondent_id, answers, created_at, duration_ms")
        .eq("survey_id", data.surveyId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("survey_visualizations")
        .select("question_id, chart_type")
        .eq("survey_id", data.surveyId),
    ]);
    if (responseError || vizError) throw new Error("Could not load survey responses");

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
    };
  });