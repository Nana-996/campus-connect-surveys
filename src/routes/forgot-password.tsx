import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset your password — CampusVerify" },
      { name: "description", content: "Request a password reset link for your CampusVerify account." },
    ],
  }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Check your inbox for a reset link.");
    } catch (err: any) {
      toast.error(err.message ?? "Could not send reset email");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link to="/auth" className="mb-6 inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to log in
      </Link>
      <h1 className="font-serif text-5xl leading-[0.95]">Forgot <em className="text-primary">password?</em></h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Enter the email you signed up with. We'll send a secure link to set a new password.
      </p>

      {sent ? (
        <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-sm">
          <p className="font-semibold">Check your inbox.</p>
          <p className="mt-1 text-muted-foreground">
            If an account exists for <strong>{email}</strong>, you'll get a reset link shortly. The link expires in 1 hour.
          </p>
          <button
            type="button"
            onClick={() => { setSent(false); setEmail(""); }}
            className="mt-3 text-xs font-semibold underline"
          >
            Send to a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourschool.edu"
              className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card"
            />
          </div>
          <Button type="submit" className="h-12 w-full rounded-full bg-primary text-base" disabled={submitting}>
            <Mail className="mr-2 h-4 w-4" />
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </div>
  );
}
