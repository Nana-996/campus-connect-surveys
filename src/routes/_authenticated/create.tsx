import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, Zap, Target } from "lucide-react";
import { TIERS, type Tier } from "@/lib/credits";
import { BOOST_TIERS, BOOST_DAYS, getBoostTier, type BoostTierId } from "@/lib/research-boost";
import {
  initializeResearchBoostCheckout,
  verifyResearchBoostCheckout,
} from "@/utils/research-boost.functions";
import {
  initializeUniversitySlotsCheckout,
  verifyUniversitySlotsCheckout,
} from "@/utils/university-slots.functions";
import { FREE_UNIVERSITY_PICKS } from "@/lib/university-slots";
import { InterestTagInput, type InterestEntry } from "@/components/InterestTagInput";
import { AudienceBuilder, type AudienceValue, type CriterionKey } from "@/components/AudienceBuilder";
import { VisibilityPicker } from "@/components/VisibilityPicker";
import type { Visibility } from "@/lib/visibility";


type Question = {
  id: string;
  type: "text" | "choice" | "rating";
  text: string;
  options?: string[];
  required?: boolean;
};

type CreateSearch = { lecturer?: string; course?: string; boost_ref?: string; slots_ref?: string };

export const Route = createFileRoute("/_authenticated/create")({
  component: Create,
  validateSearch: (s: Record<string, unknown>): CreateSearch => ({
    lecturer: typeof s.lecturer === "string" ? s.lecturer : undefined,
    course: typeof s.course === "string" ? s.course : undefined,
    boost_ref: typeof s.boost_ref === "string" ? s.boost_ref : undefined,
    slots_ref: typeof s.slots_ref === "string" ? s.slots_ref : undefined,
  }),

  head: () => ({
    meta: [
      { title: "Create a survey — CampusVerify" },
      { name: "description", content: "Design a targeted student survey, set your tier, and publish to verified university respondents in minutes." },
      { property: "og:title", content: "Create a survey — CampusVerify" },
      { property: "og:description", content: "Design a targeted student survey, set your tier, and publish to verified university respondents in minutes." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const TIER_ORDER: Tier[] = ["pro", "boosted", "targeted", "basic"];

const DRAFT_KEY = "cv:create-draft:v1";
type Draft = {
  tier: Tier; title: string; description: string;
  targetDept: string; targetYear: string; targetCountry: string; targetAge: string;
  targetInterests: InterestEntry[]; requiredCriteria: CriterionKey[];
  targetUniversities: string[];
  responseGoal: string; expiresAt: string;
  allowGeneral: boolean; visibility?: Visibility; questions: Question[]; respondentBonus: number;
  minResponseSeconds: string;
};

const loadDraft = (): Partial<Draft> => {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
};

function Create() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const isGeneral = profile?.user_type === "general";
  const lecturerId = search.lecturer ?? null;
  const [lecturerName, setLecturerName] = useState<string | null>(null);
  const [courseCode, setCourseCode] = useState<string>(search.course ?? "");
  useEffect(() => {
    if (!lecturerId) { setLecturerName(null); return; }
    (async () => {
      const { data } = await supabase
        .from("lecturers")
        .select("full_name, department")
        .eq("id", lecturerId)
        .maybeSingle();
      if (data) setLecturerName(data.full_name);
    })();
  }, [lecturerId]);
  const d = loadDraft();
  const [tier, setTier] = useState<Tier>(d.tier ?? "pro");
  const [title, setTitle] = useState(d.title ?? "");
  const [description, setDescription] = useState(d.description ?? "");
  const [audience, setAudience] = useState<AudienceValue>({
    department: d.targetDept ?? "",
    year: d.targetYear ?? "",
    country: d.targetCountry ?? "",
    age_range: d.targetAge ?? "",
    interests: d.targetInterests ?? [],
    universities: d.targetUniversities ?? [],
    required: d.requiredCriteria ?? [],
  });
  const [responseGoal, setResponseGoal] = useState<string>(d.responseGoal ?? "");
  const [expiresAt, setExpiresAt] = useState<string>(d.expiresAt ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    d.visibility ?? (d.allowGeneral === false ? "campus" : "everyone"),
  );
  const allowGeneral = visibility === "everyone";
  const [respondentBonus, setRespondentBonus] = useState<number>(
    Math.max(0, Math.min(3, d.respondentBonus ?? 0))
  );
  const [minResponseSeconds, setMinResponseSeconds] = useState<string>(d.minResponseSeconds ?? "15");
  const [questions, setQuestions] = useState<Question[]>(
    d.questions && d.questions.length > 0 ? d.questions :
    [{ id: crypto.randomUUID(), type: "text", text: "", required: true }]
  );
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"credits" | "boost">("credits");
  const [boostTier, setBoostTier] = useState<BoostTierId>("standard");
  const isBoost = mode === "boost";
  const selectedBoost = getBoostTier(boostTier) ?? BOOST_TIERS[1];

  const startBoost = useServerFn(initializeResearchBoostCheckout);
  const verifyBoost = useServerFn(verifyResearchBoostCheckout);

  // Return from Paystack after a Research Boost purchase.
  const boostRef = search.boost_ref ?? null;
  useEffect(() => {
    if (!boostRef) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await verifyBoost({ data: { reference: boostRef } });
        if (cancelled) return;
        if (res.status === "success") {
          try { localStorage.removeItem(DRAFT_KEY); } catch {}
          toast.success(`Research Boost active — ${res.responses} targeted responses queued.`);
          if (res.surveyId) navigate({ to: "/survey/$id", params: { id: res.surveyId } });
          else navigate({ to: "/my-surveys" });
        } else {
          toast.error("Payment was not completed. Your survey stays unpublished.");
        }
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message ?? "Could not verify payment");
      }
    })();
    return () => { cancelled = true; };
  }, [boostRef]);

  // University targeting allowance (5 free, +10 per paid expansion).
  const pickLimit = ((profile as any)?.university_pick_limit as number | undefined) ?? FREE_UNIVERSITY_PICKS;
  const [buyingSlots, setBuyingSlots] = useState(false);
  const startSlots = useServerFn(initializeUniversitySlotsCheckout);
  const verifySlots = useServerFn(verifyUniversitySlotsCheckout);

  const buySlots = async () => {
    setBuyingSlots(true);
    try {
      const res = await startSlots({ data: { originUrl: window.location.origin } });
      window.location.href = res.authorizationUrl;
    } catch (err: any) {
      toast.error(err?.message ?? "Could not start payment");
      setBuyingSlots(false);
    }
  };

  // Return from Paystack after buying extra university picks.
  const slotsRef = search.slots_ref ?? null;
  useEffect(() => {
    if (!slotsRef) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await verifySlots({ data: { reference: slotsRef } });
        if (cancelled) return;
        if (res.status === "success") {
          toast.success(`Added ${res.slots} more university picks.`);
          await refreshProfile?.();
        } else {
          toast.error("Payment was not completed.");
        }
        navigate({ to: "/create", search: {}, replace: true });
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message ?? "Could not verify payment");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsRef]);

  // Set once the survey is published so autosave stops re-writing a stale draft.
  const publishedRef = useRef(false);

  useEffect(() => {
    if (publishedRef.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        tier, title, description,
        targetDept: audience.department, targetYear: audience.year,
        targetCountry: audience.country, targetAge: audience.age_range,
        targetInterests: audience.interests, requiredCriteria: audience.required,
        targetUniversities: audience.universities,
        responseGoal, expiresAt, allowGeneral, visibility, questions,
        respondentBonus, minResponseSeconds,
      }));
    } catch {}
  }, [tier, title, description, audience, responseGoal, expiresAt, visibility, questions, respondentBonus, minResponseSeconds]);

  // Let the user know their in-progress draft survived a refresh / connection drop.
  const restoredRef = useRef(
    !!(d.title || d.description || (d.questions?.some((q) => q.text?.trim()) ?? false)),
  );
  useEffect(() => {
    if (!restoredRef.current) return;
    restoredRef.current = false;
    toast.info("Draft restored — we saved where you left off.");
  }, []);


  // Reset bonus when switching off Pro
  useEffect(() => { if (tier !== "pro" && respondentBonus !== 0) setRespondentBonus(0); }, [tier]);

  const addQ = (type: Question["type"]) =>
    setQuestions((q) => [...q, {
      id: crypto.randomUUID(), type, text: "", required: true,
      options: type === "choice" ? ["", ""] : undefined,
    }]);
  const removeQ = (id: string) => setQuestions((q) => q.filter((x) => x.id !== id));
  const updateQ = (id: string, patch: Partial<Question>) =>
    setQuestions((q) => q.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const tierMax = TIERS[tier].responseGoal;
  const goalNum = isBoost
    ? selectedBoost.responses
    : responseGoal ? Math.max(1, Math.min(tierMax, parseInt(responseGoal, 10) || tierMax)) : tierMax;
  const bonusTotal = tier === "pro" ? respondentBonus * goalNum : 0;
  const baseTierCost = isGeneral ? TIERS[tier].cost * 2 : TIERS[tier].cost;
  // Respondent bonus credits are funded by the platform — never charged to the creator.
  const totalCost = baseTierCost;
  const spendable = isGeneral ? (profile?.paid_credits ?? 0) : (profile?.earned_credits ?? 0);
  const canAffordTotal = spendable >= totalCost;


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!isBoost && !canAffordTotal) {
      const need = totalCost - spendable;
      const where = isGeneral ? "buy more credits to publish." : "answer surveys to earn them.";
      toast.error(`Need ${need} more credit${need === 1 ? "" : "s"} — ${where}`);
      return;
    }

    if (questions.length === 0 || questions.some((q) => !q.text.trim())) {
      toast.error("Each question needs text."); return;
    }
    setSubmitting(true);
    try {
      const expiresIso = expiresAt ? new Date(expiresAt).toISOString() : null;
      const { data, error } = await supabase
        .from("surveys")
        .insert({
          creator_id: user!.id,
          university_domain: profile.university_domain,
          title: title.trim(),
          description: description.trim(),
          questions: questions as any,
          tier: (isBoost ? "research_boost" : tier) as any,
          target_department: isBoost
            ? (audience.department.trim() || null)
            : tier === "basic" || isGeneral ? null : (audience.department.trim() || null),
          target_year: isBoost
            ? (audience.year || null)
            : tier === "basic" || isGeneral ? null : (audience.year || null),
          target_country: isBoost
            ? (audience.country || null)
            : tier === "basic" || !isGeneral ? null : (audience.country || null),
          target_age_range: isBoost
            ? (audience.age_range || null)
            : tier === "basic" || !isGeneral ? null : (audience.age_range || null),
          target_interests: !isBoost && tier === "basic" ? [] : audience.interests.map((t) => t.tag),
          target_universities: !isBoost && tier === "basic" ? [] : audience.universities,
          required_criteria: isBoost
            ? audience.required.filter((k) => (k === "interests" ? audience.interests.length > 0 : true))
            : tier === "basic" ? [] : audience.required.filter((k) =>
                k === "interests" ? audience.interests.length > 0
                  : k === "universities" ? audience.universities.length > 0
                  : isGeneral ? (k === "country" || k === "age_range")
                    : (k === "department" || k === "year"),
              ),

          response_goal: isBoost ? selectedBoost.responses : goalNum,
          respondent_bonus: !isBoost && tier === "pro" ? respondentBonus : 0,
          min_response_seconds: Math.max(0, Math.min(600, parseInt(minResponseSeconds, 10) || 15)),
          visibility: isBoost ? "everyone" : visibility,
          ...(lecturerId ? { lecturer_id: lecturerId, is_evaluation: true, course_code: courseCode.trim() || null } : {}),
          ...(!isBoost && expiresIso ? { expires_at: expiresIso } : {}),
        })
        .select("id")
        .single();
      if (error) throw error;

      publishedRef.current = true;
      try { localStorage.removeItem(DRAFT_KEY); } catch {}

      if (isBoost) {
        const res = await startBoost({
          data: { surveyId: data.id, boostTier: selectedBoost.id, originUrl: window.location.origin },
        });
        window.location.href = res.authorizationUrl;
        return;
      }

      // Reset the studio so a fresh visit never shows the published survey again.
      setTitle("");
      setDescription("");
      setQuestions([{ id: crypto.randomUUID(), type: "text", text: "", required: true }]);
      setAudience({ department: "", year: "", country: "", age_range: "", interests: [], universities: [], required: [] });
      setResponseGoal("");
      setExpiresAt("");
      setRespondentBonus(0);
      setMinResponseSeconds("15");
      setVisibility("everyone");

      await refreshProfile();
      toast.success(`Published as ${TIERS[tier].label}!`);
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      navigate({ to: "/survey/$id", params: { id: data.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to publish");
    } finally {
      setSubmitting(false);
    }
  };

  const selected = TIERS[tier];



  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Studio</p>
      <h1 className="mt-1 font-serif text-5xl leading-[0.95]">
        Ask <em className="text-primary">{isGeneral ? "the public." : "campus."}</em>
      </h1>
      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-semibold">
        <span className="font-bold text-primary">{spendable} credits</span>
        <span className="text-muted-foreground">·</span>
        {isGeneral ? (
          <a href="/buy-credits" className="text-muted-foreground hover:text-primary underline-offset-2 hover:underline">
            buy more credits
          </a>
        ) : (
          <span className="text-muted-foreground">earn more by answering surveys</span>
        )}
      </p>


      {lecturerId && (
        <div className="mt-4 rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Lecturer evaluation</p>
          <p className="mt-1 text-sm">
            This survey will be linked to{" "}
            <strong>{lecturerName ?? "the selected lecturer"}</strong> and tagged as an official
            evaluation. Standard credit cost still applies because you chose the custom builder.
          </p>
          <div className="mt-3 max-w-xs">
            <Label htmlFor="course-code" className="text-xs">Course code (optional)</Label>
            <Input id="course-code" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="CSCD403" />
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mt-8 space-y-6">
        {/* Mode switch */}
        <div className="inline-flex rounded-full border-2 border-foreground/15 bg-card p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("credits")}
            className={`rounded-full px-4 py-2 transition ${mode === "credits" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            Publish with credits
          </button>
          <button
            type="button"
            onClick={() => setMode("boost")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 transition ${mode === "boost" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Target className="h-3.5 w-3.5" /> Research Boost
          </button>
        </div>

        {/* Tier selector */}
        <div>
          <h2 className="sr-only">Publishing tier</h2>
          {isBoost ? (
            <>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Research Boost package</Label>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Pay in cedis and CampusVerify pushes your survey to the top of the feed for the exact
                population you pick below, until your paid response quota is filled (or {BOOST_DAYS} days pass).
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-4">
                {BOOST_TIERS.map((b) => {
                  const active = boostTier === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBoostTier(b.id)}
                      className={`relative text-left rounded-2xl border-2 p-4 transition shadow-paper ${
                        active ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 bg-card hover:border-foreground/40"
                      }`}
                    >
                      {b.badge && (
                        <span className="absolute -top-2 right-3 rounded-full bg-highlight px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-highlight-foreground">
                          {b.badge}
                        </span>
                      )}
                      <span className="font-serif text-2xl">GHS {b.priceGhs}</span>
                      <p className="mt-0.5 text-[11px] opacity-80">{b.label} · {b.tagline}</p>
                      <p className="mt-3 text-xs font-bold">{b.responses} targeted responses</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 rounded-xl border border-foreground/10 bg-card p-3 text-xs">
                <p className="font-semibold">{selectedBoost.label} boost includes:</p>
                <ul className="mt-1 grid gap-0.5 text-muted-foreground sm:grid-cols-2">
                  <li>· Guaranteed slot at the top of matching feeds</li>
                  <li>· Quota of {selectedBoost.responses} responses from your chosen population</li>
                  <li>· Auto-closes the moment the quota is filled</li>
                  <li>· Runs for up to {BOOST_DAYS} days · no credits used</li>
                </ul>
              </div>
            </>
          ) : (
            <>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Publishing tier</Label>
          <div className="mt-2 grid gap-3 sm:grid-cols-4">
            {TIER_ORDER.map((t) => {
              const T = TIERS[t];
              const active = tier === t;
              const isPro = t === "pro";
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={`relative text-left rounded-2xl border-2 p-4 transition shadow-paper ${
                    active
                      ? isPro
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-foreground bg-accent text-accent-foreground"
                      : "border-foreground/15 bg-card hover:border-foreground/40"
                  }`}
                >
                  {isPro && (
                    <span className="absolute -top-2 right-3 rounded-full bg-highlight px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-highlight-foreground">
                      <Zap className="inline h-2.5 w-2.5 -mt-0.5" /> Fastest
                    </span>
                  )}
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-2xl">{T.label}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] opacity-80">{T.tagline}</p>
                  <p className="mt-3 text-xs font-bold">{isGeneral ? T.cost * 2 : T.cost} credits</p>
                  <ul className="mt-2 space-y-0.5 text-[11px] opacity-80">
                    {T.features.slice(0, 2).map((f) => <li key={f}>· {f}</li>)}
                  </ul>
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-xl bg-card border border-foreground/10 p-3 text-xs">
            <p className="font-semibold">{selected.label} includes:</p>
            <ul className="mt-1 grid gap-0.5 sm:grid-cols-2 text-muted-foreground">
              {selected.features.map((f) => <li key={f}>· {f}</li>)}
            </ul>
          </div>
            </>
          )}
        </div>


        {/* Survey body */}
        <div className="rounded-3xl border border-foreground/15 bg-card p-6 space-y-4 shadow-paper">
          <h2 className="sr-only">Survey body</h2>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={isGeneral ? "What people think about remote work" : "Sleep habits among 2nd-year students"} />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="A short context for respondents." />
          </div>
          {tier === "basic" && !isBoost ? (
            <p className="text-xs text-muted-foreground italic">
              {isGeneral
                ? <>Basic surveys are open to the entire public — upgrade to <button type="button" onClick={() => setTier("targeted")} className="font-bold underline text-foreground">Targeted</button> to filter by country, age & interests.</>
                : <>Basic surveys go out to your whole campus — upgrade to <button type="button" onClick={() => setTier("targeted")} className="font-bold underline text-foreground">Targeted</button> to pick department, year & interests.</>}
            </p>
          ) : (
            <AudienceBuilder
              value={audience}
              onChange={setAudience}
              isGeneral={isGeneral}
              allowGeneral={isBoost ? true : (isGeneral ? true : allowGeneral)}
              responseGoal={goalNum}
              pickLimit={pickLimit}
              onBuySlots={buySlots}
              buyingSlots={buyingSlots}
            />
          )}



          <div className="border-t border-foreground/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limits (optional)</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Auto-closes when either limit is reached. Ultimate cap: 6 months from publish.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {!isBoost && (
              <div>
                <Label htmlFor="goal" className="text-xs">Response goal</Label>
                <Input
                  id="goal"
                  type="number"
                  min={1}
                  max={TIERS[tier].responseGoal}
                  value={responseGoal}
                  onChange={(e) => setResponseGoal(e.target.value)}
                  placeholder={`Default ${TIERS[tier].responseGoal}`}
                />
              </div>
              )}

              <div>
                <Label htmlFor="exp" className="text-xs">Closes on</Label>
                <Input
                  id="exp"
                  type="date"
                  min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                  max={new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 6).toISOString().slice(0, 10)}
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="speed-trap" className="text-xs">Speed trap · minimum seconds before submit</Label>
              <Input
                id="speed-trap"
                type="number"
                min={0}
                max={600}
                value={minResponseSeconds}
                onChange={(e) => setMinResponseSeconds(e.target.value)}
                placeholder="15"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Anti-farming: responses submitted faster than this earn no credits and are silently flagged for review. Respondents don't see the threshold. Default 15s; set 0 to disable.
              </p>
            </div>
          </div>

          <VisibilityPicker
            value={isBoost ? "everyone" : visibility}
            onChange={setVisibility}
            disabled={isBoost ? ["campus", "students", "private"] : []}
            note={
              isBoost
                ? "Research Boost buys reach, so boosted surveys are always open to everyone."
                : visibility === "private"
                  ? "After publishing, add the email addresses you want to invite from My surveys."
                  : "You can change this later from My surveys without losing responses."
            }
          />
        </div>

        {/* Pro-only: respondent bonus credits */}
        {tier === "pro" && (
          <div className="rounded-3xl border-2 border-primary/40 bg-primary/5 p-6 shadow-paper">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-2xl leading-tight">Reward your responders</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pro perk — give each respondent extra credits on top of the standard +1 for completing your survey. Higher rewards attract more responses faster.
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRespondentBonus(n)}
                  className={`rounded-2xl border-2 px-3 py-3 text-center transition ${
                    respondentBonus === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-foreground/15 bg-card hover:border-foreground/40"
                  }`}
                >
                  <div className="font-serif text-2xl leading-none">+{n}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider opacity-80">
                    {n === 0 ? "none" : `bonus`}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-background/60 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                Respondent earns <span className="font-bold text-foreground">{1 + respondentBonus} credit{1 + respondentBonus === 1 ? "" : "s"}</span> per quality response
              </span>
              <span className="font-mono font-bold text-primary">
                {bonusTotal > 0 ? `+${bonusTotal} bonus credits` : "no extra credits"}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Max +3 bonus credits per response. This reward pool ({respondentBonus} × {goalNum} response goal = {bonusTotal} credits) is funded by CampusVerify — nothing extra is deducted from your balance.
            </p>

          </div>
        )}


        {/* Questions */}
        <div className="space-y-3">
          <h2 className="sr-only">Questions</h2>
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">Q{i + 1}</span>
                    <Select value={q.type} onValueChange={(v: any) =>
                      updateQ(q.id, { type: v, options: v === "choice" ? ["", ""] : undefined })}>
                      <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Short answer</SelectItem>
                        <SelectItem value="choice">Multiple choice</SelectItem>
                        <SelectItem value="rating">Rating (1-5)</SelectItem>
                      </SelectContent>
                    </Select>
                    <label
                      className={`ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                        (q.required ?? true)
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-foreground/15 bg-background text-muted-foreground hover:border-foreground/30"
                      }`}
                      title="Required questions must be answered before submit"
                    >
                      <input
                        type="checkbox"
                        className="h-3 w-3 accent-primary"
                        checked={q.required ?? true}
                        onChange={(e) => updateQ(q.id, { required: e.target.checked })}
                      />
                      {(q.required ?? true) ? "Required" : "Optional"}
                    </label>
                  </div>
                  <Input value={q.text} onChange={(e) => updateQ(q.id, { text: e.target.value })} placeholder="Question text" />
                  {q.type === "text" && (
                    <div className="rounded-xl border border-dashed border-foreground/20 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                      Preview: respondents will type a short answer.
                    </div>
                  )}
                  {q.type === "rating" && (
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-foreground/20 bg-background/40 px-3 py-2">
                      <span className="text-xs text-muted-foreground">Preview:</span>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-foreground/20 text-xs font-semibold">
                          {n}
                        </span>
                      ))}
                    </div>
                  )}
                  {q.type === "choice" && (
                    <div className="space-y-2 pl-2">
                      {q.options?.map((opt, oi) => (
                        <div key={oi} className="flex gap-2">
                          <Input value={opt} onChange={(e) => {
                            const opts = [...(q.options ?? [])]; opts[oi] = e.target.value;
                            updateQ(q.id, { options: opts });
                          }} placeholder={`Option ${oi + 1}`} />
                          {(q.options?.length ?? 0) > 2 && (
                            <Button type="button" variant="ghost" size="icon"
                              onClick={() => updateQ(q.id, { options: q.options?.filter((_, idx) => idx !== oi) })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm"
                        onClick={() => updateQ(q.id, { options: [...(q.options ?? []), ""] })}>
                        <Plus className="mr-1 h-3 w-3" /> Add option
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeQ(q.id)}
                  aria-label="Delete question"
                  title="Delete question"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-full border-foreground/30" onClick={() => addQ("text")}>
            <Plus className="mr-1 h-4 w-4" /> Short answer
          </Button>
          <Button type="button" variant="outline" className="rounded-full border-foreground/30" onClick={() => addQ("choice")}>
            <Plus className="mr-1 h-4 w-4" /> Multiple choice
          </Button>
          <Button type="button" variant="outline" className="rounded-full border-foreground/30" onClick={() => addQ("rating")}>
            <Plus className="mr-1 h-4 w-4" /> Rating
          </Button>
        </div>

        {!isBoost && !canAffordTotal && (
          <p className="text-center text-xs font-medium text-destructive">
            Need {totalCost - spendable} more credit{(totalCost - spendable) === 1 ? "" : "s"} —{" "}
            {isGeneral ? (
              <a href="/buy-credits" className="underline">buy more credits</a>
            ) : (
              "answer surveys to earn them."
            )}
          </p>
        )}
        <Button type="submit" size="lg" disabled={submitting || (!isBoost && !canAffordTotal)}
          className="h-14 w-full rounded-full bg-primary text-base">
          {submitting
            ? (isBoost ? "Redirecting to payment…" : "Publishing…")
            : isBoost
              ? `Buy Research Boost · GHS ${selectedBoost.priceGhs} for ${selectedBoost.responses} responses →`
              : `Publish ${selected.label} · ${totalCost} credit${totalCost === 1 ? "" : "s"} →`}
        </Button>



      </form>
    </div>
  );
}
