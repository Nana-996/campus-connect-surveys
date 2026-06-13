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
import { toast } from "sonner";
import { ArrowLeft, ArrowUp, ArrowDown, FileDown, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

type Question = { id: string; type: "text" | "choice" | "rating"; text: string; options?: string[] };
type Survey = {
  id: string; creator_id: string; title: string; description: string;
  questions: Question[]; response_count: number; created_at: string;
};
type ResponseRow = {
  id: string; respondent_id: string;
  answers: Record<string, string>; created_at: string;
};

const PALETTE = ["#4a6b52", "#7c9a6b", "#c98a4b", "#b8c47a", "#8e7a5a", "#6b8e9e", "#a47b4c"];

type SectionConfig = {
  qid: string;
  included: boolean;
  comment: string;
  showRawText: boolean; // for text questions: full vs summarized
};

export const Route = createFileRoute("/_authenticated/survey/$id/report")({
  component: ReportBuilderPage,
});

function aggregate(q: Question, rows: ResponseRow[]) {
  const labels = q.type === "rating" ? ["1", "2", "3", "4", "5"] : (q.options ?? []);
  return labels.map((label) => ({
    label,
    count: rows.filter((r) => String(r.answers?.[q.id] ?? "") === label).length,
  }));
}

function ReportBuilderPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const fetchOwnerResults = useServerFn(getOwnerSurveyResults);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);

  // Editable report config
  const [reportTitle, setReportTitle] = useState("");
  const [summary, setSummary] = useState("");
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
        setReportTitle(`${s.title} — Report`);
        setSummary(autoSummary(s, rs));
        setSections(s.questions.map((q) => ({
          qid: q.id, included: true, comment: "", showRawText: true,
        })));
      } catch (err: any) {
        toast.error(err?.message ?? "Couldn't load report data.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id, user, fetchOwnerResults]);

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

  const reportRef = useRef<HTMLDivElement | null>(null);

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    const toastId = toast.loading("Generating PDF…");
    try {
      // Give recharts a tick to finish layout
      await new Promise((r) => setTimeout(r, 250));
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const pageEls = Array.from(
        reportRef.current.querySelectorAll<HTMLElement>("[data-report-page]")
      );
      if (pageEls.length === 0) throw new Error("Nothing to export");

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();

      for (let i = 0; i < pageEls.length; i++) {
        const canvas = await html2canvas(pageEls[i], {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
        });
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) doc.addPage();
        // Fit image to A4 preserving aspect
        const ratio = canvas.height / canvas.width;
        const drawW = W;
        const drawH = drawW * ratio;
        if (drawH <= H) {
          doc.addImage(imgData, "PNG", 0, 0, drawW, drawH);
        } else {
          // Page taller than A4: scale down to fit height
          const scaledH = H;
          const scaledW = scaledH / ratio;
          const x = (W - scaledW) / 2;
          doc.addImage(imgData, "PNG", x, 0, scaledW, scaledH);
        }
      }

      doc.save(`${(survey?.title ?? "survey").replace(/\s+/g, "_")}_report.pdf`);
      toast.success("Report exported.", { id: toastId });
    } catch (err: any) {
      console.error("[report] export failed", err);
      toast.error(err?.message ?? "Couldn't export PDF.", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading report builder…</p>;
  if (!survey) return <p className="text-sm text-muted-foreground">Survey not found.</p>;

  const includedSections = sections.filter((s) => s.included);

  return (
    <div>
      <Link
        to="/survey/$id/analyze"
        params={{ id }}
        className="mb-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to analytics
      </Link>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Editor sidebar */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Report Builder</p>
            <h2 className="mt-1 font-serif text-2xl leading-tight">Customize your report</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Edit the title, intro, and per-question notes. Toggle sections in or out. Preview updates live.
            </p>
            <Button
              onClick={exportPDF}
              disabled={exporting || includedSections.length === 0}
              className="mt-4 w-full rounded-full"
            >
              {exporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileDown className="mr-1 h-4 w-4" />}
              {exporting ? "Exporting…" : "Export PDF"}
            </Button>
          </div>

          <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Report title</Label>
            <Input
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="mt-1.5"
            />
            <Label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Executive summary
            </Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={6}
              className="mt-1.5 text-sm"
            />
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
                      <Checkbox
                        checked={s.included}
                        onCheckedChange={(v) => updateSection(s.qid, { included: !!v })}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-medium">Q{idx + 1}. {q.text}</p>
                        <div className="mt-2 flex items-center gap-1">
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => moveSection(idx, -1)}
                            disabled={idx === 0}
                            className="h-6 w-6 rounded-full p-0"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => moveSection(idx, 1)}
                            disabled={idx === sections.length - 1}
                            className="h-6 w-6 rounded-full p-0"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {s.included && (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          placeholder="Optional comment or interpretation…"
                          value={s.comment}
                          onChange={(e) => updateSection(s.qid, { comment: e.target.value })}
                          rows={2}
                          className="text-xs"
                        />
                        {q.type === "text" && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              {s.showRawText ? "Show full responses" : "Summarize (first 5 only)"}
                            </span>
                            <Switch
                              checked={s.showRawText}
                              onCheckedChange={(v) => updateSection(s.qid, { showRawText: v })}
                            />
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

        {/* Live preview */}
        <main className="overflow-x-auto">
          <div className="mx-auto" style={{ width: 794 }}>
            <div ref={reportRef} className="space-y-6">
              <CoverPage
                title={reportTitle}
                description={survey.description}
                summary={summary}
                totalResponses={responses.length}
                generatedAt={new Date()}
              />
              {includedSections.map((s, idx) => {
                const q = qMap[s.qid];
                if (!q) return null;
                return (
                  <QuestionReportPage
                    key={s.qid}
                    index={idx + 1}
                    question={q}
                    responses={responses}
                    comment={s.comment}
                    showRawText={s.showRawText}
                  />
                );
              })}
              <ClosingPage totalResponses={responses.length} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function autoSummary(s: Survey, rs: ResponseRow[]) {
  const n = rs.length;
  const qCount = s.questions.length;
  const choiceQs = s.questions.filter((q) => q.type === "choice" || q.type === "rating").length;
  const textQs = qCount - choiceQs;
  return [
    `This report presents the results of "${s.title}", a survey conducted via CampusVerify.`,
    `A total of ${n} response${n === 1 ? "" : "s"} were collected across ${qCount} question${qCount === 1 ? "" : "s"} (${choiceQs} closed-ended, ${textQs} open-ended).`,
    `The following sections summarize aggregate findings for each question, along with selected qualitative responses where applicable.`,
  ].join(" ");
}

// ============= Page components =============
// Each [data-report-page] becomes one A4 page in the PDF.

const PAGE_STYLE: React.CSSProperties = {
  width: 794,             // ~ A4 width @ 96dpi
  minHeight: 1123,        // ~ A4 height @ 96dpi
  padding: "64px 72px",
  backgroundColor: "#ffffff",
  color: "#1a1a1a",
  fontFamily: "'Georgia', 'Times New Roman', serif",
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  boxSizing: "border-box",
};

function PageFooter({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 32, paddingTop: 12, borderTop: "1px solid #e5e5e5",
        fontSize: 10, color: "#777", fontFamily: "sans-serif",
        display: "flex", justifyContent: "space-between",
      }}
    >
      {children}
    </div>
  );
}

function CoverPage({
  title, description, summary, totalResponses, generatedAt,
}: {
  title: string; description: string; summary: string;
  totalResponses: number; generatedAt: Date;
}) {
  return (
    <div data-report-page style={PAGE_STYLE}>
      <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "#888", fontFamily: "sans-serif" }}>
        CampusVerify · Survey Report
      </div>
      <div style={{ marginTop: 120 }}>
        <h1 style={{ fontSize: 42, lineHeight: 1.1, margin: 0, fontWeight: 700 }}>{title}</h1>
        {description && (
          <p style={{ marginTop: 16, fontSize: 16, color: "#444", lineHeight: 1.5 }}>{description}</p>
        )}
      </div>

      <div style={{ marginTop: 64 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", fontFamily: "sans-serif", marginBottom: 8 }}>
          Executive summary
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#222", whiteSpace: "pre-wrap" }}>{summary}</p>
      </div>

      <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, fontFamily: "sans-serif" }}>
        <Meta label="Total responses" value={String(totalResponses)} />
        <Meta label="Date generated" value={generatedAt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} />
      </div>

      <PageFooter>
        <span>CampusVerify Report</span>
        <span>Page 1</span>
      </PageFooter>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>{value}</div>
    </div>
  );
}

function QuestionReportPage({
  index, question, responses, comment, showRawText,
}: {
  index: number; question: Question; responses: ResponseRow[];
  comment: string; showRawText: boolean;
}) {
  const answered = responses.filter((r) => String(r.answers?.[question.id] ?? "").trim() !== "").length;

  return (
    <div data-report-page style={PAGE_STYLE}>
      <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", fontFamily: "sans-serif" }}>
        Question {index} · {labelForType(question.type)}
      </div>
      <h2 style={{ fontSize: 24, lineHeight: 1.25, margin: "8px 0 4px", fontWeight: 700 }}>
        Q{index}. {question.text}
      </h2>
      <div style={{ fontSize: 12, color: "#666", fontFamily: "sans-serif" }}>
        {answered} response{answered === 1 ? "" : "s"}
      </div>

      <div style={{ marginTop: 24 }}>
        {question.type === "text"
          ? <TextResponsesBlock question={question} responses={responses} showAll={showRawText} />
          : <ChoiceBlock question={question} responses={responses} />}
      </div>

      {comment && (
        <div style={{ marginTop: 28, padding: 16, background: "#f7f5f0", borderLeft: "3px solid #4a6b52", fontFamily: "sans-serif" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#666", marginBottom: 6 }}>
            Commentary
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#222", margin: 0, whiteSpace: "pre-wrap" }}>{comment}</p>
        </div>
      )}

      <PageFooter>
        <span>CampusVerify Report</span>
        <span>Q{index}</span>
      </PageFooter>
    </div>
  );
}

function labelForType(t: Question["type"]) {
  return t === "text" ? "Open-ended" : t === "rating" ? "Rating" : "Multiple choice";
}

function ChoiceBlock({ question, responses }: { question: Question; responses: ResponseRow[] }) {
  const data = aggregate(question, responses);
  const total = data.reduce((s, x) => s + x.count, 0) || 1;
  const usePie = question.type === "choice" && (question.options?.length ?? 0) <= 6;

  return (
    <div>
      <div style={{ width: "100%", height: 260, background: "#fff" }}>
        <ResponsiveContainer width="100%" height="100%">
          {usePie ? (
            <PieChart>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: "sans-serif" }} />
              <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
            </PieChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: "sans-serif" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fontFamily: "sans-serif" }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4a6b52" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <table style={{ width: "100%", marginTop: 20, borderCollapse: "collapse", fontFamily: "sans-serif", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #1a1a1a", textAlign: "left" }}>
            <th style={{ padding: "8px 4px" }}>Option</th>
            <th style={{ padding: "8px 4px", textAlign: "right" }}>Count</th>
            <th style={{ padding: "8px 4px", textAlign: "right" }}>Percent</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "8px 4px" }}>{d.label}</td>
              <td style={{ padding: "8px 4px", textAlign: "right" }}>{d.count}</td>
              <td style={{ padding: "8px 4px", textAlign: "right" }}>{((d.count / total) * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TextResponsesBlock({
  question, responses, showAll,
}: { question: Question; responses: ResponseRow[]; showAll: boolean }) {
  const all = responses
    .map((r) => String(r.answers?.[question.id] ?? "").trim())
    .filter((t) => t.length > 0);
  const shown = showAll ? all : all.slice(0, 5);

  if (all.length === 0) {
    return <p style={{ fontSize: 13, color: "#888", fontStyle: "italic" }}>No text responses submitted.</p>;
  }

  return (
    <div>
      {!showAll && all.length > shown.length && (
        <p style={{ fontSize: 12, color: "#666", marginBottom: 12, fontFamily: "sans-serif" }}>
          Showing first {shown.length} of {all.length} responses.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {shown.map((t, i) => (
          <div key={i} style={{
            padding: 14, background: "#fafaf7", borderLeft: "2px solid #c98a4b",
            fontSize: 13, lineHeight: 1.6, color: "#222",
          }}>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888", marginBottom: 6, fontFamily: "sans-serif" }}>
              Anonymous #{i + 1}
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClosingPage({ totalResponses }: { totalResponses: number }) {
  return (
    <div data-report-page style={PAGE_STYLE}>
      <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", fontFamily: "sans-serif" }}>
        Appendix
      </div>
      <h2 style={{ fontSize: 24, lineHeight: 1.25, margin: "8px 0 16px", fontWeight: 700 }}>
        Methodology & Notes
      </h2>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: "#222" }}>
        This report was auto-generated from {totalResponses} response{totalResponses === 1 ? "" : "s"} collected through
        the CampusVerify platform. Respondents were verified members of their campus community at the time of submission.
        All open-ended responses are presented anonymously. Percentages are rounded to one decimal place; totals may not
        sum to 100% due to rounding.
      </p>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: "#222", marginTop: 16 }}>
        For questions about the methodology or the original instrument, please contact the survey owner directly through
        the CampusVerify platform.
      </p>

      <PageFooter>
        <span>CampusVerify Report</span>
        <span>End of report</span>
      </PageFooter>
    </div>
  );
}
