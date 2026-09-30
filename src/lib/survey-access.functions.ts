import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Progress-access invitations. The survey owner invites people by email; the
// super admin may invite on any survey (owner is notified). Invitees confirm
// via an emailed link and must be signed in with the invited email address.

const SITE = "https://campus-verify.live";

async function isAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data) return true;
  const { data: byEmail } = await supabase.rpc("current_user_matches_admin_email");
  return !!byEmail;
}

async function authorize(context: any, surveyId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: survey } = await supabaseAdmin
    .from("surveys")
    .select("id, title, creator_id")
    .eq("id", surveyId)
    .maybeSingle();
  if (!survey) throw new Error("Survey not found.");
  const owner = survey.creator_id === context.userId;
  const admin = owner ? false : await isAdmin(context.supabase, context.userId);
  if (!owner && !admin) throw new Error("Only the survey owner can manage access.");
  return { supabaseAdmin, survey, owner, admin };
}

async function emailOf(supabaseAdmin: any, userId: string) {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return (data?.user?.email ?? "").toLowerCase();
}

async function nameOf(supabaseAdmin: any, userId: string) {
  const { data } = await supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return data?.full_name || "";
}

export const inviteSurveyTracker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ surveyId: z.string().uuid(), email: z.string().trim().toLowerCase().email().max(254) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, survey, admin } = await authorize(context, data.surveyId);
    const ownerEmail = await emailOf(supabaseAdmin, survey.creator_id);
    if (data.email === ownerEmail) throw new Error("The survey owner already has access.");

    // Revoke older pending invites for the same email, then create a fresh one.
    await supabaseAdmin
      .from("survey_access_invites" as any)
      .update({ status: "revoked" })
      .eq("survey_id", survey.id)
      .eq("email", data.email)
      .eq("status", "pending");
    const { data: invite, error } = await supabaseAdmin
      .from("survey_access_invites" as any)
      .insert({ survey_id: survey.id, email: data.email, invited_by: context.userId, invited_by_admin: admin })
      .select("id, token")
      .single();
    if (error || !invite) throw new Error("Could not create the invitation.");

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const ownerName = (await nameOf(supabaseAdmin, survey.creator_id)) || "The survey owner";
    const link = `${SITE}/track-invite/${(invite as any).token}`;
    try {
      await sendTemplateEmail("survey-access-invite", data.email, {
        templateData: { surveyTitle: survey.title, ownerName, viaAdmin: admin, link },
        idempotencyKey: `survey-access-invite-${(invite as any).id}`,
      });
    } catch (e) {
      console.error("survey-access-invite email failed", e);
      throw new Error("Invitation saved, but the email could not be sent. Please try again.");
    }
    if (admin && ownerEmail) {
      try {
        await sendTemplateEmail("survey-access-owner-notice", ownerEmail, {
          templateData: { surveyTitle: survey.title, ownerName, inviteeEmail: data.email, manageUrl: `${SITE}/my-surveys` },
          idempotencyKey: `survey-access-owner-notice-${(invite as any).id}`,
        });
      } catch (e) {
        console.error("owner notice email failed", e);
      }
    }
    return { ok: true, ownerNotified: admin };
  });

export const listSurveyTrackers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ surveyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, survey } = await authorize(context, data.surveyId);
    const [{ data: grants }, { data: invites }] = await Promise.all([
      supabaseAdmin.from("survey_tracking_access").select("faculty_user_id, created_at").eq("survey_id", survey.id),
      supabaseAdmin
        .from("survey_access_invites" as any)
        .select("id, email, created_at, expires_at, invited_by_admin")
        .eq("survey_id", survey.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    const active = await Promise.all(
      (grants ?? []).map(async (g: any) => ({
        userId: g.faculty_user_id as string,
        email: await emailOf(supabaseAdmin, g.faculty_user_id),
        name: await nameOf(supabaseAdmin, g.faculty_user_id),
        since: g.created_at as string,
      })),
    );
    const pending = ((invites ?? []) as any[]).map((i) => ({
      id: i.id as string,
      email: i.email as string,
      sentAt: i.created_at as string,
      expired: new Date(i.expires_at).getTime() < Date.now(),
      viaAdmin: !!i.invited_by_admin,
    }));
    return { active, pending };
  });

export const revokeSurveyTracker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ surveyId: z.string().uuid(), userId: z.string().uuid().optional(), inviteId: z.string().uuid().optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, survey } = await authorize(context, data.surveyId);
    if (data.userId) {
      await supabaseAdmin.from("survey_tracking_access").delete().eq("survey_id", survey.id).eq("faculty_user_id", data.userId);
    }
    if (data.inviteId) {
      await supabaseAdmin
        .from("survey_access_invites" as any)
        .update({ status: "revoked" })
        .eq("id", data.inviteId)
        .eq("survey_id", survey.id);
    }
    return { ok: true };
  });

const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) });

// Public: shows only the survey title and inviter name for a valid token.
export const getTrackingInvite = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin
      .from("survey_access_invites" as any)
      .select("survey_id, email, status, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    const invite = inv as any;
    if (!invite) return null;
    const { data: survey } = await supabaseAdmin
      .from("surveys")
      .select("title, creator_id")
      .eq("id", invite.survey_id)
      .maybeSingle();
    if (!survey) return null;
    const status: string =
      invite.status === "pending" && new Date(invite.expires_at).getTime() < Date.now() ? "expired" : invite.status;
    const [local, domain] = String(invite.email).split("@");
    return {
      surveyId: invite.survey_id as string,
      surveyTitle: survey.title,
      ownerName: (await nameOf(supabaseAdmin, survey.creator_id)) || "A CampusVerify researcher",
      maskedEmail: `${local.slice(0, 2)}${"•".repeat(Math.max(1, local.length - 2))}@${domain}`,
      status,
    };
  });

export const acceptTrackingInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin
      .from("survey_access_invites" as any)
      .select("id, survey_id, email, status, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    const invite = inv as any;
    if (!invite || invite.status === "revoked") throw new Error("This invitation is no longer valid.");
    if (invite.status === "accepted") return { ok: true, surveyId: invite.survey_id as string };
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("This invitation has expired. Ask the owner to send a new one.");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const myEmail = (u?.user?.email ?? "").toLowerCase();
    if (!u?.user?.email_confirmed_at) throw new Error("Please confirm your email address first.");
    if (myEmail !== String(invite.email).toLowerCase()) {
      throw new Error("This invitation was sent to a different email address. Sign in with that account to accept.");
    }
    const { error } = await supabaseAdmin
      .from("survey_tracking_access")
      .upsert(
        { survey_id: invite.survey_id, faculty_user_id: context.userId, granted_by: context.userId },
        { onConflict: "survey_id,faculty_user_id" },
      );
    if (error) throw new Error("Could not grant access. Please try again.");
    await supabaseAdmin
      .from("survey_access_invites" as any)
      .update({ status: "accepted", accepted_by: context.userId, accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    return { ok: true, surveyId: invite.survey_id as string };
  });
