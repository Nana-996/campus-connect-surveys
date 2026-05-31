import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error || !data) throw new Error("Forbidden: admin only");
    return next();
  });

// ---------- Metrics ----------
export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [users, surveys, activeSurveys, respTotal, resp24, openFlags] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("surveys").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("surveys").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("survey_responses").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("survey_responses").select("id", { count: "exact", head: true }).gte("created_at", since24h),
      supabaseAdmin.from("review_flags").select("id", { count: "exact", head: true }).eq("resolved", false),
    ]);
    return {
      users: users.count ?? 0,
      surveys: surveys.count ?? 0,
      activeSurveys: activeSurveys.count ?? 0,
      responses: respTotal.count ?? 0,
      responses24h: resp24.count ?? 0,
      openFlags: openFlags.count ?? 0,
    };
  });

// ---------- Users ----------
export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: { search?: string } | undefined) =>
    z.object({ search: z.string().max(120).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("profiles")
      .select("id, full_name, university_name, university_domain, user_type, earned_credits, is_flagged, flag_reason, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.search) {
      q = q.or(`full_name.ilike.%${data.search}%,university_domain.ilike.%${data.search}%,university_name.ilike.%${data.search}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.id);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const a = roleMap.get(r.user_id) ?? [];
      a.push(r.role);
      roleMap.set(r.user_id, a);
    });
    return (rows ?? []).map((r) => ({ ...r, roles: roleMap.get(r.id) ?? [] }));
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
    if (e2) throw new Error(e2.message);
    await supabaseAdmin.from("credit_ledger").insert({
      user_id: data.userId,
      wallet: data.wallet,
      delta: data.amount,
      reason: `admin:${data.reason}:by:${context.userId}`,
      expires_at: data.amount > 0 ? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() : null,
    });
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
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserAdminRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), grant: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.grant) {
      await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: "admin" }).select();
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
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
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setSurveyActive = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ surveyId: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("surveys").update({ is_active: data.active }).eq("id", data.surveyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSurvey = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ surveyId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("survey_responses").delete().eq("survey_id", data.surveyId);
    await supabaseAdmin.from("survey_visualizations").delete().eq("survey_id", data.surveyId);
    const { error } = await supabaseAdmin.from("surveys").delete().eq("id", data.surveyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Disposable domains ----------
export const listDisposableDomains = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin.from("disposable_domains").select("domain, created_at").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addDisposableDomain = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ domain: z.string().min(3).max(253).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("disposable_domains").insert({ domain: data.domain.toLowerCase() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeDisposableDomain = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ domain: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("disposable_domains").delete().eq("domain", data.domain.toLowerCase());
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Flags & payments ----------
export const listOpenFlags = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin.from("review_flags").select("*").eq("resolved", false).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const resolveFlag = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("review_flags").update({ resolved: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPayments = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
