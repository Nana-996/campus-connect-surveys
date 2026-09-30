import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Read-only analytics. This module NEVER writes: every query is a SELECT or a
 * read-only RPC that already exists. It is deliberately isolated from
 * admin.functions.ts so a failure here cannot affect the admin portal.
 */
const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data: isAppOwner, error } = await context.supabase.rpc(
      "current_user_matches_admin_email" as any,
    );
    if (isAppOwner) return next();
    if (error) throw new Error("Could not verify app-owner access");
    throw new Error("Forbidden: app owner only");
  });

const DAY = 86_400_000;

function daysAgo(n: number) {
  return new Date(Date.now() - n * DAY);
}

function bucketByDay(dates: (string | null | undefined)[], days: number) {
  const out: { day: string; count: number }[] = [];
  const index = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * DAY).toISOString().slice(0, 10);
    index.set(key, out.length);
    out.push({ day: key, count: 0 });
  }
  for (const d of dates) {
    if (!d) continue;
    const key = new Date(d).toISOString().slice(0, 10);
    const i = index.get(key);
    if (i !== undefined) out[i]!.count += 1;
  }
  return out;
}

function topCounts(values: (string | null | undefined)[], limit = 8) {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = (v ?? "").trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const sb = context.supabase;

    const [metricsRes, usersRes, surveysRes, ledgerRes] = await Promise.all([
      sb.rpc("admin_dashboard_metrics" as any),
      sb.rpc("admin_list_users" as any, { _search: undefined }),
      sb.rpc("admin_list_surveys" as any, {}),
      sb
        .from("credit_ledger")
        .select("wallet, delta, reason, created_at")
        .gte("created_at", daysAgo(30).toISOString())
        .limit(5000),
    ]);

    const metrics = (metricsRes.data ?? {}) as Record<string, number>;
    const users = (usersRes.data ?? []) as any[];
    const surveys = (surveysRes.data ?? []) as any[];
    const ledger = (ledgerRes.data ?? []) as any[];

    const now = Date.now();
    const soon = now + 3 * DAY;

    const activeSurveys = surveys.filter(
      (s) => s.is_active && (!s.expires_at || new Date(s.expires_at).getTime() > now),
    );
    const expired = surveys.filter(
      (s) => s.expires_at && new Date(s.expires_at).getTime() <= now,
    );
    const expiringSoon = activeSurveys
      .filter((s) => s.expires_at && new Date(s.expires_at).getTime() <= soon)
      .sort((a, b) => +new Date(a.expires_at) - +new Date(b.expires_at))
      .slice(0, 12);
    const stalled = activeSurveys
      .filter((s) => (s.response_count ?? 0) === 0)
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
      .slice(0, 12);

    const totalResponses = surveys.reduce((a, s) => a + (s.response_count ?? 0), 0);
    const totalGoal = surveys.reduce((a, s) => a + (s.response_goal ?? 0), 0);

    const creditsIssued = ledger
      .filter((l) => (l.delta ?? 0) > 0)
      .reduce((a, l) => a + l.delta, 0);
    const creditsSpent = ledger
      .filter((l) => (l.delta ?? 0) < 0)
      .reduce((a, l) => a - l.delta, 0);

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        users: metrics.users ?? users.length,
        students: users.filter((u) => u.user_type === "student").length,
        general: users.filter((u) => u.user_type !== "student").length,
        flagged: users.filter((u) => u.is_flagged).length,
        surveys: surveys.length,
        activeSurveys: activeSurveys.length,
        expiredSurveys: expired.length,
        responses: metrics.responses ?? totalResponses,
        responses24h: metrics.responses24h ?? 0,
        openFlags: metrics.openFlags ?? 0,
        goalCompletion: totalGoal ? Math.round((totalResponses / totalGoal) * 100) : 0,
      },
      signupsByDay: bucketByDay(users.map((u) => u.created_at), 30),
      surveysByDay: bucketByDay(surveys.map((s) => s.created_at), 30),
      topUniversities: topCounts(users.map((u) => u.university_name)),
      byTier: topCounts(surveys.map((s) => s.tier), 10),
      credits: {
        issued30d: creditsIssued,
        spent30d: creditsSpent,
        earnedBalance: users.reduce((a, u) => a + (u.earned_credits ?? 0), 0),
        paidBalance: users.reduce((a, u) => a + (u.paid_credits ?? 0), 0),
      },
      expiringSoon: expiringSoon.map((s) => ({
        id: s.id,
        title: s.title,
        expires_at: s.expires_at,
        response_count: s.response_count ?? 0,
        response_goal: s.response_goal ?? 0,
      })),
      stalled: stalled.map((s) => ({
        id: s.id,
        title: s.title,
        created_at: s.created_at,
        creator_name: s.creator_name,
        university_domain: s.university_domain,
      })),
    };
  });
