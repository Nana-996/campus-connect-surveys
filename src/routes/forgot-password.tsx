import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { requestPasswordReset } from "@/lib/password-reset.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail, GraduationCap, Globe2 } from "lucide-react";


const searchSchema = z.object({ as: z.enum(["student", "general"]).optional() });

export const Route = createFileRoute("/forgot-password")({
  validateSearch: searchSchema,
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset your password — CampusVerify" },
      { name: "description", content: "Request a password reset link for your CampusVerify account." },
    ],
    links: [{ rel: "canonical", href: "https://campus-verify.live/forgot-password" }],
  }),
});

type AccountTab = "student" | "general";

function ForgotPasswordPage() {
  const search = Route.useSearch();
  const [tab, setTab] = useState<AccountTab>(search.as ?? "student");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await requestReset({
        data: {
          email: email.trim(),
          redirectTo: `${window.location.origin}/reset-password?as=${tab}`,
        },
      });
      setOutcome(res.outcome);
      setSent(true);
      toast.success(
        res.outcome === "confirmation_sent"
          ? "Confirm your email first — we just sent you a confirmation link."
          : "Check your inbox for a reset link.",
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send reset email");
    } finally {
      setSubmitting(false);
    }
  };


  const isStudent = tab === "student";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link to="/auth" search={{ as: tab }} className="mb-6 inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to log in
      </Link>
      <h1 className="font-serif text-5xl leading-[0.95]">Forgot <em className="text-primary">password?</em></h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Pick your account type, then enter your email. We'll send a secure link.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setTab("student")}
          className={`rounded-2xl border-2 p-3 text-left transition ${
            isStudent ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 bg-card"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <p className="mt-1 font-serif text-lg leading-none">Student</p>
        </button>
        <button
          type="button"
          onClick={() => setTab("general")}
          className={`rounded-2xl border-2 p-3 text-left transition ${
            !isStudent ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 bg-card"
          }`}
        >
          <Globe2 className="h-4 w-4" />
          <p className="mt-1 font-serif text-lg leading-none">General</p>
        </button>
      </div>

      {sent ? (
        <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-sm">
          <p className="font-semibold">Check your inbox.</p>
          <p className="mt-1 text-muted-foreground">
            If a {isStudent ? "student" : "general"} account exists for <strong>{email}</strong>, you'll get a reset link shortly. The link expires in 1 hour.
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
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider">
              {isStudent ? "University email" : "Email"}
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isStudent ? "you@yourschool.edu" : "you@example.com"}
              className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card"
            />
          </div>
          <Button type="submit" className="h-12 w-full rounded-full bg-primary text-base" disabled={submitting}>
            <Mail className="mr-2 h-4 w-4" />
            {submitting ? "Sending…" : `Send link to ${isStudent ? "Student" : "General"} account`}
          </Button>
        </form>
      )}
    </div>
  );
}
