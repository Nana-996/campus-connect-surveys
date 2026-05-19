import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowUpRight, GraduationCap, Globe2 } from "lucide-react";
import { ResendVerification } from "@/components/ResendVerification";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

const ACADEMIC_RE = /(^|\.)edu$|\.edu\.[a-z]{2,3}$|\.ac\.[a-z]{2,3}$/i;

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [userType, setUserType] = useState<"student" | "general">("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/feed" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    if (userType === "student" && !ACADEMIC_RE.test(domain)) {
      toast.error("Student accounts require a university email (.edu, .edu.xx or .ac.xx).");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/feed`,
          data: {
            full_name: fullName,
            user_type: userType,
            department: userType === "student" ? department : "",
            year: userType === "student" ? year : "",
          },
        },
      });
      if (error) throw error;
      toast.success("Check your email to verify your account.");
      navigate({ to: "/auth" });
    } catch (err: any) {
      toast.error(err.message ?? "Could not create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="font-serif text-3xl">CampusVerify</Link>
        <div>
          <p className="font-serif text-7xl leading-[0.9]">
            Join<br /><em>the conversation.</em>
          </p>
          <p className="mt-6 max-w-sm text-sm opacity-80">
            Students get campus-scoped surveys at the lowest rate. General users can run public surveys too.
          </p>
        </div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] opacity-70">
          <span>vol. 01</span>
          <span>verified email required</span>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-block font-serif text-3xl text-primary lg:hidden">
            CampusVerify
          </Link>
          <h1 className="font-serif text-5xl leading-[0.95]">Create account.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick the account type that fits you.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setUserType("student")}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                userType === "student"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-foreground/15 bg-card hover:border-foreground/40"
              }`}
            >
              <GraduationCap className="h-5 w-5" />
              <p className="mt-2 font-serif text-xl">Student</p>
              <p className="text-[11px] opacity-80">Campus-scoped · best price</p>
            </button>
            <button
              type="button"
              onClick={() => setUserType("general")}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                userType === "general"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-foreground/15 bg-card hover:border-foreground/40"
              }`}
            >
              <Globe2 className="h-5 w-5" />
              <p className="mt-2 font-serif text-xl">General</p>
              <p className="text-[11px] opacity-80">Public surveys · 1.5× pricing</p>
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider">Full name</Label>
              <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card" />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider">
                {userType === "student" ? "University email" : "Email"}
              </Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={userType === "student" ? "you@yourschool.edu" : "you@example.com"}
                className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card" />
              {userType === "student" && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Must end in <code>.edu</code>, <code>.edu.xx</code>, or <code>.ac.xx</code>.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card" />
            </div>
            {userType === "student" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dept" className="text-xs font-semibold uppercase tracking-wider">Department</Label>
                  <Input id="dept" value={department} onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Psychology" className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card" />
                </div>
                <div>
                  <Label htmlFor="year" className="text-xs font-semibold uppercase tracking-wider">Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card"><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>
                      {["Year 1","Year 2","Year 3","Year 4","Postgrad"].map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <Button type="submit" className="h-12 w-full rounded-full bg-primary text-base" disabled={submitting}>
              {submitting ? "Creating…" : "Create account"}
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth" className="font-semibold text-foreground underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
