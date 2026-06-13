import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowUpRight, Sparkles, GraduationCap, Globe2 } from "lucide-react";
import { ResendVerification } from "@/components/ResendVerification";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  as: z.enum(["student", "general"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Log in — CampusVerify" },
      { name: "description", content: "Log in to CampusVerify as a verified student or general user to access your survey feed, credits, and responses." },
      { property: "og:title", content: "Log in — CampusVerify" },
      { property: "og:description", content: "Sign in to CampusVerify to access your campus or public survey feed and earned credits." },
      { property: "og:url", content: "https://campus-spotlight-verify.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://campus-spotlight-verify.lovable.app/auth" }],
  }),
});

type AccountTab = "student" | "general";

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, loading, signIn, signOut } = useAuth();

  const [tab, setTab] = useState<AccountTab>(search.as ?? "student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/feed" });
    else if (!loading && search.mode === "signup") navigate({ to: "/signup", replace: true });
  }, [user, loading, search.mode, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);

      // Hard block: verify the account type matches the selected tab.
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      let accountType: AccountTab = "student";
      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", uid)
          .maybeSingle();
        accountType = (prof?.user_type === "general" ? "general" : "student") as AccountTab;
      }

      if (accountType !== tab) {
        await signOut();
        const otherLabel = accountType === "general" ? "General" : "Student";
        const message = `This is a ${otherLabel} account. Switch to the ${otherLabel} tab to log in.`;
        setFormError(message);
        setTab(accountType);
        toast.error(message);
        return;
      }

      navigate({ to: "/feed" });
    } catch (err: any) {
      const message = err.message === "Invalid login credentials"
        ? "Those credentials did not match a verified account. If you just signed up, verify your email first or resend the verification email below."
        : err.message ?? "Something went wrong";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const isStudent = tab === "student";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="font-serif text-3xl">CampusVerify</Link>
        <div>
          <p className="font-serif text-7xl leading-[0.9]">
            Welcome<br /><em>{isStudent ? "back to campus." : "back."}</em>
          </p>
          <p className="mt-6 max-w-sm text-sm opacity-80">
            {isStudent
              ? "Pick up where you left off — your campus feed, your credits, your responses."
              : "Pick up where you left off — public surveys, your credits, your responses."}
          </p>
        </div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] opacity-70">
          <span>vol. 01</span>
          <span>{isStudent ? "verified students only" : "general public"}</span>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-block font-serif text-3xl text-primary lg:hidden">
            CampusVerify
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-highlight-foreground">
            <Sparkles className="h-3 w-3" /> log in
          </span>
          <h1 className="mt-4 font-serif text-5xl leading-[0.95]">Hello again.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose your account type, then log in.
          </p>

          {/* Account-type tabs */}
          <div className="mt-6 grid grid-cols-2 gap-3" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={isStudent}
              onClick={() => { setTab("student"); setFormError(null); }}
              className={`rounded-2xl border-2 p-3 text-left transition ${
                isStudent
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-foreground/15 bg-card hover:border-foreground/40"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <p className="mt-1 font-serif text-lg leading-none">Student</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider opacity-80">.edu / .ac.xx</p>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isStudent}
              onClick={() => { setTab("general"); setFormError(null); }}
              className={`rounded-2xl border-2 p-3 text-left transition ${
                !isStudent
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-foreground/15 bg-card hover:border-foreground/40"
              }`}
            >
              <Globe2 className="h-4 w-4" />
              <p className="mt-1 font-serif text-lg leading-none">General</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider opacity-80">public account</p>
            </button>
          </div>

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
                onChange={(e) => { setEmail(e.target.value); setFormError(null); }}
                placeholder={isStudent ? "you@yourschool.edu" : "you@example.com"}
                className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card"
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider">Password</Label>
                <Link
                  to="/forgot-password"
                  search={{ as: tab }}
                  className="text-[11px] font-semibold uppercase tracking-wider text-primary hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <PasswordInput
                id="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card"
              />
            </div>
            {formError && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {formError}
              </div>
            )}
            <Button type="submit" className="h-12 w-full rounded-full bg-primary text-base" disabled={submitting}>
              {submitting ? "Please wait…" : `Log in as ${isStudent ? "Student" : "General"}`}
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="font-semibold text-foreground underline">Create an account</Link>
          </p>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Didn't get the verification email?{" "}
            <ResendVerification defaultEmail={email} />
          </div>

        </div>
      </div>
    </div>
  );
}
