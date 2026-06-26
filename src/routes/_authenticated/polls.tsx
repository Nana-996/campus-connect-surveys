import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { safeErrorMessage } from "@/lib/safe-error";
import { Plus, Star, Trash2, X, BarChart3, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Poll = {
  id: string;
  creator_id: string;
  question: string;
  type: "choice" | "rating";
  options: string[];
  is_active: boolean;
  expires_at: string;
  created_at: string;
};

type Result = { answer: string; count: number };

export const Route = createFileRoute("/_authenticated/polls")({
  component: PollsPage,
  head: () => ({
    meta: [
      { title: "Polls — CampusVerify" },
      {
        name: "description",
        content: "Quick public polls. Free to post, free to answer. No credits in or out.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function PollsPage() {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, Result[]>>({});
  const [composerOpen, setComposerOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: pollData, error: pErr }, { data: voteData }] = await Promise.all([
      supabase
        .from("polls")
        .select("*")
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("poll_responses").select("poll_id, answer").eq("respondent_id", user.id),
    ]);
    if (pErr) toast.error(safeErrorMessage(pErr, "Could not load polls."));
    const polls = (pollData ?? []) as Poll[];
    setPolls(polls);
    const votes: Record<string, string> = {};
    (voteData ?? []).forEach((v: any) => (votes[v.poll_id] = v.answer));
    setMyVotes(votes);
    // Load aggregated counts for every poll
    const allResults = await Promise.all(
      polls.map((p) => supabase.rpc("get_poll_results", { _poll_id: p.id })),
    );
    const map: Record<string, Result[]> = {};
    polls.forEach((p, i) => {
      const rows = (allResults[i].data ?? []) as Result[];
      map[p.id] = rows;
    });
    setResults(map);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const vote = async (poll: Poll, answer: string) => {
    if (!user) return;
    if (myVotes[poll.id]) return;
    const { error } = await supabase
      .from("poll_responses")
      .insert({ poll_id: poll.id, respondent_id: user.id, answer });
    if (error) {
      toast.error(safeErrorMessage(error, "Could not save your vote."));
      return;
    }
    setMyVotes((m) => ({ ...m, [poll.id]: answer }));
    // Refresh aggregated count for this poll
    const { data } = await supabase.rpc("get_poll_results", { _poll_id: poll.id });
    setResults((r) => ({ ...r, [poll.id]: (data ?? []) as Result[] }));
    toast.success("Vote recorded");
  };

  const deletePoll = async (id: string) => {
    if (!confirm("Delete this poll?")) return;
    const { error } = await supabase.from("polls").delete().eq("id", id);
    if (error) {
      toast.error(safeErrorMessage(error, "Could not delete the poll."));
      return;
    }
    setPolls((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div className="min-w-0">
      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Community polls
        </p>
        <h1 className="mt-1 font-serif text-4xl leading-[0.95] sm:text-5xl break-words">
          <em className="text-primary">Polls.</em> Free to post, free to vote.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Drop a quick question for the whole platform. No credits charged, no credits earned. One
          vote per person.
        </p>
      </header>

      <div className="mb-6">
        {composerOpen ? (
          <PollComposer
            onClose={() => setComposerOpen(false)}
            onCreated={async () => {
              setComposerOpen(false);
              await load();
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-paper hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Post a poll
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading polls…</p>
      ) : polls.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid gap-4">
          {polls.map((p) => (
            <PollCard
              key={p.id}
              poll={p}
              myVote={myVotes[p.id] ?? null}
              results={results[p.id] ?? []}
              onVote={(a) => vote(p, a)}
              onDelete={p.creator_id === user?.id ? () => deletePoll(p.id) : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-foreground/20 bg-card p-8 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-primary" />
      <p className="mt-3 font-serif text-2xl">No polls yet.</p>
      <p className="mt-1 text-sm text-muted-foreground">Be the first to post one.</p>
    </div>
  );
}

function PollCard({
  poll,
  myVote,
  results,
  onVote,
  onDelete,
}: {
  poll: Poll;
  myVote: string | null;
  results: Result[];
  onVote: (answer: string) => void;
  onDelete?: () => void;
}) {
  const total = useMemo(() => results.reduce((s, r) => s + Number(r.count), 0), [results]);
  const countFor = (answer: string) => Number(results.find((r) => r.answer === answer)?.count ?? 0);
  const pct = (answer: string) => (total === 0 ? 0 : Math.round((countFor(answer) / total) * 100));
  const choices = poll.type === "rating" ? ["1", "2", "3", "4", "5"] : (poll.options ?? []);

  return (
    <li className="min-w-0 rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            {poll.type === "rating" ? "Rating poll" : "Choice poll"}
          </p>
          <h2 className="mt-1 font-serif text-2xl leading-tight break-words">{poll.question}</h2>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Delete poll"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-2">
        {choices.map((opt) => {
          const isMine = myVote === opt;
          const c = countFor(opt);
          const p = pct(opt);
          return (
            <button
              key={opt}
              type="button"
              disabled={!!myVote}
              onClick={() => onVote(opt)}
              className={`relative min-w-0 overflow-hidden rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                isMine
                  ? "border-primary bg-primary/10"
                  : myVote
                    ? "border-foreground/15 bg-background"
                    : "border-foreground/15 bg-background hover:border-primary hover:bg-primary/5"
              } ${myVote ? "cursor-default" : "cursor-pointer"}`}
            >
              {myVote && (
                <span
                  className="absolute inset-y-0 left-0 bg-primary/15"
                  style={{ width: `${p}%` }}
                  aria-hidden
                />
              )}
              <span className="relative flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 break-words">
                  {poll.type === "rating" && <Star className="h-3.5 w-3.5 shrink-0" />}
                  <span className="break-words">{opt}</span>
                  {isMine && (
                    <span className="ml-1 shrink-0 text-[10px] uppercase tracking-widest text-primary">
                      your vote
                    </span>
                  )}
                </span>
                {myVote && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {p}% · {c}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {total} {total === 1 ? "vote" : "votes"}
        </span>
        <span className="inline-flex items-center gap-1">
          <BarChart3 className="h-3 w-3" />
          {myVote ? "Results visible" : "Vote to reveal"}
        </span>
      </div>
    </li>
  );
}

function PollComposer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<"choice" | "rating">("choice");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return;
    const q = question.trim();
    if (q.length === 0 || q.length > 200) {
      toast.error("Question must be 1–200 characters");
      return;
    }
    let opts: string[] = [];
    if (type === "choice") {
      opts = options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2 || opts.length > 4) {
        toast.error("Choice polls need 2–4 options");
        return;
      }
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("polls")
      .insert({ creator_id: user.id, question: q, type, options: opts });
    setSubmitting(false);
    if (error) {
      toast.error(safeErrorMessage(error, "Could not post the poll."));
      return;
    }
    toast.success("Poll posted");
    onCreated();
  };

  return (
    <div className="min-w-0 rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="font-serif text-2xl">New poll</h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-secondary"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <Label htmlFor="poll-q">Question</Label>
          <Textarea
            id="poll-q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={200}
            placeholder="What's a quick thing you want the community to weigh in on?"
            className="mt-1"
          />
          <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            {question.length}/200
          </p>
        </div>

        <div>
          <Label>Type</Label>
          <div className="mt-1 inline-flex rounded-full border border-foreground/15 bg-background p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setType("choice")}
              className={`rounded-full px-3 py-1 ${type === "choice" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Choice
            </button>
            <button
              type="button"
              onClick={() => setType("rating")}
              className={`rounded-full px-3 py-1 ${type === "rating" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              1–5 rating
            </button>
          </div>
        </div>

        {type === "choice" && (
          <div className="grid gap-2">
            <Label>Options (2–4)</Label>
            {options.map((o, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <Input
                  value={o}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }}
                  placeholder={`Option ${i + 1}`}
                  maxLength={80}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                    className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-secondary"
                    aria-label="Remove option"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOptions([...options, ""])}
                className="w-fit"
              >
                <Plus className="mr-1 h-3 w-3" /> Add option
              </Button>
            )}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Posting…" : "Post poll"}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <p className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
            Free · no credits
          </p>
        </div>
      </div>
    </div>
  );
}
