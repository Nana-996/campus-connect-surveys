import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  email: z.string().email(),
  redirectTo: z.string().url(),
});

type ResetOutcome = "reset_sent" | "confirmation_sent" | "unknown";

/**
 * Password-reset entry point.
 *
 * Supabase silently ignores password-reset requests for accounts whose email
 * was never confirmed, which left those users stuck: reset mails never arrived
 * and sign-in failed with "Email not confirmed". This function detects that
 * case and sends the confirmation email instead, so the user always gets
 * something actionable in their inbox.
 *
 * Never reveals whether an account exists (outcome "unknown" is generic).
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ outcome: ResetOutcome }> => {
    const email = data.email.trim().toLowerCase();
    const url = process.env["SUPABASE_URL"]!;
    const anonKey = process.env["SUPABASE_PUBLISHABLE_KEY"]!;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up the account (admin API supports an email filter).
    let confirmed: boolean | null = null;
    try {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (!error && list?.users) {
        const match = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
        if (match) confirmed = Boolean(match.email_confirmed_at ?? match.confirmed_at);
      }
    } catch {
      confirmed = null;
    }

    const post = async (path: string, body: unknown) =>
      fetch(`${url}/auth/v1/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify(body),
      });

    if (confirmed === false) {
      // Unconfirmed account: confirm the address first.
      await post("resend", {
        type: "signup",
        email,
        options: { email_redirect_to: data.redirectTo.replace(/\/reset-password.*$/, "/auth") },
      });
      return { outcome: "confirmation_sent" };
    }

    await post("recover", { email, gotrue_meta_security: {} });
    return { outcome: confirmed === true ? "reset_sent" : "unknown" };
  });
