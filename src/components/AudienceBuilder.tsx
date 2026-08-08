import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InterestTagInput, type InterestEntry } from "@/components/InterestTagInput";
import {
  AGE_RANGES, COUNTRIES, DEPARTMENT_SUGGESTIONS, YEAR_OPTIONS,
} from "@/lib/interests";
import { Loader2, Lock, Sparkle, Users, AlertTriangle, CheckCircle2, GraduationCap, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EXPANSION_PRICE_GHS, EXPANSION_SLOTS } from "@/lib/university-slots";

export type CriterionKey = "department" | "year" | "country" | "age_range" | "interests" | "universities";

export type UniversityOption = { domain: string; name: string; members: number };

export type AudienceValue = {
  department: string;
  year: string;
  country: string;
  age_range: string;
  interests: InterestEntry[];
  universities: string[];
  required: CriterionKey[];
};

export type Reach = { pool: number; eligible: number; perfect: number };

type Props = {
  value: AudienceValue;
  onChange: (next: AudienceValue) => void;
  isGeneral: boolean;
  allowGeneral: boolean;
  responseGoal: number;
  /** How many universities this creator may target. */
  pickLimit?: number;
  /** Called when the creator wants to buy more university slots. */
  onBuySlots?: () => void;
  buyingSlots?: boolean;
};

const ANY = "__any";

/** Required = hard filter (people who don't match never see it).
 *  Preferred = soft signal (survey ranks higher for matches, nobody excluded). */
