import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Set a new password — CampusVerify" },
      { name: "description", content: "Choose a new password for your CampusVerify account." },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase fires a PASSWORD_RECOVERY event once it hydrates the recovery session
  // from the URL hash. Only then can we call updateUser.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    // also handle the case where the session is already established
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
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
      <h1 className="font-serif text-5xl leading-[0.95]">Set a new <em className="text-primary">password.</em></h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Choose something you'll remember. You'll be signed in right after.
      </p>

      {!ready ? (
        <p className="mt-8 rounded-2xl border border-foreground/15 bg-card p-5 text-sm text-muted-foreground">
          Waiting for the reset link to validate… If you opened this page directly,
          request a new link from <Link to="/forgot-password" className="font-semibold underline text-foreground">Forgot password</Link>.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="pw" className="text-xs font-semibold uppercase tracking-wider">New password</Label>
            <Input id="pw" type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card" />
          </div>
          <div>
            <Label htmlFor="pw2" className="text-xs font-semibold uppercase tracking-wider">Confirm password</Label>
            <Input id="pw2" type="password" required minLength={6} value={confirm}
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
