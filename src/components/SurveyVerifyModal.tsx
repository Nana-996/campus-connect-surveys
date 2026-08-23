import { useEffect, useState } from "react";
import { X, ShieldCheck, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

type Props = {
  open: boolean;
  onClose: () => void;
  onVerified?: () => void;
  surveyTitle?: string;
};

export function SurveyVerifyModal({ open, onClose, onVerified, surveyTitle }: Props) {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSent, setSignupSent] = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Check your details";
      setError(msg);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        // Send the verification email back to this exact survey URL so the
        // respondent lands on the questions immediately after confirming.
        const returnTo = typeof window !== "undefined" ? window.location.href : undefined;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: returnTo,
            data: { user_type: "general", full_name: "" },
          },
        });
        if (signUpError) throw signUpError;
        // If email confirmation is required, no session is returned. Show the
        // user a clear "check your inbox" state instead of silently closing.
        if (!data.session) {
          setSignupSent(true);
          return;
        }
        toast.success("Account created. You're in.");
      } else {
        await signIn(parsed.data.email, parsed.data.password);
        toast.success("Welcome back.");
      }
      onVerified?.();
      onClose();
    } catch (err: any) {
      const msg = err?.message ?? "Verification failed. Try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-foreground/10 bg-background shadow-2xl sm:rounded-3xl"
      >
        {/* Header band */}
        <div className="relative bg-primary px-6 py-7 text-primary-foreground">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close verification"
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15 text-primary-foreground transition hover:bg-primary-foreground/25"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">
            <ShieldCheck className="h-3.5 w-3.5" />
            CampusVerify
          </div>
          <h2 id="verify-title" className="mt-3 font-serif text-3xl leading-tight">
            Almost done — save your answers
          </h2>
          <p className="mt-1.5 text-sm opacity-90">
            Create a quick account (or log in) and we'll submit the answers you just filled in.
          </p>

          {surveyTitle && (
            <p className="mt-3 truncate text-[11px] font-semibold uppercase tracking-wider opacity-80">
              For: {surveyTitle}
            </p>
          )}
        </div>

        {/* Form */}
        {signupSent ? (
          <div className="space-y-4 px-6 py-6 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-2xl">Check your inbox</h3>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to <strong className="text-foreground">{email}</strong>.
              Open it on this device — you'll come right back here to answer the survey.
            </p>
            <p className="text-xs text-muted-foreground">
              No email after a minute? Check spam, or{" "}
              <button
                type="button"
                onClick={() => { setSignupSent(false); setMode("login"); setPassword(""); }}
                className="font-semibold text-primary underline"
              >
                log in instead
              </button>
              .
            </p>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="h-11 w-full rounded-full"
            >
              Close
            </Button>
          </div>
        ) : (
        <form onSubmit={submit} className="space-y-4 px-6 py-6">
          <div className="space-y-1.5">
            <Label htmlFor="verify-email" className="text-xs font-bold uppercase tracking-wider">
              Email
            </Label>
            <Input
              id="verify-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="verify-password" className="text-xs font-bold uppercase tracking-wider">
              Password
            </Label>
            <PasswordInput
              id="verify-password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "Create a password (8+ chars)" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={72}
              required
            />
          </div>

          {error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-11 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
              </span>
            ) : (
              "Continue to Survey"
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode((m) => (m === "signup" ? "login" : "signup"));
            }}
            className="block w-full text-center text-sm text-muted-foreground transition hover:text-foreground"
          >
            {mode === "signup" ? (
              <>Already have an account? <span className="font-semibold text-primary underline-offset-2 hover:underline">Log in</span></>
            ) : (
              <>New here? <span className="font-semibold text-primary underline-offset-2 hover:underline">Create an account</span></>
            )}
          </button>

          <p className="pt-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
            Verified responses keep research credible.
          </p>
        </form>
        )}
      </div>
    </div>
  );
}
