import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getOwnerSurveyResults } from "@/lib/survey-owner.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowUp, ArrowDown, FileDown, Loader2, PenLine, BarChart3,
  PieChart as PieIcon, ListOrdered, LayoutList, Clock, Users, ListChecks, CheckCircle2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import { analyzeSentiment, topWords, suggestInterpretation } from "@/lib/text-analysis";

type Question = { id: string; type: "text" | "choice" | "rating"; text: string; options?: string[] };
type Survey = {
  id: string; creator_id: string; title: string; description: string;
  questions: Question[]; response_count: number; response_goal?: number; created_at: string;
  university_domain?: string;
};
type ResponseRow = {
  id: string; respondent_id: string;
  answers: Record<string, string>; created_at: string; duration_ms?: number | null;
};
type ProfileRow = {
  id: string; department: string | null; year: string | null;
  country: string | null; age_range: string | null; university_name: string | null;
};

type ChartKind = "bar" | "column" | "pie" | "donut" | "table";

type ThemeKey = "forest" | "ink" | "clay" | "midnight";
const THEMES: Record<ThemeKey, { name: string; accent: string; soft: string; palette: string[] }> = {
  forest: { name: "Campus Green", accent: "#1f4d33", soft: "#f2f6f1", palette: ["#1f4d33", "#4a6b52", "#7c9a6b", "#b8c47a", "#c98a4b", "#8e7a5a", "#6b8e9e"] },
  ink: { name: "Editorial Ink", accent: "#1a1a1a", soft: "#f5f4f0", palette: ["#1a1a1a", "#4a4a4a", "#7a7a7a", "#a8a29a", "#c98a4b", "#6b8e9e", "#8e7a5a"] },
  clay: { name: "Warm Clay", accent: "#9b4423", soft: "#faf4ee", palette: ["#9b4423", "#c4654a", "#d4842a", "#e8b84a", "#87a878", "#6b8e9e", "#8e7a5a"] },
  midnight: { name: "Midnight Blue", accent: "#0f2b4a", soft: "#eff3f8", palette: ["#0f2b4a", "#1e4f7a", "#3b82a8", "#79b3c9", "#c98a4b", "#6b7a8e", "#a0aec0"] },
};
const SENTIMENT_COLORS = { positive: "#3f7a55", neutral: "#8e7a5a", negative: "#b04a3f" };

type SectionConfig = {
  qid: string;
  included: boolean;
  comment: string;
  chart: ChartKind;
  showRawText: boolean;
};

