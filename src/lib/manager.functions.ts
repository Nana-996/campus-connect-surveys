import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyManagerScope = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("university_domain, university_name").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const roleNames = (roles ?? []).map((r: any) => r.role);
    const isAdmin = roleNames.includes("admin");
    const isManager = roleNames.includes("manager");
    return {
      isAdmin,
      isManager,
      canAccess: isAdmin || isManager,
      university_domain: profile?.university_domain ?? null,
      university_name: profile?.university_name ?? null,
    };
  });

export const listUniversitySurveys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("list_university_surveys");
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string; title: string; creator_name: string;
      response_count: number; response_goal: number; is_active: boolean;
      created_at: string; expires_at: string | null;
    }>;
  });

export const getSurveyTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ surveyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("get_university_survey_tracking", { _survey_id: data.surveyId });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      student_id: string; full_name: string; index_number: string | null;
      department: string | null; year: string | null; responded_at: string | null;
    }>;
  });

export const updateMyStudentInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      index_number: z.string().trim().max(32).regex(/^[A-Za-z0-9/_-]{1,32}$/).optional().or(z.literal("")),
      department: z.string().trim().max(120).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_my_student_info", {
      _index_number: data.index_number ?? "",
      _department: data.department ?? "",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
