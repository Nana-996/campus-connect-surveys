// Server-only helper that renders a registered React Email template and queues it
// for delivery. Used by flows that have no signed-in user (e.g. public donations),
// which cannot call the JWT-protected /lovable/email/transactional/send route.
import * as React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "campus-verify";
const SENDER_DOMAIN = "notify.campus-verify.live";
const FROM_DOMAIN = "campus-verify.live";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function enqueueTemplateEmail(input: {
  templateName: string;
  recipientEmail: string;
  templateData?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const template = TEMPLATES[input.templateName];
  if (!template) throw new Error(`Unknown email template: ${input.templateName}`);

  const recipient = template.to || input.recipientEmail;
  if (!recipient) throw new Error("recipientEmail is required");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const normalized = recipient.toLowerCase();
  const messageId = crypto.randomUUID();

  const { data: suppressed, error: suppressionError } = await supabaseAdmin
    .from("suppressed_emails")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();
  if (suppressionError) throw new Error("Failed to verify suppression status");
  if (suppressed) return { sent: false, reason: "email_suppressed" };

  const { data: existingToken } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalized)
    .maybeSingle();

  let unsubscribeToken = existingToken?.token ?? "";
  if (!existingToken) {
    unsubscribeToken = generateToken();
    await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .upsert({ token: unsubscribeToken, email: normalized }, { onConflict: "email", ignoreDuplicates: true });
    const { data: stored } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", normalized)
      .maybeSingle();
    if (!stored) throw new Error("Failed to store unsubscribe token");
    unsubscribeToken = stored.token;
  } else if (existingToken.used_at) {
    return { sent: false, reason: "email_suppressed" };
  }

  const element = React.createElement(template.component, input.templateData ?? {});
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof template.subject === "function"
      ? template.subject((input.templateData ?? {}) as Record<string, unknown>)
      : template.subject;

  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: input.templateName,
    recipient_email: recipient,
    status: "pending",
  });

  const { error: enqueueError } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: "transactional",
      label: input.templateName,
      idempotency_key: input.idempotencyKey ?? messageId,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    } as never,
  });

  if (enqueueError) {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: recipient,
      status: "failed",
      error_message: "Failed to enqueue email",
    });
    throw new Error("Failed to enqueue email");
  }

  return { sent: true };
}
