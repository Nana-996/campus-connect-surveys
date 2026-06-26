import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowUpRight, GraduationCap, Globe2 } from "lucide-react";
import { ResendVerification } from "@/components/ResendVerification";
import { InterestTagInput, type InterestEntry } from "@/components/InterestTagInput";
import { AGE_RANGES, COUNTRIES, YEAR_OPTIONS, DEPARTMENT_SUGGESTIONS } from "@/lib/interests";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Create account — CampusVerify" },
      {
        name: "description",
        content:
          "Sign up for CampusVerify as a verified student or general user. Get free credits and start running or answering surveys today.",
      },
      { property: "og:title", content: "Create account — CampusVerify" },
      {
        property: "og:description",
        content:
          "Join CampusVerify — pick a Student or General account, claim free credits, and start running real surveys.",
      },
      { property: "og:url", content: "https://your-domain.com/signup" },
    ],
    links: [{ rel: "canonical", href: "https://your-domain.com/signup" }],
  }),
});

const ACADEMIC_RE = /(^|\.)edu$|\.edu\.[a-z]{2,6}$|\.ac\.[a-z]{2,6}$|\.uni\.[a-z]{2,6}$/i;

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [userType, setUserType] = useState<"student" | "general">("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [indexNumber, setIndexNumber] = useState("");
  const [country, setCountry] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [interests, setInterests] = useState<InterestEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [signupNotice, setSignupNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (value: string) => {
    const domain = value.trim().split("@")[1]?.toLowerCase().trim() ?? "";
    if (userType === "student" && domain && !ACADEMIC_RE.test(domain)) {
      setEmailError(
        `"${domain}" isn't a recognized university domain. Use an academic email ending in .edu, .edu.xx, or .ac.xx.`,
      );
    } else {
      setEmailError(null);
    }
  };

  // Don't auto-redirect signed-in users away from /signup — that creates a
  // race where clicks on the freshly-mounted form look like they caused a
  // mysterious bounce to /feed. Instead, show an explicit notice below.

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSignupNotice(null);
    const domain = email.trim().split("@")[1]?.toLowerCase().trim() ?? "";
    if (userType === "student" && !ACADEMIC_RE.test(domain)) {
      const message = `"${domain}" isn't recognized as a university domain. Use an academic email ending in .edu, .edu.xx (e.g. .edu.gh, .edu.ng), or .ac.xx (e.g. .ac.uk).`;
      setFormError(message);
      toast.error(message);
      return;
    }
    if (userType === "student" && !/^[A-Za-z0-9/_-]{1,32}$/.test(indexNumber.trim())) {
      const message =
        "Enter a valid index / student number (letters, numbers, dash, slash; max 32).";
      setFormError(message);
      toast.error(message);
      return;
    }
    if (userType === "student" && !department.trim()) {
      const message = "Department is required for student accounts.";
      setFormError(message);
      toast.error(message);
      return;
    }
    if (userType === "student" && !year) {
      const message = "Year is required for student accounts.";
      setFormError(message);
      toast.error(message);
      return;
    }
    if (userType === "general" && !country) {
      const message = "Country is required for general accounts.";
      setFormError(message);
      toast.error(message);
      return;
    }
    if (userType === "general" && !ageRange) {
      const message = "Age range is required for general accounts.";
      setFormError(message);
      toast.error(message);
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
            index_number: userType === "student" ? indexNumber.trim() : "",
            country: userType === "general" ? country : "",
            age_range: userType === "general" ? ageRange : "",
            interests: interests.map((i) => i.tag),
            interests_raw: interests.map((i) => i.raw),
          },
        },
      });
      if (error) throw error;
      setPassword("");
      setSignupNotice(
        `Account created for ${email}. Check your inbox for a verification email — click the link to confirm before signing in.`,
      );
      toast.success("Verification email sent. Confirm your address to continue.");
      navigate({ to: "/auth" });
    } catch (err: any) {
      const message = err.message ?? "Could not create account";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="font-serif text-3xl">
          CampusVerify
        </Link>
        <div>
          <p className="font-serif text-7xl leading-[0.9]">
            Join
            <br />
            <em>the conversation.</em>
          </p>
          <p className="mt-6 max-w-sm text-sm opacity-80">
            Students get verified campus-scoped surveys. General users can run public surveys too.
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
          <p className="mt-2 text-sm text-muted-foreground">Pick the account type that fits you.</p>

          {!loading && user && (
            <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
              You're already signed in as <span className="font-semibold">{user.email}</span>.{" "}
              <Link to="/feed" className="font-semibold underline">
                Go to feed
              </Link>{" "}
              or{" "}
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                className="font-semibold underline"
              >
                sign out
              </button>{" "}
              to create a different account.
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setUserType("student");
                setEmailError(null);
                validateEmail(email);
              }}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                userType === "student"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-foreground/15 bg-card hover:border-foreground/40"
              }`}
            >
              <GraduationCap className="h-5 w-5" />
              <p className="mt-2 font-serif text-xl">Student</p>
              <p className="text-[11px] opacity-80">Campus-scoped surveys</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType("general");
                setEmailError(null);
              }}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                userType === "general"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-foreground/15 bg-card hover:border-foreground/40"
              }`}
            >
              <Globe2 className="h-5 w-5" />
              <p className="mt-2 font-serif text-xl">General</p>
              <p className="text-[11px] opacity-80">Public surveys</p>
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider">
                Full name
              </Label>
              <Input
                id="name"
                required
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setFormError(null);
                }}
                className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider">
                {userType === "student" ? "University email" : "Email"}
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError(null);
                  validateEmail(e.target.value);
                }}
                onBlur={(e) => validateEmail(e.target.value)}
                placeholder={userType === "student" ? "you@yourschool.edu" : "you@example.com"}
                className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card"
                aria-invalid={!!emailError}
              />
              {userType === "student" && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Must end in <code>.edu</code>, <code>.edu.xx</code>, or <code>.ac.xx</code>.
                </p>
              )}
              {emailError && <p className="mt-1 text-[11px] text-destructive">{emailError}</p>}
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider">
                Password
              </Label>
              <PasswordInput
                id="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFormError(null);
                }}
                className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card"
              />
            </div>
            {userType === "student" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dept" className="text-xs font-semibold uppercase tracking-wider">
                    Department <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="dept"
                    list="dept-suggestions"
                    required
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      setFormError(null);
                    }}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (!v) return;
                      const match = DEPARTMENT_SUGGESTIONS.find(
                        (d) => d.toLowerCase() === v.toLowerCase(),
                      );
                      if (match && match !== v) setDepartment(match);
                    }}
                    placeholder="Start typing… e.g. Pharmacy"
                    className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card"
                  />
                  <datalist id="dept-suggestions">
                    {DEPARTMENT_SUGGESTIONS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="year" className="text-xs font-semibold uppercase tracking-wider">
                    Year <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={year}
                    onValueChange={(v) => {
                      setYear(v);
                      setFormError(null);
                    }}
                  >
                    <SelectTrigger
                      id="year"
                      className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card"
                    >
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {userType === "student" && (
              <div>
                <Label htmlFor="indexno" className="text-xs font-semibold uppercase tracking-wider">
                  Index / Student number
                </Label>
                <Input
                  id="indexno"
                  required
                  value={indexNumber}
                  onChange={(e) => {
                    setIndexNumber(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. 10876543 or UG/2024/0123"
                  maxLength={32}
                  className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card font-mono"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Used by your faculty managers to track survey completion. Visible only to admins
                  and managers at your university.
                </p>
              </div>
            )}
            {userType === "general" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="country"
                    className="text-xs font-semibold uppercase tracking-wider"
                  >
                    Country
                  </Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger
                      id="country"
                      className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card"
                    >
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="age" className="text-xs font-semibold uppercase tracking-wider">
                    Age range
                  </Label>
                  <Select value={ageRange} onValueChange={setAgeRange}>
                    <SelectTrigger
                      id="age"
                      className="mt-1.5 h-11 rounded-xl border-foreground/25 bg-card"
                    >
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_RANGES.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider">Interests</Label>
              <div className="mt-1.5">
                <InterestTagInput
                  value={interests}
                  onChange={setInterests}
                  placeholder="e.g. crypto, k-pop, hiking…"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                These help us show you surveys that actually match what you care about.
              </p>
            </div>
            {formError && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {formError}
              </div>
            )}
            {signupNotice && (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
                {signupNotice}
              </div>
            )}
            <Button
              type="submit"
              className="h-12 w-full rounded-full bg-primary text-base"
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Create account"}
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth" className="font-semibold text-foreground underline">
              Log in
            </Link>
          </p>
          <div className="mt-3 text-center text-xs text-muted-foreground">
            Didn't get the verification email? <ResendVerification defaultEmail={email} />
          </div>
        </div>
      </div>
    </div>
  );
}
