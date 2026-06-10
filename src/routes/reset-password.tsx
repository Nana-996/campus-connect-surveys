import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, Globe2 } from "lucide-react";

const searchSchema = z.object({ as: z.enum(["student", "general"]).optional() });

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

  // Supabase auto-processes recovery links (PKCE ?code= and implicit
  // #access_token=...) via detectSessionInUrl. We listen for the resulting
  // session/event, and only fall back to a manual exchange when auto-detection
  // didn't fire (e.g. token_hash style links).
  useEffect(() => {
    let cancelled = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[reset-password] auth event", event, !!session);
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || session) {
        if (cancelled) return;
        setReady(true);
        setError(null);
      }
    });

    const cleanUrl = (url: URL) => {
      url.searchParams.delete("code");
      url.searchParams.delete("token_hash");
      url.searchParams.delete("type");
      url.hash = "";
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    };

    const validateLink = async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

      // Surface error returns from the email link (e.g. expired, otp_invalid).
      const errParam = url.searchParams.get("error_description") ?? hash.get("error_description")
        ?? url.searchParams.get("error") ?? hash.get("error");
      if (errParam) {
        console.error("[reset-password] link error", errParam);
        if (!cancelled) setError(decodeURIComponent(errParam.replace(/\+/g, " ")));
        return;
      }

      // Let Supabase's detectSessionInUrl run first.
      await new Promise((r) => setTimeout(r, 100));
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        if (cancelled) return;
        setReady(true);
        cleanUrl(url);
        return;
      }

      const code = url.searchParams.get("code") ?? hash.get("code");
      const tokenHash = url.searchParams.get("token_hash") ?? hash.get("token_hash");
      const type = (url.searchParams.get("type") ?? hash.get("type") ?? "recovery") as EmailOtpType;
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      try {
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
        } else if (tokenHash) {
          const { error: otpErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (otpErr) throw otpErr;
        } else if (accessToken && refreshToken) {
          const { error: sessionErr } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessionErr) throw sessionErr;
        } else {
          throw new Error("This page expects a reset link from your email. Request a new one.");
        }
        if (cancelled) return;
        setReady(true);
        cleanUrl(url);
      } catch (err: any) {
        console.error("[reset-password] validate failed", err);
        if (!cancelled) setError(err?.message ?? "Reset link is invalid or has expired. Request a new one.");
      }
    };
    validateLink();
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      navigate({ to: "/feed" });
    } catch (err: any) {
      setError(err.message ?? "Could not update password");
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
          {error ?? "Waiting for the reset link to validate…"} {" "}
          Request a new link from <Link to="/forgot-password" search={{ as: tab }} className="font-semibold underline text-foreground">Forgot password</Link>.
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
