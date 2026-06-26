import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function fail(e: any, label: string): never {
  console.error(`[manager:${label}]`, e);
  throw new Error("Operation failed");
}

export const getMyManagerScope = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_my_manager_scope" as any);
    if (error) fail(error, "get_my_manager_scope");
    return data as {
      isAdmin: boolean;
      isManager: boolean;
      hasTrackingGrant: boolean;
      canAccess: boolean;
      university_domain: string | null;
      university_name: string | null;
    };
  });

export const getSurveyTrackingScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ surveyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: scope, error } = await context.supabase.rpc("get_survey_tracking_scope" as any, {
      _survey_id: data.surveyId,
    });
    if (error) fail(error, "get_survey_tracking_scope");
    return scope as {
      surveyId: string;
      title: string;
      creatorName: string;
      universityDomain: string;
      responseCount: number;
      responseGoal: number;
      isAdmin: boolean;
      isManager: boolean;
      hasTrackingGrant: boolean;
      canTrack: boolean;
      canSeeAnswers: boolean;
    };
  });

export const listUniversitySurveys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("list_university_surveys");
    if (error) fail(error, "list_university_surveys");
    return (data ?? []) as Array<{
      id: string;
      title: string;
      creator_name: string;
      response_count: number;
      response_goal: number;
      is_active: boolean;
      created_at: string;
      expires_at: string | null;
    }>;
  });

export const getSurveyTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ surveyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("get_university_survey_tracking", {
      _survey_id: data.surveyId,
    });
    if (error) fail(error, "get_survey_tracking");
    return (rows ?? []) as Array<{
      student_id: string;
      full_name: string;
      index_number: string | null;
      department: string | null;
      year: string | null;
      responded_at: string | null;
    }>;
  });

export const getSurveyResponsesForManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ surveyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("get_survey_responses_for_manager", {
      _survey_id: data.surveyId,
    });
    if (error) fail(error, "get_survey_responses_for_manager");
    return (rows ?? []) as Array<{
      response_id: string;
      created_at: string;
      duration_ms: number | null;
      quality_score: number | null;
      answers: Record<string, string>;
      is_identified: boolean;
      respondent_label: string;
      full_name: string | null;
      index_number: string | null;
      department: string | null;
      year: string | null;
      user_type: string | null;
    }>;
  });

export const getSurveyQuestionsForManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ surveyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc(
      "get_survey_questions_for_tracker" as any,
      {
        _survey_id: data.surveyId,
      },
    );
    if (error) fail(error, "get_survey_questions_for_manager");
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row as {
      id: string;
      title: string;
      questions: Array<{ id: string; text: string; type: string; options?: string[] }>;
    } | null;
  });

export const updateMyStudentInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        index_number: z
          .string()
          .trim()
          .max(32)
          .regex(/^[A-Za-z0-9/_-]{1,32}$/)
          .optional()
          .or(z.literal("")),
        department: z.string().trim().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_my_student_info", {
      _index_number: data.index_number ?? "",
      _department: data.department ?? "",
    });
    if (error) {
      // Preserve user-actionable validation messages from the RPC (e.g. "index already registered").
      const msg = error.message || "";
      const safe = /already registered|Invalid index number|Not authenticated/i.test(msg)
        ? msg
        : "Could not save your info";
      console.error("[manager:update_my_student_info]", error);
      throw new Error(safe);
    }
    return { ok: true };
  });
