import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    // Use only the authenticated user's client for the gate, so admin access
    // does not depend on a service-role key being configured on Vercel.
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin" as any,
    });
    if (data) return next();

    // Some self-hosted/PostgREST deployments can fail enum RPC calls while
    // table reads still work. The self-read policy allows users to see only
    // their own role rows, so this fallback cannot grant another user access.
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roleError && (roles ?? []).some((r: any) => r.role === "admin")) {
      return next();
    }

    const { data: emailAdmin, error: emailAdminError } = await context.supabase.rpc(
      "current_user_matches_admin_email" as any,
    );
    if (emailAdmin) return next();

    if (error || roleError || emailAdminError) {
      console.error("[admin:gate]", error ?? roleError ?? emailAdminError);
      throw new Error("Could not verify admin role");
    }
    throw new Error("Forbidden: admin only");
  });

function genericError(e: any): never {
  console.error("[admin]", e);
  throw new Error("Database operation failed");
}

// ---------- First-admin bootstrap ----------
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("bootstrap_first_admin");
    if (error) genericError(error);
    return { ok: true };
  });

// ---------- Metrics ----------
export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_dashboard_metrics" as any);
    if (error) genericError(error);
    return data as {
      users: number; surveys: number; activeSurveys: number;
      responses: number; responses24h: number; openFlags: number;
    };
  });

// ---------- Users ----------
export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: { search?: string } | undefined) =>
    z.object({ search: z.string().max(120).regex(/^[^(),.%_]*$/).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const safe = data.search?.replace(/[(),.%_]/g, "") || undefined;
    const { data: rows, error } = await context.supabase.rpc("admin_list_users" as any, { _search: safe });
    if (error) genericError(error);
    return rows ?? [];
  });

export const grantCreditsToUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string().uuid(),
      wallet: z.literal("earned"),
      amount: z.number().int().min(-1000).max(1000),
      reason: z.string().min(1).max(200).default("admin_grant"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("admin_grant_credits" as any, {
      _target_user_id: data.userId,
      _amount: data.amount,
      _reason: data.reason,
    });
    if (error) genericError(error);
    return result as { ok: true; balance: number };
  });

export const setUserFlag = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), flagged: z.boolean(), reason: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_set_user_flag" as any, {
      _target_user_id: data.userId,
      _flagged: data.flagged,
      _reason: data.reason ?? null,
    });
    if (error) genericError(error);
    return { ok: true };
  });

export const setUserAdminRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), grant: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_set_user_role" as any, {
      _target_user_id: data.userId,
      _role: "admin",
      _grant: data.grant,
    });
    if (error) genericError(error);
    return { ok: true };
  });

export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email().max(254) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const email = data.email.trim().toLowerCase();
    const { data: userId, error } = await context.supabase.rpc("admin_grant_admin_by_email" as any, { _email: email });
    if (error) genericError(error);
    return { ok: true, userId };
  });

export const setUserManagerRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), grant: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_set_user_role" as any, {
      _target_user_id: data.userId,
      _role: "manager",
      _grant: data.grant,
    });
    if (error) genericError(error);
    return { ok: true };
  });

export const setUserFacultyRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), grant: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_set_user_role" as any, {
      _target_user_id: data.userId,
      _role: "faculty",
      _grant: data.grant,
    });
    if (error) genericError(error);
    return { ok: true };
  });

export const setUserUniversity = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), universityName: z.string().trim().min(2).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_set_user_university" as any, {
      _target_user_id: data.userId,
      _university_name: data.universityName,
    });
    if (error) genericError(error);
    return { ok: true };
  });

// ---------- Surveys ----------
export const listAdminSurveys = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_list_surveys" as any);
    if (error) genericError(error);
    return data ?? [];
  });

export const setSurveyActive = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ surveyId: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_set_survey_active" as any, {
      _survey_id: data.surveyId,
      _active: data.active,
    });
    if (error) genericError(error);
    return { ok: true };
  });

export const deleteSurvey = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ surveyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_delete_survey" as any, { _survey_id: data.surveyId });
    if (error) genericError(error);
    return { ok: true };
  });

export const grantSurveyTrackingAccess = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ surveyId: z.string().uuid(), email: z.string().email().max(254) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("admin_grant_survey_tracking_access_by_email" as any, {
      _survey_id: data.surveyId,
      _email: data.email.trim().toLowerCase(),
    });
    if (error) genericError(error);
    return { ok: true, faculty: Array.isArray(row) ? row[0] : row };
  });

export const revokeSurveyTrackingAccess = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ surveyId: z.string().uuid(), facultyUserId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_revoke_survey_tracking_access" as any, {
      _survey_id: data.surveyId,
      _faculty_user_id: data.facultyUserId,
    });
    if (error) genericError(error);
    return { ok: true };
  });

export const listSurveyTrackingAccess = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ surveyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("admin_list_survey_tracking_access" as any, {
      _survey_id: data.surveyId,
    });
    if (error) genericError(error);
    return rows ?? [];
  });

// ---------- Disposable domains ----------
export const listDisposableDomains = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_list_disposable_domains" as any);
    if (error) genericError(error);
    return data ?? [];
  });

export const addDisposableDomain = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ domain: z.string().min(3).max(253).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_add_disposable_domain" as any, { _domain: data.domain.toLowerCase() });
    if (error) genericError(error);
    return { ok: true };
  });

