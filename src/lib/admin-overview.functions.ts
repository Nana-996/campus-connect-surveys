import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAppOwnerClaims } from "@/lib/app-owner";

const requireOwner = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    if (isAppOwnerClaims(context.claims as Record<string, unknown>)) return next();
    throw new Error("Forbidden: app owner only");
  });

export type OwnerPayment = {
  id: string; reference: string; who: string; bundle: string; credits: number;
  amountGhs: number; status: string; paid: boolean; createdAt: string;
};
export type OwnerActivity = { kind: "signup" | "survey" | "payment"; text: string; at: string };

export const getOwnerOverview = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async () => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const now = Date.now();
    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
    const today = dayStart.toISOString();
    const weekAgo = new Date(dayStart.getTime() - 7 * 864e5).toISOString();
    const hourAgo = new Date(now - 3600e3).toISOString();

    const count = async (table: string, build: (q: any) => any) => {
      const { count: c, error } = await build((db as any).from(table).select("*", { count: "exact", head: true }));
      if (error) console.error("[owner-overview]", table, error.message);
      return c ?? 0;
    };
    const pair = async (table: string, extra: (q: any) => any = (q) => q) => {
      const [t, w] = await Promise.all([
        count(table, (q) => extra(q.gte("created_at", today))),
        count(table, (q) => extra(q.gte("created_at", weekAgo).lt("created_at", today))),
      ]);
      return { today: t, weekAvg: Math.round((w / 7) * 10) / 10 };
    };

    const [signups, surveys, responses, payments, openFlags, newLeads, stuckPayments, flaggedUsers, payRows, recentUsers, recentSurveys] =
      await Promise.all([
        pair("profiles"),
        pair("surveys"),
        pair("survey_responses"),
        pair("paystack_purchases", (q) => q.not("credited_at", "is", null)),
        count("review_flags", (q) => q.eq("resolved", false)),
        count("leads", (q) => q.eq("status", "new")),
        count("paystack_purchases", (q) => q.eq("status", "pending").lt("created_at", hourAgo)),
        count("profiles", (q) => q.eq("is_flagged", true)),
        db.from("paystack_purchases").select("id, reference, user_id, bundle_id, credits, amount_ghs_kobo, status, credited_at, created_at").order("created_at", { ascending: false }).limit(50),
        db.from("profiles").select("id, full_name, user_type, university_name, created_at").order("created_at", { ascending: false }).limit(10),
        db.from("surveys").select("id, title, creator_id, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

    const ids = new Set<string>();
    (payRows.data ?? []).forEach((p) => ids.add(p.user_id));
    (recentSurveys.data ?? []).forEach((s) => ids.add(s.creator_id));
    const names = new Map<string, string>();
    if (ids.size) {
      const { data } = await db.from("profiles").select("id, full_name").in("id", [...ids]);
      (data ?? []).forEach((p) => names.set(p.id, p.full_name || "Unnamed user"));
    }

    const paymentsList: OwnerPayment[] = (payRows.data ?? []).map((p) => ({
      id: p.id, reference: p.reference, who: names.get(p.user_id) ?? "Unknown user",
      bundle: p.bundle_id, credits: p.credits, amountGhs: Number(p.amount_ghs_kobo) / 100,
      status: p.credited_at ? "paid" : p.status, paid: !!p.credited_at, createdAt: p.created_at,
    }));

    const activity: OwnerActivity[] = [
      ...(recentUsers.data ?? []).map((u) => ({
        kind: "signup" as const,
        text: `${u.full_name || "Someone"} joined as ${u.user_type === "student" ? "a student" : u.user_type === "general" ? "a General user" : u.user_type}${u.university_name ? ` · ${u.university_name}` : ""}`,
        at: u.created_at,
      })),
      ...(recentSurveys.data ?? []).map((s) => ({
        kind: "survey" as const, text: `${names.get(s.creator_id) ?? "Someone"} created “${s.title}”`, at: s.created_at,
      })),
      ...paymentsList.filter((p) => p.paid).slice(0, 10).map((p) => ({
        kind: "payment" as const, text: `${p.who} paid GHS ${p.amountGhs.toFixed(2)} for ${p.credits} credits`, at: p.createdAt,
      })),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15);

    return {
      glance: { signups, surveys, responses, payments },
      attention: { openFlags, newLeads, stuckPayments, flaggedUsers },
      payments: paymentsList,
      activity,
    };
  });
