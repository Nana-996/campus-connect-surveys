import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildStandardEvalPayload } from "./lecturer-eval-template";

/** Allow admin OR manager. Resolves caller's role + university domain. */
const requireSchoolStaff = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    const isAdmin = roleSet.has("admin");
    const isManager = roleSet.has("manager");
    if (!isAdmin && !isManager) throw new Error("Forbidden: admin or manager only");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("university_domain, full_name")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.university_domain) throw new Error("Profile missing university");
    return next({
      context: {
        ...context,
        isAdmin,
        isManager,
        universityDomain: profile.university_domain as string,
        fullName: (profile.full_name as string) || "",
      },
    });
  });

function fail(e: any, label: string): never {
  console.error(`[lecturers:${label}]`, e);
  throw new Error("Operation failed");
}

const Trim = (max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(max));

// ---------- Directory listing (any signed-in user, scoped via RLS) ----------
// `email` is excluded — column-level GRANT prevents general students from
// reading lecturer emails. Staff get the email via listLecturersForStaff.
export const listLecturers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lecturers")
      .select("id, full_name, department, title, university_domain, created_at")
      .order("full_name", { ascending: true });
    if (error) fail(error, "list");
    return (data ?? []).map((r) => ({ ...r, email: null as string | null }));
  });

// ---------- Directory listing including email (admin/manager only) ----------
export const listLecturersForStaff = createServerFn({ method: "GET" })
  .middleware([requireSchoolStaff])
  .handler(async ({ context }) => {
    const base = supabaseAdmin
      .from("lecturers")
      .select("id, full_name, department, title, email, university_domain, created_at")
      .order("full_name", { ascending: true });
    const { data, error } = context.isAdmin
      ? await base
      : await base.eq("university_domain", context.universityDomain);
    if (error) fail(error, "list-staff");
    return data ?? [];
  });

// ---------- Create lecturer (admin/manager) ----------
export const createLecturer = createServerFn({ method: "POST" })
  .middleware([requireSchoolStaff])
  .inputValidator((input: unknown) =>
    z
      .object({
        full_name: Trim(200),
        department: z.string().trim().max(120).optional().nullable(),
        title: z.string().trim().max(60).optional().nullable(),
        email: z.string().trim().email().max(254).optional().nullable().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      full_name: data.full_name,
      department: data.department || null,
      title: data.title || null,
      email: data.email ? data.email.toLowerCase() : null,
      university_domain: context.universityDomain,
      created_by: context.userId,
    };
    const { data: row, error } = await supabaseAdmin
      .from("lecturers")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      if ((error as any).code === "23505")
        throw new Error("A lecturer with that name already exists in this department");
      fail(error, "create");
    }
    return { id: row!.id };
  });

// ---------- Update lecturer ----------
export const updateLecturer = createServerFn({ method: "POST" })
  .middleware([requireSchoolStaff])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        full_name: Trim(200),
        department: z.string().trim().max(120).optional().nullable(),
        title: z.string().trim().max(60).optional().nullable(),
        email: z.string().trim().email().max(254).optional().nullable().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Scope check
    const { data: existing } = await supabaseAdmin
      .from("lecturers")
      .select("university_domain")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing) throw new Error("Lecturer not found");
    if (!context.isAdmin && existing.university_domain !== context.universityDomain) {
      throw new Error("Forbidden");
    }
    const { error } = await supabaseAdmin
      .from("lecturers")
      .update({
        full_name: data.full_name,
        department: data.department || null,
        title: data.title || null,
        email: data.email ? data.email.toLowerCase() : null,
      })
      .eq("id", data.id);
    if (error) fail(error, "update");
    return { ok: true };
  });

// ---------- Delete lecturer ----------
export const deleteLecturer = createServerFn({ method: "POST" })
  .middleware([requireSchoolStaff])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await supabaseAdmin
      .from("lecturers")
      .select("university_domain")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing) return { ok: true };
    if (!context.isAdmin && existing.university_domain !== context.universityDomain) {
      throw new Error("Forbidden");
    }
    const { error } = await supabaseAdmin.from("lecturers").delete().eq("id", data.id);
    if (error) fail(error, "delete");
    return { ok: true };
  });

// ---------- Create a standard evaluation survey for a lecturer ----------
export const createStandardEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSchoolStaff])
  .inputValidator((input: unknown) =>
    z
      .object({
        lecturer_id: z.string().uuid(),
        course_code: z.string().trim().max(40).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: lec } = await supabaseAdmin
      .from("lecturers")
      .select("id, full_name, department, university_domain")
      .eq("id", data.lecturer_id)
      .maybeSingle();
    if (!lec) throw new Error("Lecturer not found");
    if (!context.isAdmin && lec.university_domain !== context.universityDomain) {
      throw new Error("Forbidden");
    }

    const course = data.course_code?.trim() || null;
    const payload = buildStandardEvalPayload(lec.full_name, course);

    const { data: survey, error } = await supabaseAdmin
      .from("surveys")
      .insert({
        creator_id: context.userId,
        university_domain: lec.university_domain,
        title: payload.title,
        description: payload.description,
        questions: payload.questions as any,
        tier: "basic",
        target_department: lec.department || null,
        target_year: null,
        target_country: null,
        target_age_range: null,
        target_interests: [],
        allow_general_respondents: false,
        respondent_bonus: 0,
        min_response_seconds: 20,
        lecturer_id: lec.id,
        course_code: course,
        is_evaluation: true,
      })
      .select("id")
      .single();
    if (error) fail(error, "create-standard");
    return { id: survey!.id };
  });

// ---------- Evaluations for a single lecturer ----------
export const listLecturerEvaluations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ lecturer_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("list_lecturer_evaluations", {
      _lecturer_id: data.lecturer_id,
    });
    if (error) fail(error, "list-evals");
    return rows ?? [];
  });
