import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Users, Filter, ArrowUpRight, Sparkles } from "lucide-react";

import { tagLabel, ageLabel, AGE_RANGES, COUNTRIES, INTEREST_TAGS } from "@/lib/interests";

type Survey = {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  target_department: string | null;
  target_year: string | null;
  target_country?: string | null;
  target_age_range?: string | null;
  target_interests?: string[] | null;
  response_count: number;
  questions: any[];
  created_at: string;
  tier?: string | null;
  boosted_until?: string | null;
};

export const Route = createFileRoute("/_authenticated/feed")({
  component: Feed,
});

// Rotating bento tones for variety
const TONES = [
  "bg-card text-foreground",
  "bg-accent text-accent-foreground",
  "bg-highlight text-highlight-foreground",
  "bg-primary text-primary-foreground",
  "bg-secondary text-secondary-foreground",
];

function Feed() {
  const { user, profile, isPreviewMode } = useAuth();
  const isGeneral = profile?.user_type === "general";
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  // Student filters
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  // General filters
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [interestFilter, setInterestFilter] = useState<string>("all");
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [campusDepts, setCampusDepts] = useState<string[]>([]);
  const [campusYears, setCampusYears] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    if (isPreviewMode) {
      setSurveys([]);
      setAnswered(new Set());
      setCampusDepts([profile?.department].filter(Boolean) as string[]);
      setCampusYears([profile?.year].filter(Boolean) as string[]);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const peersPromise = isGeneral
          ? Promise.resolve({ data: [], error: null } as any)
          : supabase.from("campus_directory" as any).select("department, year");
        const [{ data, error }, { data: resps, error: respsError }, { data: peers, error: peersError }] = await Promise.all([
          supabase.from("surveys").select("*").eq("is_active", true).gt("expires_at", new Date().toISOString()).neq("creator_id", user.id).order("created_at", { ascending: false }),
          supabase.from("survey_responses").select("survey_id").eq("respondent_id", user.id),
          peersPromise,
        ]);
        if (!active) return;
        if (error) console.warn("Survey feed request failed.", error);
        if (respsError) console.warn("Answered-surveys request failed.", respsError);
        if (peersError) console.warn("Campus filters request failed.", peersError);
        const rows = ((data as unknown as (Survey & { response_goal: number })[]) ?? []).filter((s) => s.response_count < (s.response_goal ?? Infinity));
        rows.sort((a, b) => {
          const aB = a.boosted_until && new Date(a.boosted_until) > new Date() ? 1 : 0;
          const bB = b.boosted_until && new Date(b.boosted_until) > new Date() ? 1 : 0;
          return bB - aB;
        });
        setSurveys(rows);
        setAnswered(new Set((resps ?? []).map((r: any) => r.survey_id)));
        setCampusDepts(Array.from(new Set((peers ?? []).map((p: any) => p.department).filter(Boolean))) as string[]);
        setCampusYears(Array.from(new Set((peers ?? []).map((p: any) => p.year).filter(Boolean))) as string[]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user, isPreviewMode, profile?.department, profile?.year, isGeneral]);

  // Student cohort options
  const departments = Array.from(new Set([
    ...campusDepts,
    ...surveys.map((s) => s.target_department).filter(Boolean) as string[],
  ])).sort();
  const years = Array.from(new Set([
    ...campusYears,
    ...surveys.map((s) => s.target_year).filter(Boolean) as string[],
  ])).sort();

  // General audience options
  const countries = Array.from(new Set([
    ...COUNTRIES,
    ...surveys.map((s) => s.target_country).filter(Boolean) as string[],
  ]));

  const matchesDept = (s: Survey, dept: string) =>
    dept === "all" || !s.target_department || s.target_department === dept;
  const matchesYear = (s: Survey, year: string) =>
    year === "all" || !s.target_year || s.target_year === year;
  const matchesCountry = (s: Survey, c: string) =>
    c === "all" || !s.target_country || s.target_country === c;
  const matchesAge = (s: Survey, a: string) =>
    a === "all" || !s.target_age_range || s.target_age_range === a;
  const matchesInterest = (s: Survey, i: string) =>
    i === "all" || !s.target_interests || s.target_interests.length === 0 || s.target_interests.includes(i);

  const visible = surveys.filter((s) => {
    if (isGeneral) {
      if (scope === "mine") {
        if (!matchesCountry(s, profile?.country ?? "all")) return false;
        if (!matchesAge(s, profile?.age_range ?? "all")) return false;
      }
      if (!matchesCountry(s, countryFilter)) return false;
      if (!matchesAge(s, ageFilter)) return false;
      if (!matchesInterest(s, interestFilter)) return false;
      return true;
    }
    if (scope === "mine") {
      if (!matchesDept(s, profile?.department ?? "all")) return false;
      if (!matchesYear(s, profile?.year ?? "all")) return false;
    }
    if (!matchesDept(s, deptFilter)) return false;
    if (!matchesYear(s, yearFilter)) return false;
    return true;
  });

  const generalCohortLabel = [profile?.country, profile?.age_range ? ageLabel(profile.age_range) : null].filter(Boolean).join(" / ");
  const studentCohortLabel = [profile?.department, profile?.year].filter(Boolean).join(" / ");
  const cohortLabel = isGeneral ? generalCohortLabel : studentCohortLabel;
  const anyFilterActive = isGeneral
    ? (countryFilter !== "all" || ageFilter !== "all" || interestFilter !== "all" || scope === "mine")
    : (deptFilter !== "all" || yearFilter !== "all" || scope === "mine");

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">{isGeneral ? "Today's surveys" : "Today on campus"}</p>
          <h1 className="mt-1 font-serif text-5xl leading-[0.95] sm:text-6xl">
            The <em className="text-primary">feed.</em>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isGeneral
              ? <>Open to <span className="font-semibold text-foreground">everyone</span>{profile?.country ? <> · {profile.country}</> : null}</>
              : <>Verified students at <span className="font-semibold text-foreground">{profile?.university_name ?? "your campus"}</span></>}
          </p>
        </div>
        <Link to="/create" className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-paper hover:opacity-90">
          New survey <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <button
          onClick={() => setScope(scope === "mine" ? "all" : "mine")}
          className={`rounded-full border px-3 py-1 font-semibold uppercase tracking-wider transition ${scope === "mine" ? "border-primary bg-primary text-primary-foreground" : "border-foreground/20 bg-card hover:bg-accent"}`}
        >
          {isGeneral ? "For me" : "My cohort"}{cohortLabel ? ` · ${cohortLabel}` : ""}
        </button>

        {isGeneral ? (
          <>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="rounded-full border border-foreground/20 bg-card px-3 py-1 font-semibold uppercase tracking-wider"
            >
              <option value="all">All countries</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="rounded-full border border-foreground/20 bg-card px-3 py-1 font-semibold uppercase tracking-wider"
            >
              <option value="all">All ages</option>
              {AGE_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <select
              value={interestFilter}
              onChange={(e) => setInterestFilter(e.target.value)}
              className="rounded-full border border-foreground/20 bg-card px-3 py-1 font-semibold uppercase tracking-wider"
            >
              <option value="all">All interests</option>
              {INTEREST_TAGS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </>
        ) : (
          <>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-full border border-foreground/20 bg-card px-3 py-1 font-semibold uppercase tracking-wider"
            >
              <option value="all">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="rounded-full border border-foreground/20 bg-card px-3 py-1 font-semibold uppercase tracking-wider"
            >
              <option value="all">All years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}

        {anyFilterActive && (
          <button
            onClick={() => {
              setDeptFilter("all"); setYearFilter("all");
              setCountryFilter("all"); setAgeFilter("all"); setInterestFilter("all");
              setScope("all");
            }}
            className="text-muted-foreground underline hover:text-foreground"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-muted-foreground">{visible.length} showing</span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading surveys…</p>
      ) : visible.length === 0 ? (
        (() => {
          const noneAtAll = surveys.length === 0;
          const filteredOut = !noneAtAll && anyFilterActive;
          return (
            <div className="rounded-3xl border border-dashed border-foreground/30 bg-card p-10 text-center shadow-paper">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 font-serif text-3xl">
                {filteredOut
                  ? "Nothing matches those filters."
                  : isGeneral
                    ? "No open surveys right now."
                    : "A quiet day on campus."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredOut
                  ? `${surveys.length} survey${surveys.length === 1 ? "" : "s"} available — try widening or clearing your filters.`
                  : isGeneral
                    ? "Check back soon, or publish the first one yourself."
                    : `No surveys on ${profile?.university_name ?? "your campus"} yet. Be the spark — publish the first one.`}
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                {filteredOut && (
                  <button
                    onClick={() => {
                      setDeptFilter("all"); setYearFilter("all");
                      setCountryFilter("all"); setAgeFilter("all"); setInterestFilter("all");
                      setScope("all");
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-foreground/30 bg-background px-5 py-2 text-sm font-semibold"
                  >
                    Clear filters
                  </button>
                )}
                <Link to="/create" className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
                  {filteredOut ? "New survey" : "Start one"} <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="grid auto-rows-[minmax(180px,auto)] grid-cols-2 gap-3 sm:grid-cols-6 sm:gap-4">
          {visible.map((s, i) => {
            const tone = TONES[i % TONES.length];
            // Bento sizing pattern
            const span =
              i % 7 === 0 ? "col-span-2 sm:col-span-4 sm:row-span-2"
              : i % 5 === 0 ? "col-span-2 sm:col-span-3"
              : i % 3 === 0 ? "col-span-2 sm:col-span-3"
              : "col-span-2 sm:col-span-2";
            const isLarge = i % 7 === 0;
            const isDone = answered.has(s.id);
            const isBoosted = s.boosted_until && new Date(s.boosted_until) > new Date();
            const isPro = s.tier === "pro";
            return (
              <Link
                key={s.id}
                to="/survey/$id"
                params={{ id: s.id }}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5 shadow-paper transition hover:-translate-y-0.5 hover:shadow-lg ${tone} ${span} ${isBoosted ? "border-highlight ring-2 ring-highlight/40" : "border-foreground/15"}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
                        №{String(i + 1).padStart(2, "0")}
                      </span>
                      {isBoosted && (
                        <span className="rounded-full bg-highlight px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-highlight-foreground">
                          {isPro ? "★ Pro" : "↑ Boosted"}
                        </span>
                      )}
                    </div>
                    {isDone && (
                      <span className="rounded-full bg-background/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        ✓ Done
                      </span>
                    )}
                  </div>
                  <h3 className={`mt-3 font-serif leading-[1] ${isLarge ? "text-4xl sm:text-6xl" : "text-2xl sm:text-3xl"}`}>
                    {s.title}
                  </h3>
                  {s.description && isLarge && (
                    <p className="mt-3 line-clamp-3 max-w-md text-sm opacity-80">{s.description}</p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-wider opacity-80">
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{s.response_count}</span>
                  <span>·</span>
                  <span>{s.questions?.length ?? 0} Qs</span>
                  {(() => {
                    const bits = [
                      s.target_department,
                      s.target_year,
                      s.target_country,
                      s.target_age_range ? ageLabel(s.target_age_range) : null,
                      ...(s.target_interests ?? []).map((id) => tagLabel(id)),
                    ].filter(Boolean) as string[];
                    return bits.length > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Filter className="h-3 w-3" />
                        {bits.slice(0, 3).join(" · ")}{bits.length > 3 ? ` +${bits.length - 3}` : ""}
                      </span>
                    ) : null;
                  })()}
                </div>
                <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 opacity-0 transition group-hover:opacity-70" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
