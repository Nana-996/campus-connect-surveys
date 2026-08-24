import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, Sparkles, Clock, AlertTriangle, Globe2, Lock, GraduationCap } from "lucide-react";
import { DAILY_EARN_CAP, WEEKLY_EARN_CAP, EARNED_EXPIRY_DAYS } from "@/lib/credits";
import { ageLabel, AGE_RANGES, COUNTRIES, YEAR_OPTIONS, DEPARTMENT_SUGGESTIONS } from "@/lib/interests";
import { IndexBackfill } from "@/components/IndexBackfill";
import { SessionCard } from "@/components/SessionCard";
import { toast } from "sonner";
import { safeErrorMessage } from "@/lib/safe-error";

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
});

function Profile() {
  const { profile, user, refreshProfile } = useAuth();
  const [responses, setResponses] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [caps, setCaps] = useState<{ day_count: number; week_count: number } | null>(null);
  const [nextExpiry, setNextExpiry] = useState<string | null>(null);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [department, setDepartment] = useState((profile as any)?.department ?? "");
  const [year, setYear] = useState((profile as any)?.year ?? "");
  const [country, setCountry] = useState((profile as any)?.country ?? "");
  const [indexNumber, setIndexNumber] = useState((profile as any)?.index_number ?? "");
  const [ageRange, setAgeRange] = useState((profile as any)?.age_range ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.full_name ?? "");
    setDepartment((profile as any)?.department ?? "");
    setYear((profile as any)?.year ?? "");
    setCountry((profile as any)?.country ?? "");
    setIndexNumber((profile as any)?.index_number ?? "");
    setAgeRange((profile as any)?.age_range ?? "");
  }, [profile?.id, profile?.full_name, (profile as any)?.department, (profile as any)?.year, (profile as any)?.country, (profile as any)?.index_number, (profile as any)?.age_range]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [resps, led, c] = await Promise.all([
        supabase.from("survey_responses").select("id, created_at, survey:surveys(title)")
          .eq("respondent_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("credit_ledger").select("*").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(15),
        supabase.from("earning_caps").select("day_count, week_count").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      if (resps.error) console.warn("Profile responses request failed.", resps.error);
      if (led.error) console.warn("Credit ledger request failed.", led.error);
      if (c.error) console.warn("Earning caps request failed.", c.error);
      setResponses(resps.data ?? []);
      setLedger(led.data ?? []);
      setCaps(c.data ?? { day_count: 0, week_count: 0 });
      const earliest = (led.data ?? [])
        .filter((r: any) => r.wallet === "earned" && r.delta > 0 && r.expires_at)
        .sort((a: any, b: any) => +new Date(a.expires_at) - +new Date(b.expires_at))[0];
      setNextExpiry(earliest?.expires_at ?? null);
    })();
    return () => { active = false; };
  }, [user?.id]);

  if (!profile) return null;
  const isGeneral = profile.user_type === "general";
  const gradDate = (profile as any).graduation_date as string | null | undefined;
  const isAlumni = !isGeneral && !!gradDate && new Date(`${gradDate}T00:00:00`) < new Date(Date.now() - 30 * 864e5);


  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        {isGeneral ? "Your account" : "Your card"}
      </p>
      <h1 className="mt-1 font-serif text-5xl leading-[0.95]">
        Hello, <em className="text-primary">{profile.full_name?.split(" ")[0] || (isGeneral ? "friend" : "student")}.</em>
      </h1>

      {profile.is_flagged && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
          <div>
            <p className="font-semibold">Your account is under review.</p>
            <p className="text-muted-foreground">{profile.flag_reason ?? "Unusual activity detected."}</p>
          </div>
        </div>
      )}

      {isAlumni && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-foreground/20 bg-secondary p-4 text-sm">
          <GraduationCap className="h-4 w-4 mt-0.5" />
          <div>
            <p className="font-semibold">Your student access has ended.</p>
            <p className="text-muted-foreground">
              This account no longer earns free credits for answering surveys and publishes at
              general-account pricing using purchased credits.
            </p>
            <Link to="/buy-credits" className="mt-2 inline-block font-semibold underline">Buy credits</Link>
          </div>
        </div>
      )}

      <SessionCard />


      {!isGeneral && !((profile as any).index_number) && (
        <IndexBackfill currentDepartment={profile.department || ""} />
      )}


      {/* Personal info & edit name */}
      <section className="mt-8 rounded-3xl border border-foreground/15 bg-card p-6 shadow-paper">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-serif text-2xl leading-tight">Personal info</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">
            <Lock className="h-3 w-3" /> Private to you
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Only you can see this information. Your email is never shown publicly or to survey owners.
        </p>

        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) {
              toast.error("Name cannot be empty");
              return;
            }
            if (trimmed.length > 80) {
              toast.error("Name must be 80 characters or fewer");
              return;
            }
            const updates: Record<string, any> = { full_name: trimmed };
            if (!isGeneral) {
              const dept = department.trim();
              const idx = indexNumber.trim();
              if (idx && !/^[A-Za-z0-9/_-]{1,32}$/.test(idx)) {
                toast.error("Index number: letters, numbers, dash, slash; max 32.");
                return;
              }
              updates.department = dept;
              updates.year = year || null;
              updates.country = country || null;
              updates.index_number = idx || null;
            } else {
              updates.country = country || null;
              updates.age_range = ageRange || null;
            }
            setSaving(true);
            const { error } = await supabase
              .from("profiles")
              .update(updates as any)
              .eq("id", profile.id);
            setSaving(false);
            if (error) {
              toast.error(safeErrorMessage(error, "Could not update your profile."));
              return;
            }
            toast.success("Profile updated");
            await refreshProfile();
          }}
        >
          <div className="sm:col-span-2">
            <Label htmlFor="profile-name" className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Full name
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Your name"
              autoComplete="name"
              className="mt-1"
            />
          </div>

          <ReadOnlyField label="Email" value={user?.email ?? "—"} />
          <ReadOnlyField label="Account type" value={isGeneral ? "General" : "Student"} />

          {!isGeneral ? (
            <>
              <ReadOnlyField label="University" value={profile.university_name || "—"} />
              <ReadOnlyField label="Verified domain" value={profile.university_domain || "—"} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Student eligibility</p>
                <span
                  className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    isAlumni ? "bg-destructive/10 text-destructive" : "bg-highlight text-highlight-foreground"
                  }`}
                >
                  {isAlumni ? <AlertTriangle className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                  {isAlumni ? "Expired" : "Active"}
                </span>
              </div>

              <div>
                <Label htmlFor="profile-country" className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="profile-country" className="mt-1"><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="profile-dept" className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Department</Label>
                <Input
                  id="profile-dept"
                  list="profile-dept-suggestions"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Pharmacy"
                  className="mt-1"
                />
                <datalist id="profile-dept-suggestions">
                  {DEPARTMENT_SUGGESTIONS.map((d) => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div>
                <Label htmlFor="profile-year" className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger id="profile-year" className="mt-1"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="profile-index" className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Index / Student number</Label>
                <Input
                  id="profile-index"
                  value={indexNumber}
                  onChange={(e) => setIndexNumber(e.target.value)}
                  maxLength={32}
                  placeholder="e.g. 10876543 or UG/2024/0123"
                  className="mt-1 font-mono"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="profile-country" className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="profile-country" className="mt-1"><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="profile-age" className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Age range</Label>
                <Select value={ageRange} onValueChange={setAgeRange}>
                  <SelectTrigger id="profile-age" className="mt-1"><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    {AGE_RANGES.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>

        <p className="mt-4 text-[11px] text-muted-foreground">
          University, verified domain, account type, and credits are locked for fairness and can't be edited here.
        </p>
      </section>


      <div className="mt-8 grid gap-4 sm:grid-cols-6">
        {/* Credits - hero */}
        <div className="sm:col-span-4 rounded-3xl bg-primary p-7 text-primary-foreground shadow-paper">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.25em] opacity-70">Your credits</p>
            <Sparkles className="h-4 w-4 opacity-80" />
          </div>
          <p className="mt-2 font-serif text-7xl leading-none">
            {isGeneral || isAlumni ? (profile as any).paid_credits ?? 0 : profile.earned_credits}
          </p>
          <p className="mt-2 text-xs opacity-80">
            {isGeneral || isAlumni
              ? "Credits you can spend to publish surveys. Top up any time — admin awards land here too."
              : "Earn credits by answering surveys — 1 credit per quality response. Spend them to publish your own."}
          </p>
          {isGeneral || isAlumni ? (
            <Link to="/buy-credits">
              <Button className="mt-6 rounded-full bg-highlight text-highlight-foreground hover:bg-highlight/90">
                <Sparkles className="mr-1 h-4 w-4" /> Buy credits
              </Button>
            </Link>
          ) : (
            <Link to="/feed">
              <Button className="mt-6 rounded-full bg-highlight text-highlight-foreground hover:bg-highlight/90">
                <Sparkles className="mr-1 h-4 w-4" /> Earn credits — answer surveys
              </Button>
            </Link>
          )}
        </div>

        {/* Second wallet */}
        <div className="sm:col-span-2 rounded-3xl border border-foreground/15 bg-accent p-6 text-accent-foreground shadow-paper">
          <p className="text-[11px] uppercase tracking-[0.25em] opacity-70">
            {isGeneral || isAlumni ? "Earned (legacy)" : "Purchased"}
          </p>
          <p className="mt-2 font-serif text-6xl leading-none">
            {isGeneral || isAlumni ? profile.earned_credits : (profile as any).paid_credits ?? 0}
          </p>
          <p className="mt-2 text-[11px] opacity-80">
            {isGeneral || isAlumni ? "not spendable on this account type" : "purchased credits never expire"}
          </p>
          {!isGeneral && !isAlumni && nextExpiry && (
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-background/40 px-2 py-0.5 text-[10px] font-bold uppercase">
              <Clock className="h-3 w-3" /> earned expires {new Date(nextExpiry).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Caps */}
        <div className="sm:col-span-3 rounded-3xl border border-foreground/15 bg-card p-6 shadow-paper">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Earning caps</p>
          <div className="mt-3 space-y-3">
            <CapBar label="Today" value={caps?.day_count ?? 0} max={DAILY_EARN_CAP} />
            <CapBar label="This week" value={caps?.week_count ?? 0} max={WEEKLY_EARN_CAP} />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Earned credits expire in {EARNED_EXPIRY_DAYS} days. Keep answering surveys to keep your balance healthy.
          </p>
        </div>

        {/* Identity card — student vs general */}
        <div className="sm:col-span-3 rounded-3xl border border-foreground/15 bg-card p-6 shadow-paper">
          {isGeneral ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                <Globe2 className="h-3 w-3" /> General account
              </span>
              <h2 className="mt-3 font-serif text-2xl leading-tight">Public surveys only</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Field label="Country" value={profile.country || "—"} />
                <Field label="Age range" value={profile.age_range ? ageLabel(profile.age_range) : "—"} />
              </dl>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                <ShieldCheck className="h-3 w-3" /> Verified · {profile.university_domain}
              </span>
              <h2 className="mt-3 font-serif text-2xl leading-tight">{profile.university_name}</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Field label="Department" value={profile.department || "—"} />
                <Field label="Year" value={profile.year || "—"} />
              </dl>
            </>
          )}
        </div>
      </div>

      {/* Ledger */}
      <h2 className="mt-10 font-serif text-3xl">Credit history</h2>
      {ledger.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {ledger.map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-xl border border-foreground/10 bg-card px-4 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                  credits
                </span>
                <span className="text-muted-foreground">{row.reason.replace(/_/g, " ")}</span>
              </div>
              <span className={`font-mono font-bold ${row.delta > 0 ? "text-primary" : row.delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {row.delta > 0 ? "+" : ""}{row.delta}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 font-serif text-3xl">Recent responses</h2>
      {responses.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">You haven't answered any surveys yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {responses.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-2xl border border-foreground/15 bg-card p-4">
              <div>
                <p className="font-serif text-xl leading-tight">{r.survey?.title ?? "Survey"}</p>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CapBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-muted-foreground">{value} / {max}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}


function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 rounded-md border border-foreground/10 bg-muted/40 px-3 py-2 text-sm font-medium break-words">{value}</p>
    </div>
  );
}
