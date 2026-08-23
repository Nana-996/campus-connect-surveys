import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { safeErrorMessage } from "@/lib/safe-error";
import { ShareMessageEditor } from "@/components/ShareMessageEditor";

import { Download, ArrowLeft, Users, FileText, BarChart3, TrendingUp, Activity, Hash, Lock, ShieldCheck, Check, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SurveyVerifyModal } from "@/components/SurveyVerifyModal";
import { AppHeader } from "@/components/AppHeader";
import { getSurveyPublic, getSurveyForRespondent } from "@/lib/survey-public.functions";
import { getOwnerSurveyResults } from "@/lib/survey-owner.functions";
import { cacheSurvey, getCachedSurvey, enqueueResponse } from "@/lib/offline-store";
import { syncQueuedResponses } from "@/lib/offline-sync";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";


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

type Question = { id: string; type: "text" | "choice" | "rating"; text: string; options?: string[]; required?: boolean };
type Survey = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  questions: Question[];
  response_count: number;
  response_goal: number;
  expires_at: string;
  target_department: string | null;
  target_year: string | null;
};

export const Route = createFileRoute("/survey/$id")({
  component: SurveyPage,
  loader: async ({ params }) => {
    try {
      const res = await getSurveyPublic({ data: { id: params.id } });
      return { surveyMeta: res?.survey ?? null };
    } catch {
      return { surveyMeta: null };
    }
  },
  head: ({ params, loaderData }) => {
    const s = loaderData?.surveyMeta;
    const rawTitle = s?.title?.trim();
    const truncTitle = rawTitle && rawTitle.length > 45 ? `${rawTitle.slice(0, 42)}…` : rawTitle;
    const title = truncTitle ? `${truncTitle} — CampusVerify` : "Take this survey — CampusVerify";
    const rawDesc = s?.description?.trim();
    const desc = rawDesc
      ? (rawDesc.length > 155 ? `${rawDesc.slice(0, 152)}…` : rawDesc)
      : "Answer a verified CampusVerify survey to earn credits. Log in or create a free account to participate.";
    const url = `https://campus-verify.live/survey/${params.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});

function SurveyPage() {
  const { id } = Route.useParams();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fetchPublic = useServerFn(getSurveyPublic);
  const fetchAuthed = useServerFn(getSurveyForRespondent);
  const fetchOwnerResults = useServerFn(getOwnerSurveyResults);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const draftKey = `cv:answers:${id}`;
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(draftKey) || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(draftKey, JSON.stringify(answers)); } catch {}
  }, [answers, draftKey]);
  // Save immediately on refresh/close/tab-hide so nothing is lost mid-answer.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const flush = () => { try { localStorage.setItem(draftKey, JSON.stringify(answersRef.current)); } catch {} };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [draftKey]);
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  const restoredAnswers = useRef(Object.keys(answers).length > 0);
  useEffect(() => {
    if (!restoredAnswers.current) return;
    restoredAnswers.current = false;
    toast.info("We restored your unfinished answers.");
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt] = useState<number>(() => Date.now());
  const [responses, setResponses] = useState<any[] | null>(null);
  const [chartTypes, setChartTypes] = useState<Record<string, ChartType>>({});
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<null | {
    delta: number;
    reason: string;
    newBalance: number;
  }>(null);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/survey/${id}` : `/survey/${id}`;

  const handleDelete = async () => {
    if (!survey) return;
    setDeleting(true);
    const { error } = await supabase.from("surveys").delete().eq("id", survey.id);
    setDeleting(false);
    setDeleteOpen(false);
    if (error) {
      toast.error(safeErrorMessage(error, "Failed to delete survey."));
      return;
    }
    toast.success("Survey deleted.");
    navigate({ to: "/my-surveys" });
  };

  const isOwner = !!(survey && user && survey.creator_id === user.id);

  // Load survey: authenticated users get full questions via RLS-scoped fetch;
  // anonymous viewers only see metadata (no questions) for the verify card.
  // When offline, fall back to a previously cached copy so users can re-open
  // and fill out questions without a connection.
  useEffect(() => {
    let active = true;
    (async () => {
      const useCache = async () => {
        try {
          const cached = await getCachedSurvey(id);
          if (cached && active) {
            setSurvey(cached as unknown as Survey);
            setOwnerName(null);
          }
        } catch {}
      };
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        await useCache();
        if (active) setLoading(false);
        return;
      }
      try {
        const res = user
          ? await fetchAuthed({ data: { id } })
          : await fetchPublic({ data: { id } });
        if (!active) return;
        if (!res.survey) { await useCache(); setLoading(false); return; }
        const surveyData = { ...(res.survey as any), questions: (res.survey as any).questions ?? [] };
        setSurvey(surveyData as Survey);
        setOwnerName(res.ownerName);
        // Persist for offline re-open (only if questions are present).
        if (Array.isArray(surveyData.questions) && surveyData.questions.length > 0) {
          void cacheSurvey({
            id: surveyData.id,
            creator_id: surveyData.creator_id,
            title: surveyData.title,
            description: surveyData.description ?? "",
            questions: surveyData.questions,
            response_count: surveyData.response_count ?? 0,
            response_goal: surveyData.response_goal ?? 0,
            expires_at: surveyData.expires_at,
            target_department: surveyData.target_department ?? null,
            target_year: surveyData.target_year ?? null,
          });
        }
      } catch (e) {
        console.warn("Survey load failed, trying offline cache", e);
        await useCache();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // Unauthenticated visitors can read and answer the questions; we only ask
  // them to sign up at submit time (or resume a pending submit after signup).
  useEffect(() => {
    if (user) setVerifyOpen(false);
  }, [user?.id]);


  // Load creator-only or respondent-state data once signed in.
  useEffect(() => {
    if (!user || !survey) return;
    let active = true;
    (async () => {
      if (survey.creator_id === user.id) {
        try {
          const ownerData = await fetchOwnerResults({ data: { surveyId: id } });
          if (!active) return;
          setResponses(ownerData.responses ?? []);
          const map: Record<string, ChartType> = {};
          (ownerData.visualizations ?? []).forEach((v: any) => { map[v.question_id] = v.chart_type as ChartType; });
          setChartTypes(map);
        } catch (err: any) {
          console.error("[survey owner results] load failed", err);
          toast.error(err?.message ?? "Couldn't load responses. Try refreshing.");
        }
      } else {
        const { data: own } = await supabase.from("survey_responses").select("id").eq("survey_id", id).eq("respondent_id", user.id).maybeSingle();
        if (!active) return;
        setAlreadyAnswered(!!own);
        // Record server-side start time for credit-quality gating.
        if (!own) {
          await supabase.rpc("begin_survey_response", { _survey_id: id }).then(({ error }) => {
            if (error) console.warn("begin_survey_response failed", error);
          });
        }
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id, survey?.id]);

  const setChartType = async (questionId: string, type: ChartType) => {
    setChartTypes((m) => ({ ...m, [questionId]: type }));
    await supabase.from("survey_visualizations").upsert(
      { survey_id: id, question_id: questionId, chart_type: type },
      { onConflict: "survey_id,question_id" },
    );
  };

  const validateAnswers = () => {
    if (!survey) return false;
    if (new Date(survey.expires_at) <= new Date()) { toast.error("This survey has closed."); return false; }
    if (survey.response_count >= survey.response_goal) { toast.error("This survey has reached its response goal."); return false; }
    for (const q of survey.questions) {
      const isRequired = q.required ?? true;
      if (isRequired && (!answers[q.id] || answers[q.id].toString().trim() === "")) {
        toast.error("Please answer all required questions."); return false;
      }
    }
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey) return;
    if (!validateAnswers()) return;
    if (!user) {
      // Answers stay in the local draft; we submit them right after signup.
      try { localStorage.setItem(pendingKey, "1"); } catch {}
      setVerifyOpen(true);
      return;
    }
    const duration = Date.now() - startedAt;
    if (duration < 15000) {
      toast.error(`Take your time — at least 15 seconds for quality credit (${Math.floor(duration/1000)}s so far).`);
      return;
    }
    await doSubmit(duration);
  };

  const doSubmit = async (duration: number) => {
    if (!survey || !user) return;
    setSubmitting(true);
    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

    try {
      if (isOffline) {
        await enqueueResponse({
          survey_id: survey.id,
          respondent_id: user.id,
          answers,
          duration_ms: duration,
        });
        try { localStorage.removeItem(draftKey); } catch {}
        setResult({ delta: 0, reason: "queued_offline", newBalance: 0 });
        toast.success("Saved offline — we'll sync it when you're back online.");
        return;
      }
      const { error } = await supabase.from("survey_responses").insert({
        survey_id: survey.id,
        respondent_id: user.id,
        answers: answers as any,
        duration_ms: duration,
      });
      if (error) throw error;
      try { localStorage.removeItem(draftKey); } catch {}

      // Look up what the response trigger awarded so we can show a clear breakdown
      const [{ data: ledger }, { data: prof }] = await Promise.all([
        supabase
          .from("credit_ledger")
          .select("delta, reason")
          .eq("user_id", user.id)
          .eq("survey_id", survey.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("profiles").select("earned_credits").eq("id", user.id).maybeSingle(),
      ]);
      await refreshProfile();

      const delta = ledger?.delta ?? 0;
      const reason = ledger?.reason ?? "response";
      const newBalance = prof?.earned_credits ?? 0;
      setResult({ delta, reason, newBalance });
      if (delta > 0) {
        toast.success(`+${delta} credit${delta === 1 ? "" : "s"} earned!`);
      }
      // Opportunistically flush any other queued offline responses.
      void syncQueuedResponses();
    } catch (err: any) {
      // Network-style failure: save offline instead of losing the answers.
      const msg = String(err?.message ?? err ?? "").toLowerCase();
      const looksLikeNetwork = msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch") || msg.includes("load failed");
      if (looksLikeNetwork) {
        try {
          await enqueueResponse({
            survey_id: survey.id,
            respondent_id: user.id,
            answers,
            duration_ms: duration,
          });
          try { localStorage.removeItem(draftKey); } catch {}
          setResult({ delta: 0, reason: "queued_offline", newBalance: 0 });
          toast.success("Connection dropped — saved offline. We'll sync it for you.");
          return;
        } catch {}
      }
      toast.error(err.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  // Someone answered before signing up: submit their saved answers as soon as
  // their account exists (works even after an email-confirmation round trip).
  const resumed = useRef(false);
  useEffect(() => {
    if (!user || !survey || alreadyAnswered || isOwner || resumed.current) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(pendingKey) !== "1") return;
    if (!survey.questions?.length) return;
    if (!Object.keys(answersRef.current).length) return;
    resumed.current = true;
    try { localStorage.removeItem(pendingKey); } catch {}
    void (async () => {
      if (!validateAnswers()) return;
      await doSubmit(Math.max(Date.now() - startedAt, 15000));
    })();
  }, [user?.id, survey?.id, alreadyAnswered, isOwner]);


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
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!survey || !responses) return;
    const { default: jsPDF } = await import("jspdf");
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

  const timelineData = () => {
    if (!responses) return [];
    const buckets: Record<string, number> = {};
    responses.forEach((r) => {
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      buckets[d] = (buckets[d] ?? 0) + 1;
    });
    return Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date: date.slice(5), count }));
  };

  const completionRate = () => {
    if (!responses || !survey || responses.length === 0) return 0;
    let answered = 0, total = 0;
    responses.forEach((r) => {
      survey.questions.forEach((q) => {
        total += 1;
        if (r.answers?.[q.id] != null && String(r.answers[q.id]).trim() !== "") answered += 1;
      });
    });
    return total ? Math.round((answered / total) * 100) : 0;
  };

  const avgRating = (q: Question) => {
    if (!responses || q.type !== "rating") return null;
    const nums = responses.map((r) => Number(r.answers?.[q.id])).filter((n) => !isNaN(n) && n > 0);
    if (!nums.length) return null;
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
  };

  const renderChart = (q: Question, type: ChartType) => {
    const data = chartData(q);
    const common = { data, margin: { top: 8, right: 8, left: -16, bottom: 0 } };
    switch (type) {
      case "horizontal":
        return (
          <BarChart {...common} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={80} />
            <Tooltip cursor={{ fill: "var(--accent)", opacity: 0.3 }} />
            <Bar dataKey="count" fill="var(--primary)" radius={[0, 6, 6, 0]} />
          </BarChart>
        );
      case "pie":
      case "donut":
        return (
          <PieChart>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Pie data={data} dataKey="count" nameKey="label" outerRadius={70} innerRadius={type === "donut" ? 40 : 0} label={{ fontSize: 10 }}>
              {data.map((_, i) => (<Cell key={i} fill={PALETTE[i % PALETTE.length]} />))}
            </Pie>
          </PieChart>
        );
      case "line":
        return (
          <LineChart {...common}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        );
      case "area":
        return (
          <AreaChart {...common}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} />
          </AreaChart>
        );
      case "radar":
        return (
          <RadarChart data={data} outerRadius={70}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fontSize: 10 }} />
            <Radar dataKey="count" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.4} />
            <Tooltip />
          </RadarChart>
        );
      default:
        return (
          <BarChart {...common}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ fill: "var(--accent)", opacity: 0.3 }} />
            <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        );
    }
  };

  const content = (() => {
    if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;
    if (!survey) return <p className="text-sm text-muted-foreground">Survey not found.</p>;
    if (result) return <SubmissionResult result={result} onClose={() => navigate({ to: "/feed" })} />;
    return (
      <div>
        {user ? (
          <Link to="/feed" className="mb-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to feed
          </Link>
        ) : null}
        <div className="rounded-3xl border border-foreground/15 bg-card p-7 shadow-paper">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Survey</p>
          <h1 className="mt-2 font-serif text-4xl leading-[0.95] sm:text-5xl">{survey.title}</h1>
          {survey.description && <p className="mt-3 max-w-2xl text-base text-muted-foreground">{survey.description}</p>}
          {ownerName && <p className="mt-3 text-xs text-muted-foreground">By <span className="font-semibold text-foreground">{ownerName}</span></p>}
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
            <span className="inline-flex items-center gap-1 rounded-full bg-highlight px-3 py-1 text-highlight-foreground"><Users className="h-3 w-3" />{survey.response_count} / {survey.response_goal} responses</span>
            <span className="rounded-full bg-card border border-foreground/15 px-3 py-1 text-muted-foreground">
              {new Date(survey.expires_at) <= new Date() ? "Closed" : `Closes ${new Date(survey.expires_at).toLocaleDateString()}`}
            </span>
            {survey.target_department && <span className="rounded-full bg-accent px-3 py-1 text-accent-foreground">{survey.target_department}</span>}
            {survey.target_year && <span className="rounded-full bg-accent px-3 py-1 text-accent-foreground">{survey.target_year}</span>}
          </div>
          <div className="mt-6 rounded-2xl border border-foreground/15 bg-background/60 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Share this survey</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Send the link to friends, classmates or your group chat — the explainer travels with it, and you can rewrite it in your own words.
              </p>
            </div>
            <ShareMessageEditor
              className="mt-3"
              surveyId={id}
              title={survey.title}
              description={survey.description}
              questionCount={survey.questions?.length ?? 0}
              url={shareUrl}
            />
          </div>
        </div>

        {!user ? (
          <div className="mt-6 rounded-3xl border border-dashed border-foreground/30 bg-card p-8 text-center shadow-paper">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <p className="mt-3 font-serif text-3xl">Verify to view the questions</p>
            <p className="mt-2 text-sm text-muted-foreground">Create a quick account or log in to answer this survey and earn credits.</p>
            <Button onClick={() => setVerifyOpen(true)} className="mt-5 h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
              <ShieldCheck className="mr-2 h-4 w-4" /> Verify to continue
            </Button>
          </div>
        ) : isOwner ? (
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
                <Button size="sm" variant="outline" onClick={() => setDeleteOpen(true)} className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
            {responses && responses.length > 0 ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground"><Hash className="h-3 w-3" /> Total</div>
                    <p className="mt-1 font-serif text-4xl">{responses.length}</p>
                    <p className="text-xs text-muted-foreground">responses collected</p>
                  </div>
                  <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground"><Activity className="h-3 w-3" /> Completion</div>
                    <p className="mt-1 font-serif text-4xl">{completionRate()}%</p>
                    <p className="text-xs text-muted-foreground">questions answered</p>
                  </div>
                  <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground"><TrendingUp className="h-3 w-3" /> Latest</div>
                    <p className="mt-1 font-serif text-lg leading-tight">{new Date(responses[0].created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(responses[0].created_at).toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground"><TrendingUp className="h-3 w-3" /> Responses over time</div>
                  <div className="mt-3 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData()} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {survey.questions.map((q, qi) => {
                    const isChartable = q.type === "choice" || q.type === "rating";
                    if (!isChartable) return null;
                    const type = chartTypes[q.id] ?? "bar";
                    const avg = avgRating(q);
                    return (
                      <div key={q.id} className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                              <BarChart3 className="h-3 w-3" /> Q{qi + 1}
                            </div>
                            <p className="mt-1 font-serif text-xl leading-tight">{q.text}</p>
                            {avg && <p className="mt-1 text-xs text-muted-foreground">Average rating: <span className="font-semibold text-foreground">{avg}</span> / 5</p>}
                          </div>
                          <select
                            aria-label="Select chart type"
                            value={type}
                            onChange={(e) => setChartType(q.id, e.target.value as ChartType)}
                            className="rounded-full border border-foreground/20 bg-background px-2 py-1 text-[11px] font-semibold uppercase tracking-wider"
                          >
                            {CHART_TYPES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                          </select>
                        </div>
                        <div className="mt-3 h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            {renderChart(q, type)}
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
            {survey.questions.map((q, i) => {
              const isRequired = q.required ?? true;
              return (
              <div key={q.id} className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
                <Label className="font-serif text-2xl leading-tight">
                  {i + 1}. {q.text}
                  {isRequired
                    ? <span className="ml-1 text-destructive" aria-label="required">*</span>
                    : <span className="ml-2 align-middle rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Optional</span>}
                </Label>
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
              );
            })}
            <Button type="submit" size="lg" className="h-14 w-full rounded-full bg-primary text-base" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit & earn 1 credit →"}
            </Button>
          </form>
        )}

        <SurveyVerifyModal
          open={verifyOpen}
          onClose={() => setVerifyOpen(false)}
          onVerified={() => setVerifyOpen(false)}
          surveyTitle={survey?.title}
        />

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete survey?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove <strong>{survey?.title}</strong> and all its responses. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  })();

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      {user ? (
        <AppHeader />
      ) : (
        <header className="border-b border-foreground/10 bg-background">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <Link to="/" className="font-serif text-xl">CampusVerify</Link>
            <Link to="/auth" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">Log in</Link>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
        {content}
      </main>
    </div>
  );
}

function SubmissionResult({
  result,
  onClose,
}: {
  result: { delta: number; reason: string; newBalance: number };
  onClose: () => void;
}) {
  const earned = result.delta > 0;
  const reasonLabel = (() => {
    switch (result.reason) {
      case "response":
      case "response_with_bonus":
        return earned ? "Quality response confirmed" : "Response recorded";
      case "response_no_credit_low_quality":
        return "Response too quick or incomplete — no credit awarded this time";
      case "cap_reached":
        return "You've hit today's earning cap (3/day, 10/week) — credit not awarded";
      default:
        return "Response recorded";
    }
  })();

  return (
    <div className="mx-auto max-w-xl">
      <div className={`rounded-3xl border-2 p-8 shadow-paper text-center ${
        earned ? "border-primary bg-primary/10" : "border-foreground/20 bg-card"
      }`}>
        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
          earned ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
        }`}>
          {earned ? (
            <span className="font-serif text-3xl leading-none">+{result.delta}</span>
          ) : (
            <Check className="h-8 w-8" />
          )}
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          {earned ? "Credits earned" : "Submitted"}
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-[0.95]">
          {earned ? <>You earned <em className="text-primary">{result.delta} credit{result.delta === 1 ? "" : "s"}</em>.</> : "Thanks for responding."}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{reasonLabel}</p>

        <div className="mt-6 rounded-2xl border border-foreground/15 bg-background/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your wallet</p>
          <p className="mt-1 font-serif text-5xl text-primary">{result.newBalance}</p>
          <p className="text-[11px] text-muted-foreground">total earned credits</p>
        </div>

        {!earned && (
          <p className="mt-4 text-[11px] text-muted-foreground">
            Tip: take at least 15 seconds and answer every question thoughtfully to earn credit.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={onClose} size="lg" className="rounded-full bg-primary">
            Answer more surveys
          </Button>
          <Link to="/profile">
            <Button variant="outline" size="lg" className="rounded-full w-full sm:w-auto">
              View wallet
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