function RequiredToggle({
  active, disabled, onToggle,
}: { active: boolean; disabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div
      className={`inline-flex rounded-full border border-foreground/15 bg-background/60 p-0.5 text-[10px] font-bold uppercase tracking-wide ${disabled ? "opacity-40 pointer-events-none" : ""}`}
      role="group"
      aria-label="Match strictness"
    >
      <button
        type="button"
        onClick={() => onToggle(false)}
        aria-pressed={!active}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition ${!active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Sparkle className="h-2.5 w-2.5" /> Preferred
      </button>
      <button
        type="button"
        onClick={() => onToggle(true)}
        aria-pressed={active}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Lock className="h-2.5 w-2.5" /> Required
      </button>
    </div>
  );
}

function Field({
  label, hint, criterion, value, children, onToggle,
}: {
  label: string;
  hint?: string;
  criterion: CriterionKey;
  value: AudienceValue;
  children: React.ReactNode;
  onToggle: (key: CriterionKey, required: boolean) => void;
}) {
  const isSet =
    criterion === "interests"
      ? value.interests.length > 0
      : criterion === "universities"
        ? value.universities.length > 0
        : String(value[criterion] ?? "").trim() !== "";
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        <RequiredToggle
          active={value.required.includes(criterion)}
          disabled={!isSet}
          onToggle={(v) => onToggle(criterion, v)}
        />
      </div>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Multi-select over the universities present on the platform, capped by the creator's allowance. */
function UniversityPicker({
  selected, onChange, limit, onBuySlots, buying,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  limit: number;
  onBuySlots?: () => void;
  buying?: boolean;
}) {
  const [options, setOptions] = useState<UniversityOption[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("list_universities" as never);
      if (cancelled) return;
      setOptions(((data as unknown as UniversityOption[]) ?? []));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const atCap = selected.length >= limit;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !q || o.name.toLowerCase().includes(q) || o.domain.includes(q)).slice(0, 40);
  }, [options, query]);

  const nameOf = (domain: string) =>
    options.find((o) => o.domain === domain)?.name ?? domain;

  const toggleUni = (domain: string) => {
    if (selected.includes(domain)) onChange(selected.filter((d) => d !== domain));
    else if (!atCap) onChange([...selected, domain]);
  };

  return (
    <div className="rounded-2xl border border-foreground/15 bg-background/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
          {selected.length} of {limit} universities picked
        </p>
        {onBuySlots && (
          <Button type="button" size="sm" variant={atCap ? "default" : "ghost"} onClick={onBuySlots} disabled={buying}>
            {buying ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
            +{EXPANSION_SLOTS} picks · ₵{EXPANSION_PRICE_GHS}
          </Button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((d) => (
            <Badge key={d} variant="secondary" className="gap-1">
              {nameOf(d)}
              <button type="button" onClick={() => toggleUni(d)} aria-label={`Remove ${nameOf(d)}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search universities…"
          className="pl-8"
        />
      </div>

      <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-foreground/10">
        {loading ? (
          <p className="p-3 text-[11px] text-muted-foreground">Loading universities…</p>
        ) : filtered.length === 0 ? (
          <p className="p-3 text-[11px] text-muted-foreground">No universities match that search yet.</p>
        ) : (
          filtered.map((o) => {
            const on = selected.includes(o.domain);
            return (
              <button
                key={o.domain}
                type="button"
                onClick={() => toggleUni(o.domain)}
                disabled={!on && atCap}
                className={`flex w-full items-center justify-between gap-2 border-b border-foreground/5 px-3 py-2 text-left text-xs last:border-0 transition ${
                  on ? "bg-primary/10 font-semibold" : "hover:bg-secondary/60 disabled:opacity-40"
                }`}
              >
                <span className="truncate">{o.name}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{o.members} members</span>
              </button>
            );
          })
        )}
      </div>

      {atCap && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          You've used all {limit} picks. Add {EXPANSION_SLOTS} more for ₵{EXPANSION_PRICE_GHS}.
        </p>
      )}
    </div>
  );
}

export function AudienceBuilder({
  value, onChange, isGeneral, allowGeneral, responseGoal,
  pickLimit = 5, onBuySlots, buyingSlots,
}: Props) {
  const [reach, setReach] = useState<Reach | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (patch: Partial<AudienceValue>) => onChange({ ...value, ...patch });

  const toggle = (key: CriterionKey, required: boolean) =>
    set({
      required: required
        ? Array.from(new Set([...value.required, key]))
        : value.required.filter((k) => k !== key),
    });

  // Drop "required" flags for criteria that were cleared out.
  useEffect(() => {
    const stillSet = value.required.filter((k) =>
      k === "interests"
        ? value.interests.length > 0
        : k === "universities"
          ? value.universities.length > 0
          : String(value[k] ?? "").trim() !== "",
    );
    if (stillSet.length !== value.required.length) set({ required: stillSet });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.department, value.year, value.country, value.age_range, value.interests.length, value.universities.length]);

  const tagIds = useMemo(() => value.interests.map((i) => i.tag), [value.interests]);
  const signature = JSON.stringify([
    allowGeneral, value.department, value.year, value.country, value.age_range,
    tagIds, value.universities, value.required,
  ]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("estimate_survey_reach" as never, {
        _allow_general: allowGeneral,
        _department: value.department || null,
        _year: value.year || null,
        _country: value.country || null,
        _age_range: value.age_range || null,
        _interests: tagIds,
        _required: value.required,
        _universities: value.universities,
      } as never);
      if (cancelled) return;
      setReach((data as unknown as Reach) ?? null);
      if (error) setReach(null);
      setLoading(false);
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const eligible = reach?.eligible ?? 0;
  const perfect = reach?.perfect ?? 0;
  const tooNarrow = !!reach && eligible < responseGoal;
  const veryNarrow = !!reach && eligible < Math.max(3, Math.ceil(responseGoal * 0.25));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-foreground/15 bg-background/40 p-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Required</span> criteria hide the survey
          from everyone who doesn't match. <span className="font-semibold text-foreground">Preferred</span>{" "}
          criteria don't exclude anyone — they push the survey to the top of matching people's feeds.
          Start with preferred, and only lock what you truly need.
        </p>
      </div>

      {isGeneral ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country" criterion="country" value={value} onToggle={toggle}>
            <Select
              value={value.country || ANY}
              onValueChange={(v) => set({ country: v === ANY ? "" : v })}
            >
              <SelectTrigger><SelectValue placeholder="Anywhere" /></SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value={ANY}>Anywhere</SelectItem>
                {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Age range" criterion="age_range" value={value} onToggle={toggle}>
            <Select
              value={value.age_range || ANY}
              onValueChange={(v) => set({ age_range: v === ANY ? "" : v })}
            >
              <SelectTrigger><SelectValue placeholder="Any age" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any age</SelectItem>
                {AGE_RANGES.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Department"
            criterion="department"
            value={value}
            onToggle={toggle}
            hint="Pick from the list so it matches how students filled in their profile."
          >
            <Input
              list="cv-departments"
              value={value.department}
              onChange={(e) => set({ department: e.target.value })}
              placeholder="Any department"
            />
            <datalist id="cv-departments">
              {DEPARTMENT_SUGGESTIONS.map((d) => <option key={d} value={d} />)}
            </datalist>
          </Field>
          <Field label="Year" criterion="year" value={value} onToggle={toggle}>
            <Select
              value={value.year || ANY}
              onValueChange={(v) => set({ year: v === ANY ? "" : v })}
            >
              <SelectTrigger><SelectValue placeholder="Any year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any year</SelectItem>
                {YEAR_OPTIONS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      <Field
        label="Interests"
        criterion="interests"
        value={value}
        onToggle={toggle}
        hint="Type anything — we map it to a category. Leave empty for no interest signal."
      >
        <InterestTagInput
          value={value.interests}
          onChange={(interests) => set({ interests })}
          placeholder="e.g. fitness, crypto, gaming…"
        />
      </Field>

      {/* Live reach */}
      <div
        className={`rounded-2xl border p-4 ${
          veryNarrow
            ? "border-destructive/40 bg-destructive/5"
            : tooNarrow
              ? "border-foreground/25 bg-secondary/40"
              : "border-primary/30 bg-primary/5"
        }`}
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Estimated audience
          </p>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>

        <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <p className="font-serif text-4xl leading-none">{reach ? eligible : "—"}</p>
            <p className="text-[11px] text-muted-foreground">can see this survey</p>
          </div>
          <div>
            <p className="font-serif text-2xl leading-none text-primary">{reach ? perfect : "—"}</p>
            <p className="text-[11px] text-muted-foreground">match every preference</p>
          </div>
          <div>
            <p className="font-serif text-2xl leading-none text-muted-foreground">{reach?.pool ?? "—"}</p>
            <p className="text-[11px] text-muted-foreground">in your reachable pool</p>
          </div>
        </div>

        {reach && (
          <p className={`mt-3 flex items-start gap-1.5 text-[11px] ${veryNarrow ? "text-destructive" : "text-muted-foreground"}`}>
            {tooNarrow ? <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />}
            {veryNarrow ? (
              <span>
                Your goal of {responseGoal} responses is far above the {eligible} people who can see
                this. Switch a required criterion to <strong>Preferred</strong>{allowGeneral ? "" : " or open it to anyone"} to widen reach.
              </span>
            ) : tooNarrow ? (
              <span>
                {eligible} people can see this but your goal is {responseGoal}. It may take a while to
                fill — relaxing one required criterion helps.
              </span>
            ) : (
              <span>Healthy reach — {eligible} people can see this, {perfect} are a perfect match.</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
