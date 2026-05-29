import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
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
import { Trash2, Plus, Sparkles, Lock, Zap } from "lucide-react";
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
});

const TIER_ORDER: Tier[] = ["pro", "boosted", "targeted", "basic"];

function Create() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isGeneral = profile?.user_type === "general";
  const [tier, setTier] = useState<Tier>("pro");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Structured targeting (replaces the old free-text audience/region inputs)
  const [targetDept, setTargetDept] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [targetCountry, setTargetCountry] = useState<string>("");
  const [targetAge, setTargetAge] = useState<string>("");
  const [targetInterests, setTargetInterests] = useState<InterestEntry[]>([]);
  const [responseGoal, setResponseGoal] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [allowGeneral, setAllowGeneral] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([
    { id: crypto.randomUUID(), type: "text", text: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addQ = (type: Question["type"]) =>
    setQuestions((q) => [...q, {
      id: crypto.randomUUID(), type, text: "",
      options: type === "choice" ? ["", ""] : undefined,
    }]);
  const removeQ = (id: string) => setQuestions((q) => q.filter((x) => x.id !== id));
  const updateQ = (id: string, patch: Partial<Question>) =>
    setQuestions((q) => q.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const afford = canAfford(tier, profile.earned_credits, profile.paid_credits);
    if (!afford.ok) { toast.error(afford.reason!); return; }
    if (questions.length === 0 || questions.some((q) => !q.text.trim())) {
      toast.error("Each question needs text."); return;
    }
    setSubmitting(true);
    try {
      const tierMax = TIERS[tier].responseGoal;
      const goalNum = responseGoal ? Math.max(1, Math.min(tierMax, parseInt(responseGoal, 10))) : tierMax;
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
          // Student-only structured targeting
          target_department: tier === "basic" || isGeneral ? null : (targetDept || null),
          target_year: tier === "basic" || isGeneral ? null : (targetYear || null),
          // Shared structured targeting
          target_country: tier === "basic" ? null : (targetCountry || null),
          target_age_range: tier === "basic" ? null : (targetAge || null),
          target_interests: tier === "basic" ? [] : targetInterests.map((t) => t.tag),
          response_goal: goalNum,
          // General users have no campus, so their surveys are always public.
          allow_general_respondents: isGeneral ? true : allowGeneral,
          ...(expiresIso ? { expires_at: expiresIso } : {}),
        })
        .select("id")
        .single();
      if (error) throw error;
      await refreshProfile();
      toast.success(`Published as ${TIERS[tier].label}!`);
      navigate({ to: "/survey/$id", params: { id: data.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to publish");
    } finally {
      setSubmitting(false);
    }
  };

  const selected = TIERS[tier];
  const afford = profile ? canAfford(tier, profile.earned_credits, profile.paid_credits) : { ok: false };

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Studio</p>
      <h1 className="mt-1 font-serif text-5xl leading-[0.95]">
        Ask <em className="text-primary">{isGeneral ? "the public." : "campus."}</em>
      </h1>
      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-semibold">
        <span className="font-bold text-primary">{profile?.paid_credits ?? 0} paid</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{profile?.earned_credits ?? 0} earned</span>
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
              const locked = T.paidRequired && (profile?.paid_credits ?? 0) < T.cost;
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
                    {T.paidRequired ? (
                      <Sparkles className="h-3.5 w-3.5" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] opacity-80">{T.tagline}</p>
                  <p className="mt-3 text-xs font-bold">
                    {T.cost} {T.paidRequired ? "paid" : "credits"}
                  </p>
                  <ul className="mt-2 space-y-0.5 text-[11px] opacity-80">
                    {T.features.slice(0, 2).map((f) => <li key={f}>· {f}</li>)}
                  </ul>
                  {locked && !active && (
                    <span className="absolute bottom-2 right-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
                      <Lock className="h-3 w-3" /> need paid
                    </span>
                  )}
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
                    <Label>Target country</Label>
                    <Select value={targetCountry} onValueChange={(v) => setTargetCountry(v === "__any" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Anywhere" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="__any">Anywhere</SelectItem>
                        {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Target age range</Label>
                    <Select value={targetAge} onValueChange={(v) => setTargetAge(v === "__any" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Any age" /></SelectTrigger>
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
                <p className="text-xs font-semibold">Open to anyone (beyond my campus)</p>
                <p className="text-[11px] text-muted-foreground">
                  General (non-student) users will be able to find and answer this survey.
                </p>
              </div>
            </label>
          )}
        </div>

        </div>


        {/* Questions */}
        <div className="space-y-3">
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

        {!afford.ok && selected.paidRequired ? (
          <Link to="/buy" className="block">
            <Button type="button" size="lg" className="h-14 w-full rounded-full bg-highlight text-highlight-foreground hover:bg-highlight/90 text-base">
              <Sparkles className="mr-1 h-4 w-4" /> Buy {selected.cost - (profile?.paid_credits ?? 0)} more paid credits to publish {selected.label}
            </Button>
          </Link>
        ) : (
          <Button type="submit" size="lg" disabled={submitting || !afford.ok}
            className="h-14 w-full rounded-full bg-primary text-base">
            {submitting ? "Publishing…" : !afford.ok ? afford.reason : `Publish ${selected.label} for ${selected.cost} credits →`}
          </Button>
        )}
      </form>
    </div>
  );
}
