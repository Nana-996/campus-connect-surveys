import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SchoolAdminOverview = {
  isSchoolAdmin: boolean;
  school?: { name: string; domain: string; status: string; validUntil: string | null; joinSlug: string };
  students?: Array<{ id: string; full_name: string; department: string | null; year: string | null; index_number: string | null; created_at: string; graduation_date: string | null; is_flagged: boolean }>;
  surveys?: Array<{ id: string; title: string; response_count: number; response_goal: number; is_active: boolean; expires_at: string; created_at: string; target_department: string | null }>;
  departments?: Array<{ department: string; count: number }>;
};

export const getMySchoolAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.rpc("claim_school_admin" as any);
    const { data, error } = await context.supabase.rpc("get_my_school_admin_overview" as any);
    if (error) {
      console.error("[school-admin]", error);
      throw new Error("Could not load school data");
    }
    const overview = data as SchoolAdminOverview;
    if (!overview.isSchoolAdmin || !overview.school) return overview;
    const { data: schoolRow, error: schoolError } = await context.supabase
      .from("schools")
      .select("join_slug")
      .eq("domain", overview.school.domain)
      .maybeSingle();
    if (schoolError || !schoolRow?.join_slug) {
      console.error("[school-admin] join link", schoolError);
      throw new Error("Could not load the school joining link");
    }
    return { ...overview, school: { ...overview.school, joinSlug: schoolRow.join_slug } };
  });

export type SchoolTrackingAdminData = {
  canManage: boolean;
  schoolName?: string;
  departments: string[];
  surveys: Array<{
    id: string;
    title: string;
    responseCount: number;
    responseGoal: number;
    isActive: boolean;
    expiresAt: string;
    targetDepartment: string | null;
  }>;
  grants: Array<{
    id: string;
    surveyId: string;
    surveyTitle: string;
    recipientEmail: string;
    scope: "department" | "university";
    department: string | null;
    createdAt: string;
  }>;
};

function trackingError(error: { message?: string } | null, fallback: string): never {
  const message = error?.message ?? "";
  const safe = /active school partnership|not linked to your school|registered account|confirm their email|email from your school|profile for your school|choose a department|grant not found/i.test(message)
    ? message
    : fallback;
  console.error("[school-tracking]", error);
  throw new Error(safe);
}

export const getSchoolTrackingAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("school_admin_tracking_overview" as any);
    if (error) trackingError(error, "Could not load survey tracking");
    return data as SchoolTrackingAdminData;
  });

export const grantSchoolSurveyTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    surveyId: z.string().uuid(),
    recipientEmail: z.string().trim().email(),
    scope: z.enum(["department", "university"]),
    department: z.string().trim().max(120).nullable().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: grantId, error } = await context.supabase.rpc("school_admin_grant_survey_tracking" as any, {
      _survey_id: data.surveyId,
      _recipient_email: data.recipientEmail,
      _scope: data.scope,
      _department: data.scope === "department" ? data.department : null,
    });
    if (error) trackingError(error, "Could not grant tracking access");
    return { grantId: grantId as string };
  });

export const revokeSchoolSurveyTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ grantId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("school_admin_revoke_survey_tracking" as any, { _grant_id: data.grantId });
    if (error) trackingError(error, "Could not revoke tracking access");
    return { ok: true };
  });
