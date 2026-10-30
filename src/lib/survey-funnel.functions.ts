import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAppOwnerClaims } from "@/lib/app-owner";
import type { SurveyFunnelSummary } from "./survey-funnel";

// Caller-reported interactions are not claims of successful responses.
export const recordSurveyFunnel = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ surveyId: z.string().uuid(), token: z.string().uuid(), stage: z.enum(["started", "signup"]) }).parse(input))
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new Error("Invalid request origin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("record_survey_funnel", { _survey_id: data.surveyId, _token: data.token, _stage: data.stage });
    if (error) throw new Error("Could not record survey progress");
    return { ok: true };
  });

export const getSurveyFunnel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90), z.literal(0)]) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!isAppOwnerClaims(context.claims as Record<string, unknown>)) throw new Error("Forbidden: app owner only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: summary, error } = await supabaseAdmin.rpc("survey_funnel_summary", { _days: data.days });
    if (error) throw new Error("Could not load survey completion");
    return summary as unknown as SurveyFunnelSummary;
  });