export const Route = createFileRoute("/_authenticated/survey/$id/report")({
  component: ReportBuilderPage,
  head: () => ({
    meta: [
      { title: "Survey Report Studio · CampusVerify" },
      { name: "description", content: "Build, theme and export a presentation-ready report from your CampusVerify survey responses." },
      { property: "og:title", content: "Survey Report Studio · CampusVerify" },
      { property: "og:description", content: "Turn campus survey responses into a polished, exportable report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/* ============================ helpers ============================ */

function aggregate(q: Question, rows: ResponseRow[]) {
  const labels = q.type === "rating" ? ["1", "2", "3", "4", "5"] : (q.options ?? []);
  return labels.map((label) => ({
    label,
    count: rows.filter((r) => String(r.answers?.[q.id] ?? "") === label).length,
  }));
}

function textAnswersFor(q: Question, rows: ResponseRow[]): string[] {
  return rows.map((r) => String(r.answers?.[q.id] ?? "").trim()).filter((t) => t.length > 0);
}

function answeredCount(q: Question, rows: ResponseRow[]) {
  return rows.filter((r) => String(r.answers?.[q.id] ?? "").trim() !== "").length;
}

function ratingAverage(q: Question, rows: ResponseRow[]) {
  const nums = rows.map((r) => Number(r.answers?.[q.id])).filter((n) => Number.isFinite(n) && n > 0);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function defaultChart(q: Question): ChartKind {
  if (q.type === "rating") return "column";
  if (q.type === "choice") return (q.options?.length ?? 0) <= 6 ? "donut" : "bar";
  return "bar";
}

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function groupBy(list: (string | null)[], fallback = "Unspecified") {
  const m = new Map<string, number>();
  list.forEach((v) => {
    const k = (v && v.trim()) || fallback;
    m.set(k, (m.get(k) ?? 0) + 1);
  });
  return Array.from(m.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function responsesOverTime(rows: ResponseRow[]) {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    m.set(key, (m.get(key) ?? 0) + 1);
  });
  return Array.from(m.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date: date.slice(5), count }));
}

function autoSummary(s: Survey, rs: ResponseRow[]) {
  const n = rs.length;
  const qCount = s.questions.length;
  const closed = s.questions.filter((q) => q.type === "choice" || q.type === "rating").length;
  return [
    `This report presents the findings of "${s.title}", conducted on CampusVerify with verified campus respondents.`,
    `A total of ${n} response${n === 1 ? "" : "s"} were collected across ${qCount} question${qCount === 1 ? "" : "s"} (${closed} closed-ended, ${qCount - closed} open-ended).`,
    `Each section below reports the distribution of answers, followed by commentary and, where enabled, verbatim responses.`,
  ].join(" ");
}

function keyFindings(s: Survey, rs: ResponseRow[]): string[] {
  const out: string[] = [];
  for (const q of s.questions) {
    if (q.type === "text") continue;
    const data = aggregate(q, rs);
    const total = data.reduce((a, b) => a + b.count, 0);
    if (!total) continue;
    const top = [...data].sort((a, b) => b.count - a.count)[0];
    if (q.type === "rating") {
      const avg = ratingAverage(q, rs);
      if (avg !== null) out.push(`"${q.text}" averaged ${avg.toFixed(1)} out of 5 across ${total} rating${total === 1 ? "" : "s"}.`);
    } else {
      out.push(`${((top.count / total) * 100).toFixed(0)}% chose "${top.label}" for "${q.text}".`);
    }
    if (out.length >= 5) break;
  }
  return out;
}

/* ============================ page ============================ */

function ReportBuilderPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const fetchOwnerResults = useServerFn(getOwnerSurveyResults);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  // Report configuration
  const [reportTitle, setReportTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [summary, setSummary] = useState("");
  const [theme, setTheme] = useState<ThemeKey>("forest");
  const [showCover, setShowCover] = useState(true);
  const [showFindings, setShowFindings] = useState(true);
  const [showDemographics, setShowDemographics] = useState(true);
  const [showMethodology, setShowMethodology] = useState(true);
  const [sections, setSections] = useState<SectionConfig[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let active = true;
    (async () => {
      try {
        const data = await fetchOwnerResults({ data: { surveyId: id } });
        if (!active) return;
        if (!data.survey) { setLoading(false); return; }
        const s = data.survey as unknown as Survey;
        const rs = (data.responses as unknown as ResponseRow[]) ?? [];
        setSurvey(s);
        setResponses(rs);
        setProfiles(((data.profiles ?? []) as unknown as ProfileRow[]));
        setReportTitle(`${s.title}`);
        setSubtitle("Survey findings report");
        setSummary(autoSummary(s, rs));
        setSections(s.questions.map((q) => ({
          qid: q.id, included: true, comment: "", chart: defaultChart(q), showRawText: false,
        })));
      } catch (err: any) {
        toast.error(err?.message ?? "Couldn't load report data.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const qMap = useMemo(() => {
    const m: Record<string, Question> = {};
    survey?.questions.forEach((q) => { m[q.id] = q; });
    return m;
  }, [survey]);

  const updateSection = (qid: string, patch: Partial<SectionConfig>) =>
    setSections((arr) => arr.map((s) => (s.qid === qid ? { ...s, ...patch } : s)));

  const moveSection = (idx: number, dir: -1 | 1) => {
    setSections((arr) => {
      const next = [...arr];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return arr;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const suggestComment = (qid: string) => {
    const q = qMap[qid];
    if (!q) return;
    if (q.type === "text") {
      updateSection(qid, { comment: suggestInterpretation(textAnswersFor(q, responses)) });
    } else {
      const data = aggregate(q, responses);
      const total = data.reduce((a, b) => a + b.count, 0);
      if (!total) { toast.info("No answers yet for this question."); return; }
      const sorted = [...data].sort((a, b) => b.count - a.count);
      const avg = q.type === "rating" ? ratingAverage(q, responses) : null;
      const parts = [
        `${sorted[0].label} was the most selected answer (${sorted[0].count} of ${total}, ${((sorted[0].count / total) * 100).toFixed(1)}%).`,
        sorted[1] ? `${sorted[1].label} followed with ${((sorted[1].count / total) * 100).toFixed(1)}%.` : "",
        avg !== null ? `The mean rating was ${avg.toFixed(2)} out of 5.` : "",
      ].filter(Boolean);
      updateSection(qid, { comment: parts.join(" ") });
    }
    toast.success("Commentary drafted from the response data.");
  };

  const reportRef = useRef<HTMLDivElement | null>(null);

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    const toastId = toast.loading("Generating PDF…");
    try {
      await new Promise((r) => setTimeout(r, 300));
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const pageEls = Array.from(reportRef.current.querySelectorAll<HTMLElement>("[data-report-page]"));
      if (pageEls.length === 0) throw new Error("Nothing to export");

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();

      for (let i = 0; i < pageEls.length; i++) {
        const canvas = await html2canvas(pageEls[i], { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) doc.addPage();
        const ratio = canvas.height / canvas.width;
        const drawH = W * ratio;
        if (drawH <= H) doc.addImage(imgData, "PNG", 0, 0, W, drawH);
        else {
          const scaledW = H / ratio;
          doc.addImage(imgData, "PNG", (W - scaledW) / 2, 0, scaledW, H);
        }
      }
      doc.save(`${(reportTitle || survey?.title || "survey").replace(/\s+/g, "_")}_report.pdf`);
      toast.success("Report exported.", { id: toastId });
    } catch (err: any) {
      console.error("[report] export failed", err);
      toast.error(err?.message ?? "Couldn't export PDF.", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const exportCsvSummary = () => {
    if (!survey) return;
    const lines: string[] = ["question,type,option,count,percent"];
    for (const q of survey.questions) {
      if (q.type === "text") continue;
      const data = aggregate(q, responses);
      const total = data.reduce((a, b) => a + b.count, 0) || 1;
      data.forEach((d) => {
        const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
        lines.push([esc(q.text), q.type, esc(d.label), String(d.count), ((d.count / total) * 100).toFixed(1)].join(","));
      });
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(survey.title || "survey").replace(/\s+/g, "_")}_summary.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading report studio…</p>;
  if (!survey) return <p className="text-sm text-muted-foreground">Survey not found.</p>;

  const t = THEMES[theme];
  const includedSections = sections.filter((s) => s.included);
  const appendixSections = includedSections.filter((s) => qMap[s.qid]?.type === "text" && s.showRawText);
  const findings = keyFindings(survey, responses);

  // Page numbering for the printed document
  let pageNo = 0;
  const nextPage = () => ++pageNo;

  const durations = responses.map((r) => Number(r.duration_ms ?? 0)).filter((n) => n > 0);
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const completion = survey.questions.length
    ? responses.length
      ? Math.round(
          (survey.questions.reduce((acc, q) => acc + answeredCount(q, responses), 0) /
            (survey.questions.length * responses.length)) * 100,
        )
      : 0
    : 0;
  const lastResponse = responses[0]?.created_at ?? null;

  return (
    <div className="space-y-6">
      <Link
        to="/survey/$id/analyze"
        params={{ id }}
        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to analytics
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Report studio</p>
          <h1 className="mt-1 font-serif text-4xl leading-[0.95]">{survey.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {responses.length} response{responses.length === 1 ? "" : "s"} · {survey.questions.length} question{survey.questions.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={exportCsvSummary}>
            <ListOrdered className="mr-1 h-4 w-4" /> Summary CSV
          </Button>
          <Button onClick={exportPDF} disabled={exporting} className="rounded-full">
            {exporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileDown className="mr-1 h-4 w-4" />}
            {exporting ? "Exporting…" : "Export PDF"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary"><BarChart3 className="mr-1 h-3 w-3" /> Summary</TabsTrigger>
          <TabsTrigger value="build"><PenLine className="mr-1 h-3 w-3" /> Build report</TabsTrigger>
          <TabsTrigger value="preview"><LayoutList className="mr-1 h-3 w-3" /> Document preview</TabsTrigger>
        </TabsList>

        {/* ---------- SUMMARY (Forms-like at a glance) ---------- */}
        <TabsContent value="summary" className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Users className="h-4 w-4" />} label="Responses" value={String(responses.length)}
              hint={survey.response_goal ? `Goal ${survey.response_goal}` : undefined} />
            <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Completion" value={`${completion}%`} hint="Questions answered" />
            <Stat icon={<Clock className="h-4 w-4" />} label="Avg. time" value={avgDuration ? formatDuration(avgDuration) : "—"} hint="Per respondent" />
            <Stat icon={<ListChecks className="h-4 w-4" />} label="Last response" value={lastResponse ? new Date(lastResponse).toLocaleDateString() : "—"}
              hint={lastResponse ? new Date(lastResponse).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined} />
          </div>

          {responses.length > 0 && (
            <div className="rounded-3xl border border-foreground/15 bg-card p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Responses over time</p>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={responsesOverTime(responses)}>
                    <defs>
                      <linearGradient id="respGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={t.accent} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-foreground/10" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke={t.accent} fill="url(#respGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {findings.length > 0 && (
            <div className="rounded-3xl border border-foreground/15 bg-card p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Key findings</p>
              <ul className="mt-3 space-y-2">
                {findings.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-[2px] font-serif text-primary">{String(i + 1).padStart(2, "0")}</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {survey.questions.map((q, i) => {
              const cfg = sections.find((s) => s.qid === q.id);
              return (
                <SummaryQuestionCard
                  key={q.id}
                  index={i + 1}
                  question={q}
                  responses={responses}
                  chart={cfg?.chart ?? defaultChart(q)}
                  palette={t.palette}
                  accent={t.accent}
                  onChartChange={(c) => updateSection(q.id, { chart: c })}
                />
              );
            })}
          </div>
        </TabsContent>

        {/* ---------- BUILD ---------- */}
        <TabsContent value="build" className="mt-5">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
            <aside className="space-y-4">
              <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Cover</p>
                <Label className="mt-3 block text-xs">Report title</Label>
                <Input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} className="mt-1.5" />
                <Label className="mt-3 block text-xs">Subtitle</Label>
                <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="mt-1.5" />
                <Label className="mt-3 block text-xs">Prepared by</Label>
                <Input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Your name / department" className="mt-1.5" />
                <Label className="mt-3 block text-xs">Executive summary</Label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={6} className="mt-1.5 text-sm" />
              </div>

              <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Theme</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTheme(k)}
                      className={`rounded-2xl border p-3 text-left transition ${theme === k ? "border-primary ring-2 ring-primary/30" : "border-foreground/15 hover:border-foreground/30"}`}
                    >
                      <div className="flex gap-1">
                        {THEMES[k].palette.slice(0, 4).map((c) => (
                          <span key={c} className="h-3 w-3 rounded-full" style={{ background: c }} />
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] font-semibold">{THEMES[k].name}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-2.5">
                  <ToggleRow label="Cover page" checked={showCover} onChange={setShowCover} />
                  <ToggleRow label="Key findings page" checked={showFindings} onChange={setShowFindings} />
                  <ToggleRow label="Respondent profile page" checked={showDemographics} onChange={setShowDemographics} />
                  <ToggleRow label="Methodology & notes" checked={showMethodology} onChange={setShowMethodology} />
                </div>
              </div>

              <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Sections ({includedSections.length}/{sections.length})
                </p>
                <ul className="mt-3 space-y-2">
                  {sections.map((s, idx) => {
                    const q = qMap[s.qid];
                    if (!q) return null;
                    return (
                      <li key={s.qid} className="rounded-2xl border border-foreground/10 bg-background p-3">
                        <div className="flex items-start gap-2">
                          <Checkbox checked={s.included} onCheckedChange={(v) => updateSection(s.qid, { included: !!v })} className="mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-xs font-medium">Q{idx + 1}. {q.text}</p>
                            <div className="mt-2 flex items-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="h-6 w-6 rounded-full p-0">
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1} className="h-6 w-6 rounded-full p-0">
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        {s.included && (
                          <div className="mt-2 space-y-2">
                            {q.type !== "text" && (
                              <ChartPicker value={s.chart} onChange={(c) => updateSection(s.qid, { chart: c })} />
                            )}
                            <Textarea
                              placeholder="Commentary or interpretation…"
                              value={s.comment}
                              onChange={(e) => updateSection(s.qid, { comment: e.target.value })}
                              rows={2}
                              className="text-xs"
                            />
                            <Button type="button" size="sm" variant="outline" onClick={() => suggestComment(s.qid)} className="h-7 w-full rounded-full text-[11px]">
                              <PenLine className="mr-1 h-3 w-3" /> Draft from data
                            </Button>
                            {q.type === "text" && (
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-muted-foreground">Verbatim responses in appendix</span>
                                <Switch checked={s.showRawText} onCheckedChange={(v) => updateSection(s.qid, { showRawText: v })} />
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>

            <div className="rounded-3xl border border-dashed border-foreground/20 bg-secondary/30 p-6 text-sm text-muted-foreground">
              <p className="font-serif text-xl text-foreground">Live document</p>
              <p className="mt-2">
                Every change here updates the printed document instantly. Open the <strong>Document preview</strong> tab to
                page through it, or hit <strong>Export PDF</strong> at any time — the export always matches the preview page for page.
              </p>
              <ul className="mt-4 space-y-1.5">
                <li>· {showCover ? "Cover page included" : "No cover page"}</li>
                <li>· {showFindings ? `${findings.length} key finding${findings.length === 1 ? "" : "s"}` : "Key findings hidden"}</li>
                <li>· {includedSections.length} question section{includedSections.length === 1 ? "" : "s"}</li>
                <li>· {showDemographics ? "Respondent profile page included" : "Respondent profile hidden"}</li>
                <li>· {appendixSections.length} verbatim appendix section{appendixSections.length === 1 ? "" : "s"}</li>
              </ul>
            </div>
          </div>
        </TabsContent>

        {/* ---------- PREVIEW ---------- */}
        <TabsContent value="preview" className="mt-5">
          <div className="overflow-x-auto">
            <div className="mx-auto" style={{ width: 794 }}>
              <div ref={reportRef} className="space-y-6">
                {showCover && (
                  <CoverPage
                    theme={t}
                    title={reportTitle}
                    subtitle={subtitle}
                    description={survey.description}
                    summary={summary}
                    preparedBy={preparedBy}
                    totalResponses={responses.length}
                    questionCount={includedSections.length}
                    generatedAt={new Date()}
                    page={nextPage()}
                  />
                )}
                {showFindings && findings.length > 0 && (
                  <FindingsPage theme={t} findings={findings} page={nextPage()} />
                )}
                {showDemographics && profiles.length > 0 && (
                  <DemographicsPage theme={t} profiles={profiles} page={nextPage()} />
                )}
                {includedSections.map((s, idx) => {
                  const q = qMap[s.qid];
                  if (!q) return null;
                  return (
                    <QuestionReportPage
                      key={s.qid}
                      theme={t}
                      index={idx + 1}
                      question={q}
                      responses={responses}
                      comment={s.comment}
                      chart={s.chart}
                      page={nextPage()}
                    />
                  );
                })}
                {showMethodology && <MethodologyPage theme={t} totalResponses={responses.length} page={nextPage()} />}
                {appendixSections.length > 0 && (
                  <RawResponsesAppendix
                    theme={t}
                    page={nextPage()}
                    sections={appendixSections.map((s) => {
                      const q = qMap[s.qid];
                      const originalIdx = sections.findIndex((x) => x.qid === s.qid);
                      return { question: q, index: originalIdx + 1, answers: textAnswersFor(q, responses) };
                    })}
                  />
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================ app-side UI ============================ */

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-foreground/15 bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-2 font-serif text-3xl leading-none">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

const CHART_OPTIONS: { value: ChartKind; label: string; icon: React.ReactNode }[] = [
  { value: "column", label: "Columns", icon: <BarChart3 className="h-3 w-3" /> },
  { value: "bar", label: "Bars", icon: <BarChart3 className="h-3 w-3 rotate-90" /> },
  { value: "pie", label: "Pie", icon: <PieIcon className="h-3 w-3" /> },
  { value: "donut", label: "Donut", icon: <PieIcon className="h-3 w-3" /> },
  { value: "table", label: "Table", icon: <ListOrdered className="h-3 w-3" /> },
];

function ChartPicker({ value, onChange }: { value: ChartKind; onChange: (c: ChartKind) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {CHART_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition ${
            value === o.value ? "border-primary bg-primary/10 text-primary" : "border-foreground/15 text-muted-foreground hover:border-foreground/30"
          }`}
        >
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  );
}

function SummaryQuestionCard({
  index, question, responses, chart, palette, accent, onChartChange,
}: {
  index: number; question: Question; responses: ResponseRow[]; chart: ChartKind;
  palette: string[]; accent: string; onChartChange: (c: ChartKind) => void;
}) {
  const answered = answeredCount(question, responses);
  const isText = question.type === "text";
  const data = isText ? [] : aggregate(question, responses);
  const total = data.reduce((a, b) => a + b.count, 0);
  const top = total ? [...data].sort((a, b) => b.count - a.count)[0] : null;
  const avg = question.type === "rating" ? ratingAverage(question, responses) : null;
  const texts = isText ? textAnswersFor(question, responses) : [];

  return (
    <div className="rounded-3xl border border-foreground/15 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Question {index} · {labelForType(question.type)}
          </p>
          <h3 className="mt-1 font-serif text-xl leading-snug">{question.text}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {answered} response{answered === 1 ? "" : "s"}
            {avg !== null && ` · mean ${avg.toFixed(2)}/5`}
            {top && ` · top: ${top.label}`}
          </p>
        </div>
        {!isText && <ChartPicker value={chart} onChange={onChartChange} />}
      </div>

      <div className="mt-4">
        {isText ? (
          texts.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">No text responses yet.</p>
          ) : (
            <div className="space-y-2">
              {texts.slice(0, 4).map((tx, i) => (
                <div key={i} className="rounded-2xl bg-secondary/50 px-4 py-3 text-sm">
                  <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Anonymous #{i + 1}
                  </span>
                  {tx}
                </div>
              ))}
              {texts.length > 4 && (
                <p className="text-xs text-muted-foreground">+ {texts.length - 4} more in the report appendix.</p>
              )}
            </div>
          )
        ) : total === 0 ? (
          <p className="text-sm italic text-muted-foreground">No answers yet.</p>
        ) : (
          <ChartRenderer kind={chart} data={data} palette={palette} accent={accent} height={260} />
        )}
      </div>
    </div>
  );
}

function labelForType(t: Question["type"]) {
  return t === "text" ? "Open-ended" : t === "rating" ? "Rating" : "Multiple choice";
}

/* ============================ charts ============================ */

function ChartRenderer({
  kind, data, palette, accent, height,
}: {
  kind: ChartKind; data: { label: string; count: number }[]; palette: string[]; accent: string; height: number;
}) {
  const total = data.reduce((s, x) => s + x.count, 0) || 1;

  if (kind === "table") return <DistributionTable data={data} accent={accent} />;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "pie" || kind === "donut" ? (
          <PieChart>
            <Tooltip formatter={(v: number) => `${v} (${((v / total) * 100).toFixed(1)}%)`} />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: "sans-serif" }} />
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={kind === "donut" ? 55 : 0}
              outerRadius={90}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            </Pie>
          </PieChart>
        ) : kind === "bar" ? (
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fontFamily: "sans-serif" }} />
            <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 12, fontFamily: "sans-serif" }} />
            <Tooltip />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: "sans-serif" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fontFamily: "sans-serif" }} />
            <Tooltip />
            <Bar dataKey="count" fill={accent} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function DistributionTable({ data, accent }: { data: { label: string; count: number }[]; accent: string }) {
  const total = data.reduce((s, x) => s + x.count, 0) || 1;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "sans-serif", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: `2px solid ${accent}`, textAlign: "left" }}>
          <th style={{ padding: "8px 4px" }}>Option</th>
          <th style={{ padding: "8px 4px", width: "40%" }}>Share</th>
          <th style={{ padding: "8px 4px", textAlign: "right" }}>Count</th>
          <th style={{ padding: "8px 4px", textAlign: "right" }}>Percent</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={d.label} style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: "8px 4px" }}>{d.label}</td>
            <td style={{ padding: "8px 4px" }}>
              <div style={{ background: "#eee", height: 8, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(d.count / total) * 100}%`, height: "100%", background: accent }} />
              </div>
            </td>
            <td style={{ padding: "8px 4px", textAlign: "right" }}>{d.count}</td>
            <td style={{ padding: "8px 4px", textAlign: "right" }}>{((d.count / total) * 100).toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ============================ printed pages ============================ */

type Theme = (typeof THEMES)[ThemeKey];

const PAGE_STYLE: React.CSSProperties = {
  width: 794,
  minHeight: 1123,
  padding: "56px 64px",
  backgroundColor: "#ffffff",
  color: "#1a1a1a",
  fontFamily: "'Georgia', 'Times New Roman', serif",
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  boxSizing: "border-box",
  position: "relative",
  display: "flex",
  flexDirection: "column",
};

function Page({ theme, page, kicker, children }: { theme: Theme; page: number; kicker: string; children: React.ReactNode }) {
  return (
    <div data-report-page style={PAGE_STYLE}>
      <div style={{ height: 5, background: theme.accent, marginBottom: 28 }} />
      <div style={{ fontSize: 10.5, letterSpacing: "0.25em", textTransform: "uppercase", color: "#8a8a8a", fontFamily: "sans-serif" }}>
        {kicker}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
      <div
        style={{
          marginTop: 28, paddingTop: 12, borderTop: "1px solid #e8e8e8",
          fontSize: 9.5, color: "#8a8a8a", fontFamily: "sans-serif",
          display: "flex", justifyContent: "space-between", letterSpacing: "0.08em",
        }}
      >
        <span>CampusVerify · Verified campus research</span>
        <span>Page {page}</span>
      </div>
    </div>
  );
}

function PageHeading({ children, theme }: { children: React.ReactNode; theme: Theme }) {
  return (
    <h2 style={{ fontSize: 26, lineHeight: 1.2, margin: "10px 0 6px", fontWeight: 700, color: theme.accent }}>
      {children}
    </h2>
  );
}

function CoverPage({
  theme, title, subtitle, description, summary, preparedBy, totalResponses, questionCount, generatedAt, page,
}: {
  theme: Theme; title: string; subtitle: string; description: string; summary: string;
  preparedBy: string; totalResponses: number; questionCount: number; generatedAt: Date; page: number;
}) {
  return (
    <Page theme={theme} page={page} kicker="CampusVerify · Survey report">
      <div style={{ marginTop: 96 }}>
        <div style={{ width: 64, height: 3, background: theme.accent }} />
        <h1 style={{ fontSize: 46, lineHeight: 1.05, margin: "20px 0 0", fontWeight: 700 }}>{title}</h1>
        {subtitle && (
          <p style={{ marginTop: 12, fontSize: 17, color: theme.accent, fontFamily: "sans-serif", letterSpacing: "0.02em" }}>{subtitle}</p>
        )}
        {description && <p style={{ marginTop: 14, fontSize: 14.5, color: "#4a4a4a", lineHeight: 1.55 }}>{description}</p>}
      </div>

      <div style={{ marginTop: 56, background: theme.soft, padding: "22px 24px", borderLeft: `3px solid ${theme.accent}` }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7a7a7a", fontFamily: "sans-serif", marginBottom: 8 }}>
          Executive summary
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.65, color: "#222", whiteSpace: "pre-wrap", margin: 0 }}>{summary}</p>
      </div>

      <div style={{ marginTop: 44, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, fontFamily: "sans-serif" }}>
        <Meta label="Total responses" value={String(totalResponses)} />
        <Meta label="Questions reported" value={String(questionCount)} />
        <Meta label="Date generated" value={generatedAt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} />
      </div>
      {preparedBy && (
        <div style={{ marginTop: 24, fontFamily: "sans-serif" }}>
          <Meta label="Prepared by" value={preparedBy} />
        </div>
      )}
    </Page>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a8a8a" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 15.5, fontWeight: 600, color: "#1a1a1a" }}>{value}</div>
    </div>
  );
}

function FindingsPage({ theme, findings, page }: { theme: Theme; findings: string[]; page: number }) {
  return (
    <Page theme={theme} page={page} kicker="At a glance">
      <PageHeading theme={theme}>Key findings</PageHeading>
      <p style={{ fontSize: 12.5, color: "#666", fontFamily: "sans-serif", marginBottom: 24 }}>
        Automatically derived from the strongest signals in the closed-ended data.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {findings.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "14px 16px", background: theme.soft }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: theme.accent, lineHeight: 1 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span style={{ fontSize: 13.5, lineHeight: 1.6, color: "#222" }}>{f}</span>
          </div>
        ))}
      </div>
    </Page>
  );
}

function DemographicsPage({ theme, profiles, page }: { theme: Theme; profiles: ProfileRow[]; page: number }) {
  const blocks = [
    { title: "Department", data: groupBy(profiles.map((p) => p.department)) },
    { title: "Year of study", data: groupBy(profiles.map((p) => p.year)) },
    { title: "Country", data: groupBy(profiles.map((p) => p.country)) },
    { title: "Age range", data: groupBy(profiles.map((p) => p.age_range)) },
  ].filter((b) => b.data.length > 0);

  return (
    <Page theme={theme} page={page} kicker="Sample composition">
      <PageHeading theme={theme}>Respondent profile</PageHeading>
      <p style={{ fontSize: 12.5, color: "#666", fontFamily: "sans-serif", marginBottom: 20 }}>
        Aggregated, anonymised characteristics of the {profiles.length} verified respondent{profiles.length === 1 ? "" : "s"} in this sample.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {blocks.map((b) => (
          <div key={b.title}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7a7a7a", fontFamily: "sans-serif", marginBottom: 8 }}>
              {b.title}
            </div>
            <DistributionTable data={b.data.slice(0, 8)} accent={theme.accent} />
          </div>
        ))}
      </div>
    </Page>
  );
}

function QuestionReportPage({
  theme, index, question, responses, comment, chart, page,
}: {
  theme: Theme; index: number; question: Question; responses: ResponseRow[];
  comment: string; chart: ChartKind; page: number;
}) {
  const answered = answeredCount(question, responses);
  const avg = question.type === "rating" ? ratingAverage(question, responses) : null;

  return (
    <Page theme={theme} page={page} kicker={`Question ${index} · ${labelForType(question.type)}`}>
      <PageHeading theme={theme}>Q{index}. {question.text}</PageHeading>
      <div style={{ fontSize: 11.5, color: "#666", fontFamily: "sans-serif" }}>
        {answered} response{answered === 1 ? "" : "s"}{avg !== null && ` · mean ${avg.toFixed(2)} / 5`}
      </div>

      <div style={{ marginTop: 22 }}>
        {question.type === "text" ? (
          <TextAnalysisBlock question={question} responses={responses} theme={theme} />
        ) : (
          <>
            <ChartRenderer kind={chart} data={aggregate(question, responses)} palette={theme.palette} accent={theme.accent} height={270} />
            {chart !== "table" && (
              <div style={{ marginTop: 18 }}>
                <DistributionTable data={aggregate(question, responses)} accent={theme.accent} />
              </div>
            )}
          </>
        )}
      </div>

      {comment && (
        <div style={{ marginTop: 26, padding: 16, background: theme.soft, borderLeft: `3px solid ${theme.accent}`, fontFamily: "sans-serif" }}>
          <div style={{ fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6a6a6a", marginBottom: 6 }}>
            Commentary
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#222", margin: 0, whiteSpace: "pre-wrap" }}>{comment}</p>
        </div>
      )}
    </Page>
  );
}

function TextAnalysisBlock({ question, responses, theme }: { question: Question; responses: ResponseRow[]; theme: Theme }) {
  const answers = textAnswersFor(question, responses);
  const sentiment = useMemo(() => analyzeSentiment(answers), [answers]);
  const words = useMemo(() => topWords(answers, 6), [answers]);

  if (answers.length === 0) {
    return <p style={{ fontSize: 13, color: "#888", fontStyle: "italic" }}>No text responses submitted.</p>;
  }

  const sentimentData = [
    { label: "Positive", value: sentiment.positive, fill: SENTIMENT_COLORS.positive },
    { label: "Neutral", value: sentiment.neutral, fill: SENTIMENT_COLORS.neutral },
    { label: "Negative", value: sentiment.negative, fill: SENTIMENT_COLORS.negative },
  ];
  const maxWord = words[0]?.count ?? 1;

  return (
    <div>
      <SectionLabel>Sentiment (keyword-based)</SectionLabel>
      <div style={{ width: "100%", height: 190, background: "#fff", marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sentimentData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: "sans-serif" }} />
            <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12, fontFamily: "sans-serif" }} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {sentimentData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontSize: 10.5, color: "#7a7a7a", fontFamily: "sans-serif", marginTop: 4 }}>
        Based on {sentiment.total} response{sentiment.total === 1 ? "" : "s"} analysed against a built-in keyword list. Indicative only.
      </p>

      <div style={{ marginTop: 22 }}>
        <SectionLabel>Most frequent terms</SectionLabel>
        {words.length === 0 ? (
          <p style={{ fontSize: 13, color: "#888", fontStyle: "italic", marginTop: 8 }}>No notable terms detected.</p>
        ) : (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, fontFamily: "sans-serif" }}>
            {words.map((w) => (
              <div key={w.word} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <span style={{ width: 120, color: "#222", fontWeight: 600 }}>{w.word}</span>
                <div style={{ flex: 1, background: "#eee", height: 10, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(w.count / maxWord) * 100}%`, height: "100%", background: theme.accent }} />
                </div>
                <span style={{ width: 36, textAlign: "right", color: "#555" }}>{w.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6a6a6a", fontFamily: "sans-serif" }}>
      {children}
    </div>
  );
}

function MethodologyPage({ theme, totalResponses, page }: { theme: Theme; totalResponses: number; page: number }) {
  return (
    <Page theme={theme} page={page} kicker="Appendix A">
      <PageHeading theme={theme}>Methodology & notes</PageHeading>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: "#222" }}>
        This report was generated from {totalResponses} response{totalResponses === 1 ? "" : "s"} collected through the
        CampusVerify platform. Respondents were verified members of their campus community at the time of submission, and
        all identities are pseudonymised before results reach the survey owner.
      </p>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: "#222", marginTop: 14 }}>
        Percentages are calculated against the number of answers received for each individual question and rounded to one
        decimal place; totals may not sum to 100% due to rounding. Questions marked optional may show fewer answers than
        the total response count.
      </p>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: "#222", marginTop: 14 }}>
        Sentiment percentages for open-ended questions are computed locally using a built-in keyword list. They are
        indicative signals to guide interpretation, not a substitute for reading the verbatim text.
      </p>
    </Page>
  );
}

function RawResponsesAppendix({
  theme, page, sections,
}: {
  theme: Theme; page: number; sections: { question: Question; index: number; answers: string[] }[];
}) {
  return (
    <Page theme={theme} page={page} kicker="Appendix B">
      <PageHeading theme={theme}>Verbatim responses</PageHeading>
      <p style={{ fontSize: 12, color: "#666", fontFamily: "sans-serif", marginBottom: 18 }}>
        Anonymised, unedited responses for the questions opted in below.
      </p>

      {sections.map((s) => (
        <div key={s.question.id} style={{ marginBottom: 26 }}>
          <h3 style={{ fontSize: 16, margin: "4px 0 12px", fontWeight: 700 }}>Q{s.index}. {s.question.text}</h3>
          {s.answers.length === 0 ? (
            <p style={{ fontSize: 13, color: "#888", fontStyle: "italic" }}>No responses.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {s.answers.map((t, i) => (
                <div key={i} style={{ padding: 12, background: theme.soft, borderLeft: `2px solid ${theme.accent}`, fontSize: 12.5, lineHeight: 1.55, color: "#222" }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8a8a8a", marginBottom: 4, fontFamily: "sans-serif" }}>
                    Anonymous #{i + 1}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{t}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </Page>
  );
}
