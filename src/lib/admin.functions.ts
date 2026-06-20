import { createServerFn, createMiddleware } from "@tanstack/react-start";
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

    if (error || roleError) {
      console.error("[admin:gate]", error ?? roleError);
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
    const { data: profile, error: e1 } = await supabaseAdmin
      .from("profiles")
      .select("earned_credits")
      .eq("id", data.userId)
      .single();
    if (e1 || !profile) throw new Error("User not found");
    const next = Math.max(0, (profile as any).earned_credits + data.amount);
    const patch: Record<string, number> = { earned_credits: next };
    const { error: e2 } = await supabaseAdmin.from("profiles").update(patch as any).eq("id", data.userId);
    if (e2) genericError(e2);
    const { error: e3 } = await supabaseAdmin.from("credit_ledger").insert({
      user_id: data.userId,
      wallet: data.wallet,
      delta: data.amount,
      reason: `admin:${data.reason}:by:${context.userId}`,
      expires_at: data.amount > 0 ? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() : null,
    });
    if (e3) genericError(e3);
    return { ok: true, balance: next };
  });

export const setUserFlag = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), flagged: z.boolean(), reason: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_flagged: data.flagged, flag_reason: data.flagged ? data.reason ?? "admin" : null })
      .eq("id", data.userId);
    if (error) genericError(error);
    return { ok: true };
  });

export const setUserAdminRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), grant: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!data.grant) {
      const { data: admins, error: countErr } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (countErr) genericError(countErr);
      const adminIds = new Set((admins ?? []).map((a: any) => a.user_id));
      if (adminIds.size <= 1 && adminIds.has(data.userId)) {
        throw new Error("Cannot revoke the last admin");
      }
    }
    if (data.grant) {
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: "admin" }).select();
      if (error) genericError(error);
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
      if (error) genericError(error);
    }
    return { ok: true };
  });

export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email().max(254) }).parse(d),
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    // Find the user by email via the Admin API.
    let userId: string | null = null;
    let page = 1;
    while (page <= 20 && !userId) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) genericError(error);
      const match = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (match) { userId = match.id; break; }
      if (list.users.length < 200) break;
      page += 1;
    }
    if (!userId) throw new Error("No user with that email has signed up yet");
    // Idempotent: ignore unique-constraint conflict.
    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (insErr) genericError(insErr);
    return { ok: true, userId };
  });

export const setUserManagerRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), grant: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.grant) {
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: "manager" as any }).select();
      if (error) genericError(error);
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "manager" as any);
      if (error) genericError(error);
    }
    return { ok: true };
  });

// ---------- Surveys ----------
export const listAdminSurveys = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("surveys")
      .select("id, title, creator_id, university_domain, tier, is_active, response_count, response_goal, created_at, expires_at, allow_general_respondents")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) genericError(error);
    return data ?? [];
  });

export const setSurveyActive = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ surveyId: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("surveys").update({ is_active: data.active }).eq("id", data.surveyId);
    if (error) genericError(error);
    return { ok: true };
  });

export const deleteSurvey = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ surveyId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("survey_responses").delete().eq("survey_id", data.surveyId);
    await supabaseAdmin.from("survey_visualizations").delete().eq("survey_id", data.surveyId);
    const { error } = await supabaseAdmin.from("surveys").delete().eq("id", data.surveyId);
    if (error) genericError(error);
    return { ok: true };
  });

// ---------- Disposable domains ----------
export const listDisposableDomains = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin.from("disposable_domains").select("domain, created_at").order("created_at", { ascending: false });
    if (error) genericError(error);
    return data ?? [];
  });

export const addDisposableDomain = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ domain: z.string().min(3).max(253).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("disposable_domains").insert({ domain: data.domain.toLowerCase() });
    if (error) {
      if (error.message?.includes("duplicate")) throw new Error("Domain already blocked");
      genericError(error);
    }
    return { ok: true };
  });

export const removeDisposableDomain = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ domain: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("disposable_domains").delete().eq("domain", data.domain.toLowerCase());
    if (error) genericError(error);
    return { ok: true };
  });

// ---------- Flags ----------
export const listOpenFlags = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin.from("review_flags").select("*").eq("resolved", false).order("created_at", { ascending: false });
    if (error) genericError(error);
    return data ?? [];
  });

export const resolveFlag = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("review_flags").update({ resolved: true }).eq("id", data.id);
    if (error) genericError(error);
    return { ok: true };
  });

export const checkAdminExists = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin.rpc("admin_exists");
    if (error) genericError(error);
    return { exists: !!data };
  });