export const removeDisposableDomain = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ domain: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_remove_disposable_domain" as any, { _domain: data.domain.toLowerCase() });
    if (error) genericError(error);
    return { ok: true };
  });

// ---------- Flags ----------
export const listOpenFlags = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_list_open_flags" as any);
    if (error) genericError(error);
    return data ?? [];
  });

export const resolveFlag = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_resolve_flag" as any, { _id: data.id });
    if (error) genericError(error);
    return { ok: true };
  });

export const checkAdminExists = createServerFn({ method: "GET" })
  .handler(async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Database configuration is missing");
    const client = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.rpc("admin_exists");
    if (error) genericError(error);
    return { exists: !!data };
  });

// ---------- Schools onboarding ----------
export const listSchools = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_list_schools" as any);
    if (error) genericError(error);
    return (data ?? []) as {
      id: string; name: string; domain: string; is_active: boolean;
      created_at: string; open_invites: number;
    }[];
  });

export const upsertSchool = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().trim().min(2).max(120),
      domain: z.string().trim().min(3).max(253).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_upsert_school" as any, {
      _name: data.name,
      _domain: data.domain.toLowerCase(),
    });
    if (error) genericError(error);
    return { ok: true };
  });

export const setSchoolActive = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ domain: z.string().min(3).max(253), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_set_school_active" as any, {
      _domain: data.domain.toLowerCase(),
      _active: data.active,
    });
    if (error) genericError(error);
    return { ok: true };
  });

export const createSchoolInvite = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      domain: z.string().min(3).max(253),
      role: z.enum(["faculty", "lecturer"]),
      email: z.string().email().max(254).optional().or(z.literal("")),
      expiresDays: z.number().int().min(1).max(90).default(14),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("admin_create_school_invite" as any, {
      _domain: data.domain.toLowerCase(),
      _role: data.role,
      _email: data.email ? data.email.trim().toLowerCase() : null,
      _expires_days: data.expiresDays,
    });
    if (error) {
      console.error("[admin:invite]", error);
      throw new Error(error.message || "Could not create invite");
    }
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row as { id: string; token: string; expires_at: string | null };
  });

export const listSchoolInvites = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ domain: z.string().min(3).max(253) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("admin_list_school_invites" as any, {
      _domain: data.domain.toLowerCase(),
    });
    if (error) genericError(error);
    return (rows ?? []) as {
      id: string; role: "faculty" | "lecturer"; token: string; email: string | null;
      expires_at: string | null; revoked: boolean; accepted_at: string | null; created_at: string;
    }[];
  });

export const revokeSchoolInvite = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_revoke_school_invite" as any, { _id: data.id });
    if (error) genericError(error);
    return { ok: true };
  });

// ---------- Social / website links ----------
const PLATFORMS = ["website", "x", "instagram", "facebook", "linkedin", "youtube", "tiktok", "github", "whatsapp", "email"] as const;

export const listSocialLinks = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("social_links" as any)
      .select("id, platform, label, url, sort_order, is_active")
      .order("sort_order", { ascending: true });
    if (error) genericError(error);
    return (data ?? []) as any[];
  });

export const upsertSocialLink = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      platform: z.enum(PLATFORMS),
      label: z.string().trim().max(60).optional().or(z.literal("")),
      url: z.string().trim().url().max(500),
      sortOrder: z.number().int().min(0).max(999).default(0),
      isActive: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const row = {
      platform: data.platform,
      label: data.label || null,
      url: data.url,
      sort_order: data.sortOrder,
      is_active: data.isActive,
    };
    const q = data.id
      ? context.supabase.from("social_links" as any).update(row).eq("id", data.id)
      : context.supabase.from("social_links" as any).insert(row);
    const { error } = await q;
    if (error) genericError(error);
    return { ok: true };
  });

export const deleteSocialLink = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("social_links" as any).delete().eq("id", data.id);
    if (error) genericError(error);
    return { ok: true };
  });

// ---------- Broadcast audience (export recipients for an external email tool) ----------
const broadcastFilters = z.object({
  userType: z.enum(["all", "student", "general"]).default("all"),
  role: z.enum(["all", "admin", "manager", "faculty", "none"]).default("all"),
  universityDomain: z.string().max(120).optional(),
  onlyConfirmed: z.boolean().default(true),
});

export const getBroadcastAudience = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => broadcastFilters.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { buildBroadcastAudience } = await import("@/lib/broadcast.server");
    return buildBroadcastAudience(context.supabase, data);
  });

const broadcastSend = broadcastFilters.extend({
  subject: z.string().trim().min(3).max(140),
  heading: z.string().trim().max(140).optional(),
  body: z.string().trim().min(10).max(20000),
  testEmail: z.string().trim().email().optional(),
});

export const sendBroadcastEmail = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => broadcastSend.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { buildBroadcastAudience, sendBroadcastEmails } = await import("@/lib/broadcast.server");
    const audience = data.testEmail
      ? { recipients: [] }
      : await buildBroadcastAudience(context.supabase, data);
    return sendBroadcastEmails({
      recipients: audience.recipients as any,
      subject: data.subject,
      heading: data.heading || data.subject,
      body: data.body,
      campaignId: crypto.randomUUID(),
      testEmail: data.testEmail,
    });
  });
