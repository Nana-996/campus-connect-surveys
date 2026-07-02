import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function fail(e: any, label: string): never {
  console.error(`[faculty:${label}]`, e);
  // Preserve actionable error messages from RPCs (e.g. "Forbidden: faculty only")
  const msg = (e?.message as string) || "";
  if (/forbidden|not authenticated|not found|not a student|only add|on your watchlist|university/i.test(msg)) {
    throw new Error(msg);
  }
  throw new Error("Operation failed");
}

export const getMyFacultyScope = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const [{ data: isFaculty }, { data: isAdmin }, { data: prof }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "faculty" as any }),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" as any }),
      supabase.from("profiles").select("university_domain, university_name, full_name").eq("id", userId).maybeSingle(),
    ]);
    return {
      isFaculty: !!isFaculty,
      isAdmin: !!isAdmin,
      university_domain: prof?.university_domain ?? null,
      university_name: prof?.university_name ?? null,
      full_name: prof?.full_name ?? null,
    };
  });

export const searchStudentByIndex = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ indexNumber: z.string().trim().min(1).max(32) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("faculty_search_student_by_index" as any, {
      _index_number: data.indexNumber,
    });
    if (error) fail(error, "search");
    return (rows ?? []) as Array<{
      student_id: string;
      full_name: string;
      index_number: string;
      department: string | null;
      year: string | null;
      already_on_watchlist: boolean;
    }>;
  });

export const addToWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ studentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("faculty_add_to_watchlist" as any, {
      _student_user_id: data.studentId,
    });
    if (error) fail(error, "add");
    return { ok: true };
  });

export const setMyFacultyUniversity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ universityName: z.string().trim().min(2).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("faculty_set_my_university" as any, {
      _university_name: data.universityName,
    });
    if (error) fail(error, "set-university");
    return { ok: true };
  });

export const removeFromWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ studentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("faculty_remove_from_watchlist" as any, {
      _student_user_id: data.studentId,
    });
    if (error) fail(error, "remove");
    return { ok: true };
  });

export const listWatchlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("faculty_list_watchlist" as any);
    if (error) fail(error, "list");
    return (data ?? []) as Array<{
      student_id: string;
      full_name: string;
      index_number: string | null;
      department: string | null;
      year: string | null;
      added_at: string;
      surveys_responded: number;
      last_activity: string | null;
      surveys_available: number;
      surveys_pending: number;
    }>;
  });

export const getStudentDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ studentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("faculty_get_student_detail" as any, {
      _student_user_id: data.studentId,
    });
    if (error) fail(error, "detail");
    return (rows ?? []) as Array<{
      survey_id: string;
      title: string;
      creator_name: string;
      is_active: boolean;
      created_at: string;
      expires_at: string | null;
      target_department: string | null;
      target_year: string | null;
      responded: boolean;
      responded_at: string | null;
      quality_score: number | null;
      duration_ms: number | null;
    }>;
  });
