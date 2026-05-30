import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, BarChart3, Download, FileText, Filter, Layers, Lock,
  PieChart as PieIcon, Share2, Sparkles, Table as TableIcon, X, Save, Trash2, Copy, Eye,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import jsPDF from "jspdf";


const PALETTE = ["#4a6b52", "#7c9a6b", "#c98a4b", "#b8c47a", "#8e7a5a", "#6b8e9e", "#a47b4c"];
const SUPPRESS_THRESHOLD = 5;

type Question = { id: string; type: "text" | "choice" | "rating"; text: string; options?: string[] };
type Survey = {
  id: string; creator_id: string; title: string; description: string;
  questions: Question[]; response_count: number; response_goal: number;
  expires_at: string; created_at: string; tier: string;
  university_domain: string;
};
type Response = {
  id: string; survey_id: string; respondent_id: string;
  answers: Record<string, string>; created_at: string; duration_ms: number;
};
type Profile = {
  id: string; full_name: string; department: string; year: string;
  country: string | null; age_range: string | null; university_name: string;
};
type Filters = {
  department: string; year: string; country: string; age_range: string;
};

const EMPTY_FILTERS: Filters = { department: "", year: "", country: "", age_range: "" };

export const Route = createFileRoute("/_authenticated/survey/$id/analyze")({
  component: AnalyzePage,
});

