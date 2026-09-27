// Server-only helper that renders a registered React Email template and sends
// it through Lovable's managed email delivery. Used by flows that have no
// signed-in user (e.g. public donations) and by the admin broadcast tool.
// Delivery, retries, suppression, and unsubscribe handling are managed by
// Lovable; this helper keeps the app's email_send_log audit trail.
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

export async function enqueueTemplateEmail(input: {
  templateName: string;
  recipientEmail: string;
  templateData?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const messageId = crypto.randomUUID();

  const log = async (status: string, errorMessage?: string) => {
    const { error } = await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: input.recipientEmail,
      status,
      ...(errorMessage ? { error_message: errorMessage.slice(0, 1000) } : {}),
    });
    if (error) console.error("Failed to write email_send_log", { status, error });
  };

  try {
    const result = await sendTemplateEmail(input.templateName, input.recipientEmail, {
      templateData: input.templateData,
      idempotencyKey: input.idempotencyKey ?? messageId,
    });
    if (result.sent) {
      await log("sent");
      return { sent: true };
    }
    await log("suppressed");
    return { sent: false, reason: "email_suppressed" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await log("failed", message);
    throw e instanceof Error ? e : new Error(message);
  }
}
