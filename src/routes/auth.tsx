import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

const searchSchema = z.object({ mode: z.enum(["login", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function isUniversityEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain) return false;
  // accept .edu, .ac.*, .edu.*
  return /\.edu$/.test(domain) || /\.ac\.[a-z]{2,}$/.test(domain) || /\.edu\.[a-z]{2,}$/.test(domain);
}

function AuthPage() {
  const { mode = "login" } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/feed" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignup && !isUniversityEmail(email)) {
      toast.error("Please use your university email (.edu, .ac.uk, etc.)");
      return;
    }
    setSubmitting(true);
    try {
      if (isSignup) {
        const domain = email.split("@")[1].toLowerCase();
        const uniName = domain.split(".")[0].replace(/^./, (c) => c.toUpperCase()) + " University";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/feed`,
            data: { full_name: fullName, department, year, university_name: uniName },
          },
        });
        if (error) throw error;
        toast.success("Check your email to verify your account, then log in.");
        navigate({ to: "/auth", search: { mode: "login" } });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/feed" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
          <GraduationCap className="h-5 w-5" /> CampusVerify
        </Link>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup ? "Use your university email to get verified." : "Log in to your campus."}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {isSignup && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            )}
            <div>
              <Label htmlFor="email">University email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourschool.edu" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {isSignup && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dept">Department</Label>
                  <Input id="dept" required value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Psychology" />
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input id="year" required value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year 2" />
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New to CampusVerify?"}{" "}
            <Link
              to="/auth"
              search={{ mode: isSignup ? "login" : "signup" }}
              className="font-semibold text-primary hover:underline"
            >
              {isSignup ? "Log in" : "Sign up"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