function AnalyzePage() {
  const { id } = Route.useParams();
  const { user, isPreviewMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});
  const [paidCredits, setPaidCredits] = useState(0);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [view, setView] = useState<"overview" | "questions" | "compare" | "crosstab" | "raw" | "saved">("overview");
  const [hiddenQs, setHiddenQs] = useState<Set<string>>(new Set());
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [shareTokens, setShareTokens] = useState<any[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [upgradePrompt, setUpgradePrompt] = useState<{ open: boolean; feature: string; description?: string }>({ open: false, feature: "" });
  const promptUpgrade = (feature: string, description?: string) => setUpgradePrompt({ open: true, feature, description });

  useEffect(() => {
    if (!user || isPreviewMode) { setLoading(false); return; }
    let active = true;
    (async () => {
      const [{ data: s }, { data: r }, { data: p }] = await Promise.all([
        supabase.from("surveys").select("*").eq("id", id).maybeSingle(),
        supabase.from("survey_responses").select("*").eq("survey_id", id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("paid_credits").eq("id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      if (!s || s.creator_id !== user.id) { setLoading(false); return; }
      setSurvey(s as unknown as Survey);
      const resps = (r as unknown as Response[]) ?? [];
      setResponses(resps);
      setPaidCredits((p as any)?.paid_credits ?? 0);

      // Pull demographic info for filters via the safe campus_directory view
      const ids = Array.from(new Set(resps.map((x) => x.respondent_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("campus_directory" as any)
          .select("id, full_name, department, year, country, age_range, university_name")
          .in("id", ids);
        if (!active) return;
        const map: Record<string, Profile> = {};
        ((profs as any) ?? []).forEach((pr: Profile) => { map[pr.id] = pr; });
        setProfileMap(map);
      }

      const [{ data: vs }, { data: ts }] = await Promise.all([
        supabase.from("survey_report_views" as any).select("*").eq("survey_id", id).order("created_at", { ascending: false }),
        supabase.from("survey_share_tokens" as any).select("*").eq("survey_id", id).order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      setSavedViews((vs as any) ?? []);
      setShareTokens((ts as any) ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id, user, isPreviewMode]);

  const isPremium = useMemo(() => {
    // Premium features are free for now — all signed-in creators get full access.
    return !!survey;
  }, [survey]);

  const filtered = useMemo(() => {
    return responses.filter((r) => {
      const p = profileMap[r.respondent_id];
      if (filters.department && p?.department !== filters.department) return false;
      if (filters.year && p?.year !== filters.year) return false;
      if (filters.country && p?.country !== filters.country) return false;
      if (filters.age_range && p?.age_range !== filters.age_range) return false;
      return true;
    });
  }, [responses, profileMap, filters]);

  const facetValues = useMemo(() => {
    const set = (k: keyof Profile) => Array.from(new Set(
      Object.values(profileMap).map((p) => (p?.[k] as string) ?? "").filter(Boolean)
    )).sort();
    return {
      department: set("department"),
      year: set("year"),
      country: set("country"),
      age_range: set("age_range"),
    };
  }, [profileMap]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading analysis…</p>;
  if (!survey) return <p className="text-sm text-muted-foreground">Survey not found or you don't have access.</p>;

  const n = filtered.length;
  const activeFilterChips = (Object.entries(filters) as [keyof Filters, string][])
    .filter(([, v]) => v)
    .map(([k, v]) => ({ k, v }));

  const VIEWS: Array<{ key: typeof view; label: string; icon: any; premium?: boolean }> = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "questions", label: "Questions", icon: PieIcon },
    { key: "compare", label: "Subgroup compare", icon: Layers, premium: true },
    { key: "crosstab", label: "Cross-tab", icon: TableIcon, premium: true },
    { key: "raw", label: "Raw data", icon: TableIcon },
    { key: "saved", label: "Saved views", icon: Save, premium: true },
  ];

  // --- Saved views & share tokens helpers ---
  const saveCurrentView = async () => {
    if (!isPremium) return promptUpgrade("Saved views", "Save filter + question selections so you can revisit the exact same report cut later.");
    const name = prompt("Name this view:");
    if (!name) return;
    const { error } = await supabase.from("survey_report_views" as any).insert({
      survey_id: id, creator_id: user!.id, name,
      config: { view, filters, hiddenQs: Array.from(hiddenQs) },
    });
    if (error) return toast.error(error.message);
    const { data } = await supabase.from("survey_report_views" as any).select("*").eq("survey_id", id).order("created_at", { ascending: false });
    setSavedViews((data as any) ?? []);
    toast.success("View saved.");
  };
  const applyView = (cfg: any) => {
    setView(cfg.view ?? "overview");
    setFilters({ ...EMPTY_FILTERS, ...(cfg.filters ?? {}) });
    setHiddenQs(new Set(cfg.hiddenQs ?? []));
    toast.success("View applied.");
  };
  const deleteSavedView = async (vid: string) => {
    await supabase.from("survey_report_views" as any).delete().eq("id", vid);
    setSavedViews((vs) => vs.filter((v) => v.id !== vid));
  };

  const createShareLink = async () => {
    if (!isPremium) return promptUpgrade("Shareable live dashboards", "Mint a read-only public URL that always shows the latest aggregated results — perfect for sharing with stakeholders without giving them account access.");
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("survey_share_tokens" as any).insert({
      survey_id: id, creator_id: user!.id, token,
      expires_at: new Date(Date.now() + 90 * 86400_000).toISOString(),
    });
    if (error) return toast.error(error.message);
    const { data } = await supabase.from("survey_share_tokens" as any).select("*").eq("survey_id", id).order("created_at", { ascending: false });
    setShareTokens((data as any) ?? []);
    setNewToken(token);
    const url = `${window.location.origin}/r/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link created and copied to clipboard.");
  };
  const dismissNewToken = () => setNewToken(null);
  const copyNewToken = () => {
    if (!newToken) return;
    const url = `${window.location.origin}/r/${newToken}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copied.");
  };
  const revokeShare = async (tid: string) => {
    await supabase.from("survey_share_tokens" as any).update({ revoked: true }).eq("id", tid);
    setShareTokens((ts) => ts.map((t) => (t.id === tid ? { ...t, revoked: true } : t)));
  };
  const copyShare = (token: string) => {
    const url = `${window.location.origin}/r/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Share URL copied.");
  };

  // --- Exports ---
  const exportCSV = () => {
    const header = ["submitted_at", "department", "year", "country", "age_range",
      ...survey.questions.map((q) => `Q: ${q.text.replace(/"/g, '""')}`)];
    const rows = filtered.map((r) => {
      const p = profileMap[r.respondent_id];
      return [
        r.created_at, p?.department ?? "", p?.year ?? "", p?.country ?? "", p?.age_range ?? "",
        ...survey.questions.map((q) => String(r.answers?.[q.id] ?? "").replace(/"/g, '""')),
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${survey.title.replace(/\s+/g, "_")}_responses.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportPDF = () => {
    if (!isPremium) return promptUpgrade("Branded PDF reports", "Generate a polished, presentation-ready PDF report with your university name and CampusVerify footer — ready to email or hand in.");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    let y = margin;
    const line = (txt: string, size = 11, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const wrapped = doc.splitTextToSize(txt, W - margin * 2);
      for (const ln of wrapped) {
        if (y > H - margin - 30) { doc.addPage(); y = margin; }
        doc.text(ln, margin, y); y += size + 4;
      }
    };
    line("CampusVerify · Survey Report", 9);
    line(survey.title, 20, true);
    if (survey.description) line(survey.description, 10);
    line(`Sample size (n) = ${n} of ${responses.length} total responses`, 10, true);
    if (activeFilterChips.length) line(`Filters: ${activeFilterChips.map((c) => `${c.k}=${c.v}`).join(", ")}`, 10);
    line(`Generated ${new Date().toLocaleString()}`, 9);
    y += 10;
    survey.questions.forEach((q, qi) => {
      if (hiddenQs.has(q.id)) return;
      y += 6;
      line(`Q${qi + 1}. ${q.text}`, 12, true);
      if (q.type === "choice" || q.type === "rating") {
        const data = aggregateQuestion(q, filtered);
        const total = data.reduce((s, x) => s + x.count, 0) || 1;
        data.forEach((c) => {
          const pct = ((c.count / total) * 100).toFixed(1);
          const display = c.count < SUPPRESS_THRESHOLD ? "— (n<5, hidden)" : `${c.count} (${pct}%)`;
          line(`  • ${c.label}: ${display}`, 10);
        });
      } else {
        const answered = filtered.filter((r) => String(r.answers?.[q.id] ?? "").trim()).length;
        line(`  ${answered} of ${n} answered (free-text answers omitted from report)`, 10);
      }
    });
    const footer = `Generated on CampusVerify · n=${n} · privacy: groups <5 suppressed`;
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(footer, margin, H - 20);
    doc.save(`${survey.title.replace(/\s+/g, "_")}_report.pdf`);
  };

  return (
    <div>
      <Link to="/my-surveys" className="mb-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> My surveys
      </Link>

      {/* Header */}
      <div className="rounded-3xl border border-foreground/15 bg-card p-7 shadow-paper">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Analyze</p>
        <h1 className="mt-2 font-serif text-4xl leading-[0.95] sm:text-5xl">{survey.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
          <span className="rounded-full bg-foreground px-3 py-1 text-background">n = {n}{n !== responses.length && ` of ${responses.length}`}</span>
          <span className="rounded-full border border-foreground/20 px-3 py-1 text-muted-foreground">tier: {survey.tier}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-highlight px-3 py-1 text-highlight-foreground">
            <Sparkles className="h-3 w-3" /> Full analytics included
          </span>
        </div>
        {activeFilterChips.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Filters:</span>
            {activeFilterChips.map((c) => (
              <button
                key={c.k}
                onClick={() => setFilters((f) => ({ ...f, [c.k]: "" }))}
                className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground hover:bg-accent/80"
              >
                {c.k}: {c.v} <X className="h-3 w-3" />
              </button>
            ))}
            <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-[11px] font-semibold uppercase text-muted-foreground underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-foreground/15 bg-card p-4 shadow-paper">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Views</p>
            <nav className="mt-2 flex flex-col gap-1">
              {VIEWS.map((v) => {
                const Icon = v.icon;
                const active = view === v.key;
                return (
                  <button
                    key={v.key}
                    onClick={() => {
                      if (v.premium && !isPremium) {
                        promptUpgrade(v.label, `${v.label} is part of the advanced reporting suite.`);
                        return;
                      }
                      setView(v.key);
                    }}
                    className={`flex items-center justify-between gap-2 rounded-full px-3 py-2 text-left text-sm transition-colors ${
                      active ? "bg-foreground text-background" : "hover:bg-accent"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{v.label}</span>
                    {v.premium && !isPremium && <Lock className="h-3 w-3 opacity-60" />}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="rounded-3xl border border-foreground/15 bg-card p-4 shadow-paper">
            <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <Filter className="h-3 w-3" /> Filters
            </p>
            <div className="mt-3 space-y-3 text-xs">
              {(["department", "year", "country", "age_range"] as const).map((k) => (
                <div key={k}>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.replace("_", " ")}</Label>
                  <select
                    value={filters[k]}
                    onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-foreground/20 bg-background px-2 py-1.5 text-xs"
                  >
                    <option value="">All</option>
                    {facetValues[k].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-foreground/15 bg-card p-4 shadow-paper">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Export</p>
            <div className="mt-2 flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={exportCSV} className="rounded-full">
                <Download className="mr-1 h-3.5 w-3.5" /> CSV (raw)
              </Button>
              <Button size="sm" variant="outline" onClick={exportPDF} className="rounded-full">
                {!isPremium && <Lock className="mr-1 h-3 w-3" />}
                <FileText className="mr-1 h-3.5 w-3.5" /> PDF report
              </Button>
              <Button size="sm" variant="outline" onClick={saveCurrentView} className="rounded-full">
                {!isPremium && <Lock className="mr-1 h-3 w-3" />}
                <Save className="mr-1 h-3.5 w-3.5" /> Save view
              </Button>
              <Button size="sm" variant="outline" onClick={createShareLink} className="rounded-full">
                {!isPremium && <Lock className="mr-1 h-3 w-3" />}
                <Share2 className="mr-1 h-3.5 w-3.5" /> Create share link
              </Button>
            </div>
            {newToken && (
              <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">New link created</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md bg-background px-2 py-1 text-[11px] font-mono text-foreground">
                    {window.location.origin}/r/{newToken}
                  </code>
                  <Button size="sm" variant="ghost" onClick={copyNewToken} className="h-7 rounded-full px-2">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyNewToken} className="h-7 flex-1 rounded-full text-xs">
                    Copy URL
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismissNewToken} className="h-7 rounded-full text-xs text-muted-foreground">
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main view */}
        <main>
          {responses.length === 0 ? (
            <EmptyState />
          ) : view === "overview" ? (
            <OverviewView survey={survey} filtered={filtered} hiddenQs={hiddenQs} />
          ) : view === "questions" ? (
            <QuestionsView survey={survey} filtered={filtered} hiddenQs={hiddenQs} setHiddenQs={setHiddenQs} />
          ) : view === "compare" ? (
            isPremium
              ? <CompareView survey={survey} filtered={filtered} profileMap={profileMap} />
              : <PremiumLockCard label="Subgroup comparison" />
          ) : view === "crosstab" ? (
            isPremium
              ? <CrossTabView survey={survey} filtered={filtered} />
              : <PremiumLockCard label="Cross-tab analysis" />
          ) : view === "raw" ? (
            <RawDataView survey={survey} filtered={filtered} profileMap={profileMap} />
          ) : (
            isPremium
              ? <SavedViewsPanel
                  saved={savedViews}
                  shareTokens={shareTokens}
                  onApply={applyView}
                  onDelete={deleteSavedView}
                  onRevoke={revokeShare}
                  onCopy={copyShare}
                />
              : <PremiumLockCard label="Saved views & shareable dashboards" />
          )}
          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Privacy: subgroups with fewer than {SUPPRESS_THRESHOLD} responses are suppressed and shown as "—".
          </p>
        </main>
      </div>
    </div>
  );
}

// ============= Helpers =============

function aggregateQuestion(q: Question, rows: Response[]) {
  const labels = q.type === "rating" ? ["1", "2", "3", "4", "5"] : (q.options ?? []);
  return labels.map((label) => ({
    label,
    count: rows.filter((r) => String(r.answers?.[q.id] ?? "") === label).length,
  }));
}

function safeCount(c: number) {
  return c < SUPPRESS_THRESHOLD ? null : c;
}

// ============= Views =============

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-foreground/25 bg-card p-10 text-center shadow-paper">
      <p className="font-serif text-2xl">No responses yet.</p>
      <p className="mt-1 text-sm text-muted-foreground">Once people start answering, your insights will appear here.</p>
    </div>
  );
}

function PremiumLockCard({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-foreground/15 bg-card p-10 text-center shadow-paper">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent">
        <Lock className="h-6 w-6 text-accent-foreground" />
      </div>
      <p className="mt-3 font-serif text-2xl">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Answer surveys in your feed to keep your credit balance topped up.
      </p>
    </div>
  );
}

function OverviewView({ survey, filtered, hiddenQs }: { survey: Survey; filtered: Response[]; hiddenQs: Set<string> }) {
  const total = filtered.length;
  let answered = 0, slots = 0, durSum = 0;
  filtered.forEach((r) => {
    durSum += r.duration_ms ?? 0;
    survey.questions.forEach((q) => {
      slots += 1;
      if (String(r.answers?.[q.id] ?? "").trim()) answered += 1;
    });
  });
  const completion = slots ? Math.round((answered / slots) * 100) : 0;
  const avgDur = total ? Math.round(durSum / total / 1000) : 0;

  const buckets: Record<string, number> = {};
  filtered.forEach((r) => {
    const d = new Date(r.created_at).toISOString().slice(0, 10);
    buckets[d] = (buckets[d] ?? 0) + 1;
  });
  const timeline = Object.entries(buckets).sort(([a],[b])=>a.localeCompare(b)).map(([date, count]) => ({ date: date.slice(5), count }));

  const top3 = survey.questions.filter((q) => (q.type === "choice" || q.type === "rating") && !hiddenQs.has(q.id)).slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total responses" value={String(total)} />
        <Stat label="Completion" value={`${completion}%`} sub="questions answered" />
        <Stat label="Avg duration" value={`${avgDur}s`} sub="per response" />
      </div>

      <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Responses over time</p>
        <div className="mt-3 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {top3.map((q) => {
          const data = aggregateQuestion(q, filtered);
          return (
            <div key={q.id} className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
              <p className="font-serif text-lg leading-tight">{q.text}</p>
              <div className="mt-2 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-4xl">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function QuestionsView({ survey, filtered, hiddenQs, setHiddenQs }: {
  survey: Survey; filtered: Response[]; hiddenQs: Set<string>; setHiddenQs: (s: Set<string>) => void;
}) {
  const toggle = (qid: string) => {
    const next = new Set(hiddenQs);
    if (next.has(qid)) next.delete(qid); else next.add(qid);
    setHiddenQs(next);
  };
  return (
    <div className="space-y-4">
      {survey.questions.map((q, qi) => {
        const hidden = hiddenQs.has(q.id);
        if (q.type === "text") {
          const answered = filtered.filter((r) => String(r.answers?.[q.id] ?? "").trim()).length;
          return (
            <div key={q.id} className={`rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper ${hidden ? "opacity-50" : ""}`}>
              <Header q={q} qi={qi} hidden={hidden} toggle={() => toggle(q.id)} />
              {!hidden && <p className="mt-2 text-sm text-muted-foreground">
                Free-text question — {answered} of {filtered.length} answered.
                Individual answers are kept private and visible only on the raw data view.
              </p>}
            </div>
          );
        }
        const data = aggregateQuestion(q, filtered);
        const total = data.reduce((s, x) => s + x.count, 0) || 1;
        return (
          <div key={q.id} className={`rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper ${hidden ? "opacity-50" : ""}`}>
            <Header q={q} qi={qi} hidden={hidden} toggle={() => toggle(q.id)} n={filtered.length} />
            {!hidden && (
              <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_240px]">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-foreground/15 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="py-1">Option</th><th className="py-1 text-right">n</th><th className="py-1 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((d) => {
                        const pct = ((d.count / total) * 100).toFixed(1);
                        const safe = safeCount(d.count);
                        return (
                          <tr key={d.label} className="border-b border-foreground/5">
                            <td className="py-1">{d.label}</td>
                            <td className="py-1 text-right font-mono">{safe ?? "—"}</td>
                            <td className="py-1 text-right font-mono text-muted-foreground">{safe ? `${pct}%` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Header({ q, qi, hidden, toggle, n }: { q: Question; qi: number; hidden: boolean; toggle: () => void; n?: number }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Q{qi + 1} · {q.type}{n != null && ` · n=${n}`}</p>
        <p className="mt-1 font-serif text-xl leading-tight">{q.text}</p>
      </div>
      <button onClick={toggle} className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
        {hidden ? "Show" : "Hide"}
      </button>
    </div>
  );
}

function CompareView({ survey, filtered, profileMap }: { survey: Survey; filtered: Response[]; profileMap: Record<string, Profile> }) {
  const choiceQs = survey.questions.filter((q) => q.type === "choice" || q.type === "rating");
  const [qid, setQid] = useState(choiceQs[0]?.id ?? "");
  const [dim, setDim] = useState<keyof Profile>("department");

  const q = choiceQs.find((x) => x.id === qid);
  if (!q) return <div className="rounded-3xl border border-foreground/15 bg-card p-6 text-sm text-muted-foreground shadow-paper">No comparable questions in this survey.</div>;

  const labels = q.type === "rating" ? ["1","2","3","4","5"] : (q.options ?? []);
  const groups = Array.from(new Set(filtered.map((r) => profileMap[r.respondent_id]?.[dim] as string).filter(Boolean))).sort();
  const data = labels.map((label) => {
    const row: any = { label };
    groups.forEach((g) => {
      const rows = filtered.filter((r) => (profileMap[r.respondent_id]?.[dim] as string) === g);
      const c = rows.filter((r) => String(r.answers?.[q.id] ?? "") === label).length;
      row[g] = rows.length < SUPPRESS_THRESHOLD ? 0 : c;
    });
    return row;
  });
  const suppressedGroups = groups.filter((g) => filtered.filter((r) => (profileMap[r.respondent_id]?.[dim] as string) === g).length < SUPPRESS_THRESHOLD);

  return (
    <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
      <div className="flex flex-wrap items-center gap-3">
        <select value={qid} onChange={(e) => setQid(e.target.value)} className="rounded-md border border-foreground/20 bg-background px-2 py-1.5 text-sm">
          {choiceQs.map((x) => <option key={x.id} value={x.id}>Q: {x.text.slice(0, 60)}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">by</span>
        <select value={dim} onChange={(e) => setDim(e.target.value as keyof Profile)} className="rounded-md border border-foreground/20 bg-background px-2 py-1.5 text-sm">
          <option value="department">Department</option>
          <option value="year">Year</option>
          <option value="country">Country</option>
          <option value="age_range">Age range</option>
        </select>
      </div>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {groups.map((g, i) => (
              <Bar key={g} dataKey={g} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {suppressedGroups.length > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Suppressed (n&lt;5): {suppressedGroups.join(", ")}
        </p>
      )}
    </div>
  );
}

function CrossTabView({ survey, filtered }: { survey: Survey; filtered: Response[] }) {
  const cs = survey.questions.filter((q) => q.type === "choice" || q.type === "rating");
  const [a, setA] = useState(cs[0]?.id ?? "");
  const [b, setB] = useState(cs[1]?.id ?? cs[0]?.id ?? "");
  if (cs.length < 2) return <div className="rounded-3xl border border-foreground/15 bg-card p-6 text-sm text-muted-foreground shadow-paper">Need at least two choice/rating questions.</div>;
  const qa = cs.find((x) => x.id === a)!;
  const qb = cs.find((x) => x.id === b)!;
  const la = qa.type === "rating" ? ["1","2","3","4","5"] : (qa.options ?? []);
  const lb = qb.type === "rating" ? ["1","2","3","4","5"] : (qb.options ?? []);
  return (
    <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
      <div className="flex flex-wrap items-center gap-3">
        <select value={a} onChange={(e) => setA(e.target.value)} className="rounded-md border border-foreground/20 bg-background px-2 py-1.5 text-sm">
          {cs.map((x) => <option key={x.id} value={x.id}>Row: {x.text.slice(0, 50)}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">×</span>
        <select value={b} onChange={(e) => setB(e.target.value)} className="rounded-md border border-foreground/20 bg-background px-2 py-1.5 text-sm">
          {cs.map((x) => <option key={x.id} value={x.id}>Col: {x.text.slice(0, 50)}</option>)}
        </select>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-foreground/20">
              <th className="p-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">{qa.text.slice(0, 30)} \ {qb.text.slice(0, 30)}</th>
              {lb.map((l) => <th key={l} className="p-2 text-right font-semibold">{l}</th>)}
              <th className="p-2 text-right text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {la.map((ra) => {
              const rowRows = filtered.filter((r) => String(r.answers?.[qa.id]) === ra);
              const total = rowRows.length;
              return (
                <tr key={ra} className="border-b border-foreground/5">
                  <td className="p-2 font-semibold">{ra}</td>
                  {lb.map((cb) => {
                    const c = rowRows.filter((r) => String(r.answers?.[qb.id]) === cb).length;
                    const safe = safeCount(c);
                    const pct = total ? ((c / total) * 100).toFixed(0) : "0";
                    return <td key={cb} className="p-2 text-right font-mono">{safe == null ? "—" : `${safe} (${pct}%)`}</td>;
                  })}
                  <td className="p-2 text-right text-muted-foreground">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Percentages are row %. Cells with n&lt;5 are suppressed.</p>
    </div>
  );
}

function RawDataView({ survey, filtered, profileMap }: { survey: Survey; filtered: Response[]; profileMap: Record<string, Profile> }) {
  return (
    <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Raw responses · n = {filtered.length}</p>
      <p className="mt-1 text-xs text-muted-foreground">Respondent identities are hidden. Only de-identified demographic tags are shown.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-foreground/20 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="p-2">Submitted</th>
              <th className="p-2">Dept</th>
              <th className="p-2">Year</th>
              {survey.questions.map((q, i) => <th key={q.id} className="p-2">Q{i+1}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const p = profileMap[r.respondent_id];
              return (
                <tr key={r.id} className="border-b border-foreground/5">
                  <td className="p-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-2">{p?.department ?? "—"}</td>
                  <td className="p-2">{p?.year ?? "—"}</td>
                  {survey.questions.map((q) => <td key={q.id} className="p-2">{String(r.answers?.[q.id] ?? "—").slice(0, 80)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SavedViewsPanel({ saved, shareTokens, onApply, onDelete, onRevoke, onCopy }: {
  saved: any[]; shareTokens: any[];
  onApply: (cfg: any) => void; onDelete: (id: string) => void;
  onRevoke: (id: string) => void; onCopy: (token: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Saved views</p>
        {saved.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No saved views yet. Use the "Save view" button in the sidebar to capture the current filter + selection.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {saved.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 rounded-xl border border-foreground/10 bg-background p-3">
                <div>
                  <p className="font-serif text-lg">{v.name}</p>
                  <p className="text-[11px] text-muted-foreground">Saved {new Date(v.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onApply(v.config)} className="rounded-full"><Eye className="mr-1 h-3 w-3" /> Apply</Button>
                  <Button size="sm" variant="outline" onClick={() => onDelete(v.id)} className="rounded-full"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Shareable dashboards</p>
        {shareTokens.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No share links. Use "Share dashboard" in the sidebar to mint one. Shared dashboards show aggregated charts only — no raw answers, no respondent info.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {shareTokens.map((t) => (
              <li key={t.id} className={`flex items-center justify-between gap-2 rounded-xl border border-foreground/10 bg-background p-3 ${t.revoked ? "opacity-50" : ""}`}>
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">/r/{t.token.slice(0, 12)}…</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.revoked ? "Revoked" : t.expires_at ? `Expires ${new Date(t.expires_at).toLocaleDateString()}` : "No expiry"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!t.revoked && <Button size="sm" variant="outline" onClick={() => onCopy(t.token)} className="rounded-full"><Copy className="mr-1 h-3 w-3" /> Copy</Button>}
                  {!t.revoked && <Button size="sm" variant="outline" onClick={() => onRevoke(t.id)} className="rounded-full"><Trash2 className="h-3 w-3" /></Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
