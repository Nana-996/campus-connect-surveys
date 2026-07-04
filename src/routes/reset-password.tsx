import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, Globe2 } from "lucide-react";

const searchSchema = z.object({ as: z.enum(["student", "general"]).optional() });

// Capture the URL synchronously at module load, before the shared supabase
// client's detectSessionInUrl runs and strips the recovery tokens from the
// address bar.
const initialRecoveryHref = typeof window !== "undefined" ? window.location.href : "";

export const Route = createFileRoute("/reset-password")({
  validateSearch: searchSchema,
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Set a new password — CampusVerify" },
      { name: "description", content: "Choose a new password for your CampusVerify account." },
    ],
    links: [{ rel: "canonical", href: "https://campus-spotlight-verify.lovable.app/reset-password" }],
  }),
});

function parseRecoveryTokens(href: string) {
  if (!href) return {};
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const get = (k: string) => url.searchParams.get(k) ?? hash.get(k);
  return {
    error: get("error_description") ?? get("error"),
    code: get("code"),
    tokenHash: get("token_hash"),
    type: (get("type") ?? "recovery") as EmailOtpType,
    accessToken: hash.get("access_token"),
    refreshToken: hash.get("refresh_token"),
  };
}

function cleanUrl() {
  if (typeof window === "undefined") return;
  const u = new URL(window.location.href);
  for (const k of ["code", "token_hash", "type", "error", "error_description"]) {
    u.searchParams.delete(k);
  }
  u.hash = "";
  window.history.replaceState({}, "", u.pathname + (u.search || ""));
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const tab = search.as ?? "student";
  const isStudent = tab === "student";
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validated = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const markReady = () => {
      if (cancelled || validated.current) return;
      validated.current = true;
      setReady(true);
      setError(null);
      cleanUrl();
    };

    // 1. Listen for the main client's automatic URL detection. Supabase fires
    //    PASSWORD_RECOVERY as soon as it finishes parsing the recovery hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        markReady();
      }
    });

    // 2. Manually validate the link too, in case the main client already
    //    consumed the URL before this effect mounted OR if the URL uses the
    //    ?code=/token_hash query variants that need an exchange call.
    const validate = async () => {
      const parsed = parseRecoveryTokens(initialRecoveryHref || (typeof window !== "undefined" ? window.location.href : ""));

      if (parsed.error) {
        if (!cancelled && !validated.current) {
          setError(decodeURIComponent(parsed.error.replace(/\+/g, " ")));
        }
        return;
      }

      try {
        if (parsed.accessToken && parsed.refreshToken) {
          const { error: e } = await supabase.auth.setSession({
            access_token: parsed.accessToken,
            refresh_token: parsed.refreshToken,
          });
          if (e) throw e;
          markReady();
          return;
        }
        if (parsed.tokenHash) {
          const { error: e } = await supabase.auth.verifyOtp({
            token_hash: parsed.tokenHash,
            type: parsed.type,
          });
          if (e) throw e;
          markReady();
          return;
        }
        if (parsed.code) {
          const { error: e } = await supabase.auth.exchangeCodeForSession(parsed.code);
          if (e) throw e;
          markReady();
          return;
        }

        // No token in URL — the main client may still be finishing its own
        // auto-detection, or the user may already be signed in. Poll briefly.
        const deadline = Date.now() + 3000;
        while (!cancelled && !validated.current && Date.now() < deadline) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            markReady();
            return;
          }
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!cancelled && !validated.current) {
          setError("This reset link is missing or expired. Request a new link below and open the most recent email only once.");
        }
      } catch (err: unknown) {
        console.error("[reset-password] validation failed", err);
        const message = err instanceof Error ? err.message : "Reset link is invalid or has expired. Request a new one.";
        if (!cancelled && !validated.current) setError(message);
      }
    };

    validate();
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        throw new Error("Your recovery session has expired. Please request a new reset link.");
      }
      const { error: e } = await supabase.auth.updateUser({ password });
      if (e) throw e;
      toast.success("Password updated. You're signed in.");
      navigate({ to: "/feed" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not update password";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
        {isStudent ? <GraduationCap className="h-3 w-3" /> : <Globe2 className="h-3 w-3" />}
        {isStudent ? "Student account" : "General account"}
      </span>
      <h1 className="font-serif text-5xl leading-[0.95]">Set a new <em className="text-primary">password.</em></h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Choose something you'll remember. You'll be signed in right after.
      </p>

      {!ready ? (
        <p className={`mt-8 rounded-2xl border p-5 text-sm ${error ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-foreground/15 bg-card text-muted-foreground"}`}>
          {error ?? "Verifying your reset link…"}{" "}
          {error && (
            <>
              Request a new link from{" "}
              <Link to="/forgot-password" search={{ as: tab }} className="font-semibold underline text-foreground">
                Forgot password
              </Link>
              .
            </>
          )}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="pw" className="text-xs font-semibold uppercase tracking-wider">New password</Label>
            <PasswordInput id="pw" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card" />
          </div>
          <div>
            <Label htmlFor="pw2" className="text-xs font-semibold uppercase tracking-wider">Confirm password</Label>
            <PasswordInput id="pw2" required minLength={6} value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card" />
          </div>
          {error && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button type="submit" className="h-12 w-full rounded-full bg-primary text-base" disabled={submitting}>
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
    </div>
  );
}
