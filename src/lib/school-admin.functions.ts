import { createServerFn } from "@tanstack/react-start";
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
