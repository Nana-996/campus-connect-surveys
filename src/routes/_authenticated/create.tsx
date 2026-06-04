import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
import { Trash2, Plus, Zap } from "lucide-react";
import { TIERS, type Tier, canAfford } from "@/lib/credits";
import { InterestTagInput, type InterestEntry } from "@/components/InterestTagInput";
import { AGE_RANGES, COUNTRIES } from "@/lib/interests";

type Question = {
  id: string;
  type: "text" | "choice" | "rating";
  text: string;
  options?: string[];
};

export const Route = createFileRoute("/_authenticated/create")({
  component: Create,
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
  targetInterests: InterestEntry[]; responseGoal: string; expiresAt: string;
  allowGeneral: boolean; questions: Question[]; respondentBonus: number;
};
const loadDraft = (): Partial<Draft> => {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
};

function Create() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isGeneral = profile?.user_type === "general";
  const d = loadDraft();
  const [tier, setTier] = useState<Tier>(d.tier ?? "pro");
  const [title, setTitle] = useState(d.title ?? "");
  const [description, setDescription] = useState(d.description ?? "");
  const [targetDept, setTargetDept] = useState(d.targetDept ?? "");
  const [targetYear, setTargetYear] = useState(d.targetYear ?? "");
  const [targetCountry, setTargetCountry] = useState<string>(d.targetCountry ?? "");
  const [targetAge, setTargetAge] = useState<string>(d.targetAge ?? "");
  const [targetInterests, setTargetInterests] = useState<InterestEntry[]>(d.targetInterests ?? []);
  const [responseGoal, setResponseGoal] = useState<string>(d.responseGoal ?? "");
  const [expiresAt, setExpiresAt] = useState<string>(d.expiresAt ?? "");
  const [allowGeneral, setAllowGeneral] = useState(d.allowGeneral ?? true);
  const [respondentBonus, setRespondentBonus] = useState<number>(
    Math.max(0, Math.min(3, d.respondentBonus ?? 0))
  );
  const [questions, setQuestions] = useState<Question[]>(
    d.questions && d.questions.length > 0 ? d.questions :
    [{ id: crypto.randomUUID(), type: "text", text: "" }]
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        tier, title, description, targetDept, targetYear, targetCountry,
        targetAge, targetInterests, responseGoal, expiresAt, allowGeneral, questions,
        respondentBonus,
      }));
    } catch {}
  }, [tier, title, description, targetDept, targetYear, targetCountry, targetAge, targetInterests, responseGoal, expiresAt, allowGeneral, questions, respondentBonus]);

  // Reset bonus when switching off Pro
  useEffect(() => { if (tier !== "pro" && respondentBonus !== 0) setRespondentBonus(0); }, [tier]);

  const addQ = (type: Question["type"]) =>
    setQuestions((q) => [...q, {
      id: crypto.randomUUID(), type, text: "",
      options: type === "choice" ? ["", ""] : undefined,
    }]);
  const removeQ = (id: string) => setQuestions((q) => q.filter((x) => x.id !== id));
  const updateQ = (id: string, patch: Partial<Question>) =>
    setQuestions((q) => q.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const tierMax = TIERS[tier].responseGoal;
  const goalNum = responseGoal ? Math.max(1, Math.min(tierMax, parseInt(responseGoal, 10) || tierMax)) : tierMax;
  const bonusTotal = tier === "pro" ? respondentBonus * goalNum : 0;
  const totalCost = TIERS[tier].cost + bonusTotal;
  const canAffordTotal = (profile?.earned_credits ?? 0) >= totalCost;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!canAffordTotal) {
      const need = totalCost - profile.earned_credits;
      toast.error(`Need ${need} more credit${need === 1 ? "" : "s"} — answer surveys to earn them.`);
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
          tier,
          target_department: tier === "basic" || isGeneral ? null : (targetDept || null),
          target_year: tier === "basic" || isGeneral ? null : (targetYear || null),
          target_country: tier === "basic" ? null : (targetCountry || null),
          target_age_range: tier === "basic" ? null : (targetAge || null),
          target_interests: tier === "basic" ? [] : targetInterests.map((t) => t.tag),
          response_goal: goalNum,
          respondent_bonus: tier === "pro" ? respondentBonus : 0,
          allow_general_respondents: isGeneral ? true : allowGeneral,
          ...(expiresIso ? { expires_at: expiresIso } : {}),
        })
        .select("id")
        .single();
      if (error) throw error;
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
        <span className="font-bold text-primary">{profile?.earned_credits ?? 0} credits</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">earn more by answering surveys</span>
      </p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        {/* Tier selector */}
        <div>
          <h2 className="sr-only">Publishing tier</h2>
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
                  <p className="mt-3 text-xs font-bold">{T.cost} credits</p>
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
          {tier === "basic" ? (
            <p className="text-xs text-muted-foreground italic">
              {isGeneral
                ? <>Basic surveys are open to the entire public — upgrade to <button type="button" onClick={() => setTier("targeted")} className="font-bold underline text-foreground">Targeted</button> to filter by country, age & interests.</>
                : <>Basic surveys go out to your whole campus — upgrade to <button type="button" onClick={() => setTier("targeted")} className="font-bold underline text-foreground">Targeted</button> to pick department, year & interests.</>}
            </p>
          ) : (
            <div className="space-y-3">
              {isGeneral ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tc">Target country</Label>
                    <Select value={targetCountry} onValueChange={(v) => setTargetCountry(v === "__any" ? "" : v)}>
                      <SelectTrigger id="tc"><SelectValue placeholder="Anywhere" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="__any">Anywhere</SelectItem>
                        {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ta">Target age range</Label>
                    <Select value={targetAge} onValueChange={(v) => setTargetAge(v === "__any" ? "" : v)}>
                      <SelectTrigger id="ta"><SelectValue placeholder="Any age" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any">Any age</SelectItem>
                        {AGE_RANGES.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="td">Target department</Label>
                    <Input id="td" value={targetDept} onChange={(e) => setTargetDept(e.target.value)} placeholder="Psychology" />
                  </div>
                  <div>
                    <Label htmlFor="ty">Target year</Label>
                    <Input id="ty" value={targetYear} onChange={(e) => setTargetYear(e.target.value)} placeholder="Year 2" />
                  </div>
                </div>
              )}
              <div>
                <Label>Target interests</Label>
                <div className="mt-1.5">
                  <InterestTagInput
                    value={targetInterests}
                    onChange={setTargetInterests}
                    placeholder="e.g. fitness, crypto, gaming…"
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Only respondents whose interests overlap will see this survey. Leave empty for no filter.
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-foreground/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limits (optional)</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Auto-closes when either limit is reached. Ultimate cap: 6 months from publish.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
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
          </div>

          {isGeneral ? (
            <p className="rounded-xl border border-foreground/15 bg-background/40 p-3 text-[11px] text-muted-foreground">
              Your surveys are open to the public — anyone on CampusVerify can find and answer them.
            </p>
          ) : (
            <label className="flex items-start gap-3 rounded-xl border border-foreground/15 bg-background/40 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowGeneral}
                onChange={(e) => setAllowGeneral(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <div>
                <p className="text-xs font-semibold">Open to anyone (recommended)</p>
                <p className="text-[11px] text-muted-foreground">
                  On by default — students from other campuses and general users can find and answer this survey. Uncheck to limit responses to your own campus only.
                </p>
              </div>
            </label>
          )}
        </div>




        {/* Questions */}
        <div className="space-y-3">
          <h2 className="sr-only">Questions</h2>
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
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

        {!canAffordTotal && (
          <p className="text-center text-xs font-medium text-destructive">
            Need {totalCost - (profile?.earned_credits ?? 0)} more credit{(totalCost - (profile?.earned_credits ?? 0)) === 1 ? "" : "s"} — answer surveys to earn them.
          </p>
        )}
        <Button type="submit" size="lg" disabled={submitting || !canAffordTotal}
          className="h-14 w-full rounded-full bg-primary text-base">
          {submitting ? "Publishing…" : `Publish ${selected.label} · ${totalCost} credit${totalCost === 1 ? "" : "s"} →`}
        </Button>

      </form>
    </div>
  );
}
