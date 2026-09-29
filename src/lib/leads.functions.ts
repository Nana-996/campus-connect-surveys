import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const opt = (n: number) => z.string().trim().max(n).optional().transform((v) => (v ? v : null));

const leadSchema = z.object({
  kind: z.enum(["school", "demo"]),
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: opt(40),
  organization: opt(160),
  role_title: opt(120),
  country: opt(80),
  student_count: opt(40),
  message: opt(2000),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => leadSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("leads" as any).insert(data as any);
    if (error) {
      console.error("[leads:submit]", error);
      throw new Error("Could not send your request. Please try again.");
    }
    // Notify every super admin; failures never block the submission.
    try {
      const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      for (const r of roles ?? []) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
        const to = u?.user?.email;
        if (!to) continue;
        await sendTemplateEmail("new-lead", to, {
          replyTo: data.email,
          templateData: {
            kind: data.kind, fullName: data.full_name, email: data.email, phone: data.phone,
            organization: data.organization, roleTitle: data.role_title, country: data.country,
            studentCount: data.student_count, message: data.message,
          },
        }).catch((e) => console.error("[leads:email]", e));
      }
    } catch (e) {
      console.error("[leads:notify]", e);
    }
    return { ok: true };
  });

export type Lead = {
  id: string; kind: "school" | "demo"; full_name: string; email: string; phone: string | null;
  organization: string | null; role_title: string | null; country: string | null;
  student_count: string | null; message: string | null; status: "new" | "contacted" | "won" | "lost";
  notes: string | null; created_at: string;
};

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
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
    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes || null;
    const { error } = await context.supabase.from("leads" as any).update(patch as any).eq("id", data.id);
    if (error) throw new Error("Could not update lead");
    return { ok: true };
  });
