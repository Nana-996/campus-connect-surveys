import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAppOwnerClaims } from "@/lib/app-owner";

export type PartnerStats = {
  signups: number;
  students: number;
  general: number;
  paying: number;
  revenue_ghs: number;
  activity: { kind: string; at: string }[];
};

export type Partner = {
  id: string;
  name: string;
  slug: string;
  partner_email: string;
  contact: string | null;
  target_paying: number;
  reward_note: string | null;
  clicks: number;
  milestones_paid: number;
  last_paid_at: string | null;
  is_active: boolean;
  created_at: string;
};

const requireOwner = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    if (isAppOwnerClaims(context.claims as Record<string, unknown>)) return next();
    throw new Error("Forbidden: app owner only");
  });

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function statsFor(id: string): Promise<PartnerStats> {
  const db = await admin();
  const { data, error } = await db.rpc("partner_stats" as never, { _partner_id: id } as never);
  if (error) throw new Error(error.message);
  return data as unknown as PartnerStats;
}

export const listPartners = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async () => {
    const db = await admin();
    const { data, error } = await db.from("partners").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Partner[];
    return Promise.all(rows.map(async (p) => ({ ...p, stats: await statsFor(p.id) })));
  });

const partnerInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/, "Use 2–40 letters, numbers or dashes"),
  partner_email: z.string().trim().toLowerCase().email().max(255),
  contact: z.string().trim().max(120).optional().nullable(),
  target_paying: z.number().int().min(1).max(100000),
  reward_note: z.string().trim().max(300).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const savePartner = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .inputValidator((i: z.input<typeof partnerInput>) => partnerInput.parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const { id, ...row } = data;
    const q = id ? db.from("partners").update(row).eq("id", id) : db.from("partners").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.code === "23505" ? "That link name is already taken." : error.message);
    return { ok: true };
  });

/** Records a manual payout and starts the next milestone cycle. */
export const markPartnerPaid = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: p, error } = await db.from("partners").select("milestones_paid").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { error: e2 } = await db
      .from("partners")
      .update({ milestones_paid: (p.milestones_paid ?? 0) + 1, last_paid_at: new Date().toISOString() })
      .eq("id", data.id);
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

/** Partner's own dashboard: matched by the verified email on their account. */
export const getMyPartnerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = String((context.claims as Record<string, unknown>)?.email ?? "").toLowerCase();
    if (!email) return [];
    const db = await admin();
    const { data, error } = await db
      .from("partners")
      .select("id,name,slug,target_paying,reward_note,clicks,milestones_paid,last_paid_at,is_active")
      .eq("partner_email", email);
    if (error) throw new Error(error.message);
    return Promise.all((data ?? []).map(async (p) => ({ ...p, stats: await statsFor(p.id) })));
  });
