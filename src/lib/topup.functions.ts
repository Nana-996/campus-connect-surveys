import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SAFE = /pending request|no school admin|Only students|between 1 and 100|already decided|not found/i;
function fail(tag: string, e: any): never {
  console.error(tag, e);
  throw new Error(SAFE.test(e?.message ?? "") ? e.message : "Something went wrong");
}

export type TopupRow = {
  id: string; amount: number; reason: string; status: "pending" | "approved" | "declined";
  decision_note: string | null; created_at: string; decided_at: string | null;
  student_name?: string; department?: string | null; index_number?: string | null; earned_credits?: number;
};

export const requestCreditTopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ amount: z.number().int().min(1).max(100), reason: z.string().trim().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("request_credit_topup" as any, { _amount: data.amount, _reason: data.reason });
    if (error) fail("[topup:request]", error);
    return { ok: true };
  });

export const listMyTopups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("credit_topup_requests" as any)
      .select("id, amount, reason, status, decision_note, created_at, decided_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) fail("[topup:mine]", error);
    return (data ?? []) as unknown as TopupRow[];
  });

export const listSchoolTopups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("school_admin_list_topups" as any);
    if (error) fail("[topup:list]", error);
    return (data ?? []) as TopupRow[];
  });

export const decideTopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), approve: z.boolean(), note: z.string().trim().max(300).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("school_admin_decide_topup" as any, {
      _id: data.id, _approve: data.approve, _note: data.note || null,
    });
    if (error) fail("[topup:decide]", error);
    return { ok: true };
  });
