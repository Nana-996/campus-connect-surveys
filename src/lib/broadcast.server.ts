// Server-only broadcast helpers: build the recipient audience from profiles + auth
// users, and queue branded announcement emails through the app's sending domain.
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueTemplateEmail } from "@/lib/email/enqueue.server";

export type BroadcastFilters = {
  userType: "all" | "student" | "general";
  role: "all" | "admin" | "manager" | "faculty" | "none";
  universityDomain?: string | undefined;
  onlyConfirmed: boolean;
};

export type BroadcastRecipient = {
  email: string;
  name: string;
  userType: string;
  university: string;
  domain: string;
  roles: string[];
};

export async function buildBroadcastAudience(
  supabase: SupabaseClient<any, any, any>,
  filters: BroadcastFilters,
) {
  const { data: rows, error } = await supabase.rpc("admin_list_users" as any, { _search: undefined });
  if (error) throw new Error("Could not load the member list.");

  const profiles = (rows ?? []) as Array<{
    id: string;
    full_name: string;
    user_type: string;
    university_name: string;
    university_domain: string;
    roles: string[] | null;
  }>;
  const byId = new Map(profiles.map((p) => [p.id, p]));

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const authUsers: Array<{ id: string; email: string; confirmed: boolean }> = [];
  for (let page = 1; page <= 20; page++) {
    const { data: pageData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (authError) throw new Error("Could not load member email addresses.");
    for (const u of pageData?.users ?? []) {
      if (u.email) {
        authUsers.push({
          id: u.id,
          email: u.email,
          confirmed: Boolean(u.email_confirmed_at ?? (u as any).confirmed_at),
        });
      }
    }
    if ((pageData?.users?.length ?? 0) < 1000) break;
  }

  const { data: suppressedRows } = await supabaseAdmin.from("suppressed_emails").select("email");
  const suppressed = new Set((suppressedRows ?? []).map((r: any) => String(r.email).toLowerCase()));

  let skippedSuppressed = 0;
  let skippedUnconfirmed = 0;
  const recipients: BroadcastRecipient[] = [];

  for (const u of authUsers) {
    const p = byId.get(u.id);
    if (!p) continue;
    const roles = (p.roles ?? []).filter(Boolean);
    if (filters.userType !== "all" && p.user_type !== filters.userType) continue;
    if (filters.role === "none" && roles.length > 0) continue;
    if (filters.role !== "all" && filters.role !== "none" && !roles.includes(filters.role)) continue;
    if (filters.universityDomain && p.university_domain !== filters.universityDomain) continue;
    if (suppressed.has(u.email.toLowerCase())) {
      skippedSuppressed += 1;
      continue;
    }
    if (filters.onlyConfirmed && !u.confirmed) {
      skippedUnconfirmed += 1;
      continue;
    }
    recipients.push({
      email: u.email,
      name: p.full_name ?? "",
      userType: p.user_type ?? "",
      university: p.university_name ?? "",
      domain: p.university_domain ?? "",
      roles,
    });
  }

  recipients.sort((a, b) => a.email.localeCompare(b.email));

  const domains = Array.from(
    new Set(profiles.map((p) => p.university_domain).filter((d): d is string => Boolean(d))),
  ).sort();

  return { recipients, total: recipients.length, skippedSuppressed, skippedUnconfirmed, domains };
}

export const BROADCAST_MAX_PER_SEND = 500;

export async function sendBroadcastEmails(input: {
  recipients: BroadcastRecipient[];
  subject: string;
  heading: string;
  body: string;
  campaignId: string;
  testEmail?: string | undefined;
}) {
  const targets = input.testEmail
    ? [{ email: input.testEmail } as BroadcastRecipient]
    : input.recipients.slice(0, BROADCAST_MAX_PER_SEND);

  let queued = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const r of targets) {
    try {
      const result = await enqueueTemplateEmail({
        templateName: "broadcast",
        recipientEmail: r.email,
        templateData: {
          subject: input.subject,
          heading: input.heading || input.subject,
          body: input.body,
          preview: input.subject,
        },
        idempotencyKey: `${input.campaignId}:${r.email.toLowerCase()}`,
      });
      if (result.sent) queued += 1;
      else skipped += 1;
    } catch {
      failures.push(r.email);
    }
  }

  return { queued, skipped, failed: failures.length, total: targets.length };
}
