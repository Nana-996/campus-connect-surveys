import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAppOwnerClaims } from "@/lib/app-owner";

/**
 * Read-only analytics. This module NEVER writes: every query is a SELECT or a
 * read-only RPC that already exists. It is deliberately isolated from
 * admin.functions.ts so a failure here cannot affect the admin portal.
 */
const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    if (isAppOwnerClaims(context.claims as Record<string, unknown>)) return next();
    throw new Error("Forbidden: app owner only");
  });

export type AnalyticsPeriod = 0 | 7 | 30 | 90;

export type AdminAnalyticsData = {
  generatedAt: string;
  period: { days: AnalyticsPeriod; start: string; end: string; bucket: "day" | "month" };
  summary: {
    totalUsers: number; newUsers: number; previousNewUsers: number | null;
    activeUsers: number; previousActiveUsers: number | null; students: number; general: number;
    totalSurveys: number; newSurveys: number; previousNewSurveys: number | null;
    liveSurveys: number; responses: number; previousResponses: number | null; totalResponses: number;
    completedTargets: number; goalCompletion: number; partnerSchools: number;
    participatingSchools: number; openFlags: number; stalledSurveys: number; expiringSoon: number;
  };
  trend: { period: string; signups: number; surveys: number; responses: number; revenueGhs: number }[];
  accountTypes: { label: string; count: number }[];
  schools: { label: string; domain: string; users: number; surveys: number; responses: number; partner: boolean }[];
  surveyTiers: { label: string; count: number }[];
  surveyVisibility: { label: string; count: number }[];
  credits: { issued: number; spent: number; earnedBalance: number; paidBalance: number; sold: number; byReason: { label: string; issued: number; spent: number }[] };
  revenue: { ghs: number; previousGhs: number | null; transactions: number; bySource: { label: string; ghs: number; transactions: number }[] };
  expiringSoon: { id: string; title: string; expires_at: string; response_count: number; response_goal: number }[];
  stalled: { id: string; title: string; created_at: string; creator_name: string | null; university_domain: string }[];
};

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((input: { days: AnalyticsPeriod }) => z.object({ days: z.union([z.literal(0), z.literal(7), z.literal(30), z.literal(90)]) }).parse(input))
  .handler(async ({ data, context }) => {
    const ownerEmail = String((context.claims as Record<string, unknown>)?.email ?? "").toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: report, error } = await supabaseAdmin.rpc("admin_platform_analytics" as never, {
      _days: data.days,
      _owner_email: ownerEmail,
    } as never);
    if (error) throw new Error(error.message);
    if (!report) throw new Error("No analytics data returned.");
    return report as AdminAnalyticsData;
  });
