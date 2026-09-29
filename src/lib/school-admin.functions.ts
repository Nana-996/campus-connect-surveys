import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SchoolAdminOverview = {
  isSchoolAdmin: boolean;
  school?: { name: string; domain: string; status: string; validUntil: string | null };
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
    return data as SchoolAdminOverview;
  });
