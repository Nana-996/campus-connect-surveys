import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  email: z.string().email(),
  redirectTo: z.string().url(),
});

type ResetOutcome = "reset_sent" | "confirmation_sent" | "unknown";

// Origins the reset/confirmation links may point at. Anything else is a
// phishing vector, so we fall back to the canonical site instead of trusting
// caller-supplied URLs.
const CANONICAL_SITE = "https://campus-verify.live";

function safeRedirect(candidate: string): string {
  const allowed = new Set(
    [
      CANONICAL_SITE,
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
    const url = new URL(candidate);
    const isLocal =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".lovableproject.com") ||
      url.hostname.endsWith(".lovable.app");
    if (allowed.has(url.origin) || isLocal) {
      return `${url.origin}${url.pathname}`;
    }
    // Keep the intended path, but force it back onto our own domain.
    return `${CANONICAL_SITE}${url.pathname}`;
  } catch {
    return `${CANONICAL_SITE}/reset-password`;
  }
}

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
    const redirectTo = safeRedirect(data.redirectTo);
    const url = process.env["SUPABASE_URL"]!;
    const anonKey = process.env["SUPABASE_PUBLISHABLE_KEY"]!;


    // Look up the account by email (admin API supports a filter query).
    let confirmed: boolean | null = null;
    try {
      const res = await fetch(
        `${url}/auth/v1/admin/users?page=1&per_page=50&filter=${encodeURIComponent(email)}`,
        {
          headers: {
            apikey: process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
            Authorization: `Bearer ${process.env["SUPABASE_SERVICE_ROLE_KEY"]!}`,
          },
        },
      );
      if (res.ok) {
        const body = (await res.json()) as { users?: Array<Record<string, any>> };
        const match = (body.users ?? []).find(
          (u) => String(u["email"] ?? "").toLowerCase() === email,
        );
        if (match) confirmed = Boolean(match["email_confirmed_at"] ?? match["confirmed_at"]);
      }
    } catch {
      confirmed = null;
    }

    const post = async (path: string, redirect: string, body: unknown) =>
      fetch(`${url}/auth/v1/${path}?redirect_to=${encodeURIComponent(redirect)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify(body),
      });

    if (confirmed === false) {
      // Unconfirmed account: Supabase ignores recovery requests for these,
      // so confirm the address first.
      const authUrl = redirectTo.replace(/\/reset-password.*$/, "/auth");
      await post("resend", authUrl, { type: "signup", email });
      return { outcome: "confirmation_sent" };
    }

    await post("recover", redirectTo, { email, gotrue_meta_security: {} });

    return { outcome: confirmed === true ? "reset_sent" : "unknown" };
  });

