import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, ArrowLeft, Users } from "lucide-react";

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

  const isOwner = survey && user && survey.creator_id === user.id;

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("surveys").select("*").eq("id", id).maybeSingle();
      if (!s) { setLoading(false); return; }
      setSurvey(s as unknown as Survey);
      if (s.creator_id === user!.id) {
        const { data: r } = await supabase.from("survey_responses").select("*").eq("survey_id", id).order("created_at", { ascending: false });
        setResponses(r ?? []);
      } else {
        const { data: own } = await supabase.from("survey_responses").select("id").eq("survey_id", id).eq("respondent_id", user!.id).maybeSingle();
        setAlreadyAnswered(!!own);
      }
      setLoading(false);
    })();
  }, [id, user]);

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
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-3xl">Responses</h2>
            <Button size="sm" variant="outline" className="rounded-full border-foreground/30" onClick={exportCSV} disabled={!responses?.length}>
              <Download className="mr-1 h-4 w-4" /> Export CSV
            </Button>
          </div>
          {responses && responses.length > 0 ? (
            <div className="mt-4 space-y-3">
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
