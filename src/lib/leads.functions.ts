import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAppOwnerClaims, getAppOwnerEmail } from "@/lib/app-owner";
import { leadSchema } from "@/lib/lead-schema";

function checkTrustedOrigin(req: Request | null | undefined): boolean {
  if (!req) return true;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const candidate = origin || (referer ? new URL(referer).origin : null);
  if (!candidate) return true;

  const allowed = new Set(
    [
      "https://campus-verify.live",
      "https://www.campus-verify.live",
      "https://campus-verify.lovable.app",
      process.env["SITE_URL"],
      process.env["VITE_SITE_URL"],
    ]
      .filter(Boolean)
      .map((u) => {
        try {
          return new URL(u as string).origin;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[],
  );

  try {
    const u = new URL(candidate);
    if (
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname.endsWith(".lovableproject.com") ||
      u.hostname.endsWith(".lovable.app")
    ) {
      return true;
    }
    return allowed.has(u.origin);
  } catch {
    return false;
  }
}

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => leadSchema.parse(d))
  .handler(async ({ data }) => {
    if (!checkTrustedOrigin(getRequest())) {
      console.warn("[leads:submit] unlisted origin on lead submission");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    // Prevent automated spam loops: duplicate submissions within 10 minutes are accepted silently
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("leads" as any)
        .select("id")
        .eq("email", email)
        .gte("created_at", tenMinutesAgo)
        .limit(1);

      if (recent && recent.length > 0) {
        return { ok: true };
      }
    } catch (e) {
      console.warn("[leads:dedupe-check]", e);
    }

    const { error } = await supabaseAdmin.from("leads" as any).insert(data as any);
    if (error) {
      console.error("[leads:submit]", error);
      throw new Error("Could not send your request. Please try again.");
    }

    // Notify the app owner and admins; failures never block the submission.
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const recipients = new Set<string>();
      const ownerEmail = getAppOwnerEmail();
      if (ownerEmail) recipients.add(ownerEmail);

      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(5);

      for (const r of roles ?? []) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
        const to = u?.user?.email;
        if (to) recipients.add(to);
      }

      for (const to of recipients) {
        await sendTemplateEmail("new-lead", to, {
          replyTo: data.email,
          templateData: {
            kind: data.kind,
            fullName: data.full_name,
            email: data.email,
            phone: data.phone,
            organization: data.organization,
            roleTitle: data.role_title,
            country: data.country,
            studentCount: data.student_count,
            message: data.message,
            sampleSize: data.sample_size,
            contactPreference: data.contact_preference,
          },
        }).catch((e) => console.error("[leads:email]", e));
      }
    } catch (e) {
      console.error("[leads:notify]", e);
    }
    return { ok: true };
  });

function assertAdmin(claims: Record<string, unknown>) {
  if (!isAppOwnerClaims(claims)) throw new Error("Forbidden: app owner only");
}

export type Lead = {
  id: string; kind: "school" | "demo" | "study"; full_name: string; email: string; phone: string | null;
  organization: string | null; role_title: string | null; country: string | null;
  student_count: string | null; message: string | null; status: "new" | "contacted" | "won" | "lost";
  notes: string | null; created_at: string;
  sample_size: string | null; contact_preference: string | null;
};

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.claims as Record<string, unknown>);
    const { data, error } = await context.supabase.from("leads" as any).select("*").order("created_at", { ascending: false }).limit(2000);
    if (error) throw new Error("Could not load leads");
    return (data ?? []) as unknown as Lead[];
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["new", "contacted", "won", "lost"]).optional(),
      notes: z.string().max(4000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Record<string, unknown>);
    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes || null;
    const { error } = await context.supabase.from("leads" as any).update(patch as any).eq("id", data.id);
    if (error) throw new Error("Could not update lead");
    return { ok: true };
  });
