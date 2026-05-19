import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { ResendVerification } from "@/components/ResendVerification";

const searchSchema = z.object({ mode: z.enum(["login", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading, signIn, enterPreviewMode } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/feed" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate({ to: "/feed" });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left poster panel */}
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="font-serif text-3xl">CampusVerify</Link>
        <div>
          <p className="font-serif text-7xl leading-[0.9]">
            Welcome<br /><em>back to campus.</em>
          </p>
          <p className="mt-6 max-w-sm text-sm opacity-80">
            Pick up where you left off — your feed, your credits, your responses.
          </p>
        </div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] opacity-70">
          <span>vol. 01</span>
          <span>verified students only</span>
        </div>
      </div>

      {/* Right form panel */}
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
            Use your university email and password.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider">University email</Label>
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
            <div>
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card"
              />
            </div>
            <Button type="submit" className="h-12 w-full rounded-full bg-primary text-base" disabled={submitting}>
              {submitting ? "Please wait…" : "Log in"}
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              type="button"
              className="h-12 w-full rounded-full border-foreground/30 text-base"
              variant="outline"
              onClick={() => {
                enterPreviewMode();
                navigate({ to: "/feed" });
              }}
            >
              Enter preview mode
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
