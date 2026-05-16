import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, ArrowLeft, Users, FileText, BarChart3, TrendingUp, Activity, Hash } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";
import jsPDF from "jspdf";

type ChartType = "bar" | "pie" | "donut" | "line" | "area" | "radar" | "horizontal";
const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar" },
  { value: "horizontal", label: "Horizontal bar" },
  { value: "pie", label: "Pie" },
  { value: "donut", label: "Donut" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "radar", label: "Radar" },
];
const PALETTE = ["var(--primary)", "var(--highlight)", "var(--accent)", "#7c9a6b", "#c98a4b", "#4a6b52", "#b8c47a"];

type Question = { id: string; type: "text" | "choice" | "rating"; text: string; options?: string[] };
type Survey = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  questions: Question[];
  response_count: number;
  target_department: string | null;
  target_year: string | null;
};

export const Route = createFileRoute("/_authenticated/survey/$id")({
  component: SurveyPage,
});

function SurveyPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [responses, setResponses] = useState<any[] | null>(null);
  const [chartTypes, setChartTypes] = useState<Record<string, ChartType>>({});

  const isOwner = survey && user && survey.creator_id === user.id;

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("surveys").select("*").eq("id", id).maybeSingle();
      if (!s) { setLoading(false); return; }
      setSurvey(s as unknown as Survey);
      if (s.creator_id === user!.id) {
        const [{ data: r }, { data: viz }] = await Promise.all([
          supabase.from("survey_responses").select("*").eq("survey_id", id).order("created_at", { ascending: false }),
          supabase.from("survey_visualizations").select("question_id, chart_type").eq("survey_id", id),
        ]);
        setResponses(r ?? []);
        const map: Record<string, ChartType> = {};
        (viz ?? []).forEach((v: any) => { map[v.question_id] = v.chart_type as ChartType; });
        setChartTypes(map);
      } else {
        const { data: own } = await supabase.from("survey_responses").select("id").eq("survey_id", id).eq("respondent_id", user!.id).maybeSingle();
        setAlreadyAnswered(!!own);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const setChartType = async (questionId: string, type: ChartType) => {
    setChartTypes((m) => ({ ...m, [questionId]: type }));
    await supabase.from("survey_visualizations").upsert(
      { survey_id: id, question_id: questionId, chart_type: type },
      { onConflict: "survey_id,question_id" },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey) return;
    for (const q of survey.questions) {
      if (!answers[q.id] || answers[q.id].toString().trim() === "") {
        toast.error("Please answer all questions.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("survey_responses").insert({
        survey_id: survey.id,
        respondent_id: user!.id,
        answers: answers as any,
      });
      if (error) throw error;
      toast.success("Response submitted! +1 credit earned.");
      navigate({ to: "/feed" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const exportCSV = () => {
    if (!survey || !responses) return;
    const header = ["respondent_id", "submitted_at", ...survey.questions.map((q) => q.text.replace(/"/g, '""'))];
    const rows = responses.map((r) => [
      r.respondent_id,
      r.created_at,
      ...survey.questions.map((q) => String(r.answers?.[q.id] ?? "").replace(/"/g, '""')),
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${survey.title.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!survey || !responses) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = margin;
    const line = (txt: string, size = 11, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const wrapped = doc.splitTextToSize(txt, pageW - margin * 2);
      for (const ln of wrapped) {
        if (y > pageH - margin) { doc.addPage(); y = margin; }
        doc.text(ln, margin, y);
        y += size + 4;
      }
    };
    line(survey.title, 18, true);
    line(`${responses.length} responses · exported ${new Date().toLocaleString()}`, 9);
    y += 8;
    survey.questions.forEach((q, qi) => {
      y += 6;
      line(`Q${qi + 1}. ${q.text}`, 12, true);
      if (q.type === "choice" || q.type === "rating") {
        const counts = chartData(q);
        counts.forEach((c) => line(`  • ${c.label}: ${c.count}`, 10));
      } else {
        responses.forEach((r, ri) => line(`  ${ri + 1}. ${String(r.answers?.[q.id] ?? "—")}`, 10));
      }
    });
    doc.save(`${survey.title.replace(/\s+/g, "_")}.pdf`);
  };

  const chartData = (q: Question) => {
    if (!responses) return [];
    const labels = q.type === "rating" ? ["1", "2", "3", "4", "5"] : (q.options ?? []);
    return labels.map((label) => ({
      label,
      count: responses.filter((r) => String(r.answers?.[q.id] ?? "") === label).length,
    }));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!survey) return <p className="text-sm text-muted-foreground">Survey not found.</p>;

  return (
    <div>
      <Link to="/feed" className="mb-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to feed
      </Link>
      <div className="rounded-3xl border border-foreground/15 bg-card p-7 shadow-paper">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Survey</p>
        <h1 className="mt-2 font-serif text-4xl leading-[0.95] sm:text-5xl">{survey.title}</h1>
        {survey.description && <p className="mt-3 max-w-2xl text-base text-muted-foreground">{survey.description}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
          <span className="inline-flex items-center gap-1 rounded-full bg-highlight px-3 py-1 text-highlight-foreground"><Users className="h-3 w-3" />{survey.response_count} responses</span>
          {survey.target_department && <span className="rounded-full bg-accent px-3 py-1 text-accent-foreground">{survey.target_department}</span>}
          {survey.target_year && <span className="rounded-full bg-accent px-3 py-1 text-accent-foreground">{survey.target_year}</span>}
        </div>
      </div>

      {isOwner ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-3xl">Results</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-full border-foreground/30" onClick={exportCSV} disabled={!responses?.length}>
                <Download className="mr-1 h-4 w-4" /> CSV
              </Button>
              <Button size="sm" variant="outline" className="rounded-full border-foreground/30" onClick={exportPDF} disabled={!responses?.length}>
                <FileText className="mr-1 h-4 w-4" /> PDF
              </Button>
            </div>
          </div>
          {responses && responses.length > 0 ? (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {survey.questions.map((q, qi) => {
                  const isChartable = q.type === "choice" || q.type === "rating";
                  if (!isChartable) return null;
                  const data = chartData(q);
                  return (
                    <div key={q.id} className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        <BarChart3 className="h-3 w-3" /> Q{qi + 1}
                      </div>
                      <p className="mt-1 font-serif text-xl leading-tight">{q.text}</p>
                      <div className="mt-3 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip cursor={{ fill: "var(--accent)", opacity: 0.3 }} />
                            <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>

              <h3 className="mt-8 font-serif text-2xl">Individual responses</h3>
              <div className="mt-3 space-y-3">
                {responses.map((r, i) => (
                  <div key={r.id} className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
                    <p className="text-xs text-muted-foreground">Response #{i + 1} · {new Date(r.created_at).toLocaleString()}</p>
                    <div className="mt-2 space-y-2">
                      {survey.questions.map((q) => (
                        <div key={q.id}>
                          <p className="text-xs font-semibold text-muted-foreground">{q.text}</p>
                          <p className="text-sm">{String(r.answers?.[q.id] ?? "—")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No responses yet.</p>
          )}
        </div>
      ) : alreadyAnswered ? (
        <div className="mt-6 rounded-3xl border border-dashed border-foreground/30 bg-card p-8 text-center shadow-paper">
          <p className="font-serif text-3xl text-primary">Already answered.</p>
          <p className="mt-1 text-sm text-muted-foreground">Thanks for adding your voice — head back to the feed for more.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          {survey.questions.map((q, i) => (
            <div key={q.id} className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
              <Label className="font-serif text-2xl leading-tight">{i + 1}. {q.text}</Label>
              <div className="mt-2">
                {q.type === "text" && (
                  <Textarea value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
                )}
                {q.type === "choice" && (
                  <div className="space-y-1.5">
                    {q.options?.map((opt, oi) => (
                      <label key={oi} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-secondary">
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                          className="accent-primary"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
                {q.type === "rating" && (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(n) }))}
                        className={`h-10 w-10 rounded-full border text-sm font-semibold ${
                          answers[q.id] === String(n) ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <Button type="submit" size="lg" className="h-14 w-full rounded-full bg-primary text-base" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit & earn 1 credit →"}
          </Button>
        </form>
      )}
    </div>
  );
}
