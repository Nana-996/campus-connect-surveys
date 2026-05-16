import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

type Question = {
  id: string;
  type: "text" | "choice" | "rating";
  text: string;
  options?: string[];
};

export const Route = createFileRoute("/_authenticated/create")({
  component: Create,
});

const PUBLISH_COST = 2;

function Create() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDept, setTargetDept] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { id: crypto.randomUUID(), type: "text", text: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addQ = (type: Question["type"]) =>
    setQuestions((q) => [
      ...q,
      {
        id: crypto.randomUUID(),
        type,
        text: "",
        options: type === "choice" ? ["", ""] : undefined,
      },
    ]);
  const removeQ = (id: string) => setQuestions((q) => q.filter((x) => x.id !== id));
  const updateQ = (id: string, patch: Partial<Question>) =>
    setQuestions((q) => q.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if ((profile.credits ?? 0) < PUBLISH_COST) {
      toast.error(`You need ${PUBLISH_COST} credits to publish. Earn more by answering surveys.`);
      return;
    }
    if (questions.length === 0 || questions.some((q) => !q.text.trim())) {
      toast.error("Each question needs text.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("surveys")
        .insert({
          creator_id: user!.id,
          university_domain: profile.university_domain,
          title: title.trim(),
          description: description.trim(),
          questions: questions as any,
          target_department: targetDept || null,
          target_year: targetYear || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      await refreshProfile();
      toast.success("Survey published!");
      navigate({ to: "/survey/$id", params: { id: data.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to publish");
    } finally {
      setSubmitting(false);
    }
  };

  const lowCredits = (profile?.credits ?? 0) < PUBLISH_COST;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Studio</p>
      <h1 className="mt-1 font-serif text-5xl leading-[0.95]">Ask <em className="text-primary">campus.</em></h1>
      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-highlight px-3 py-1 text-xs font-bold uppercase tracking-wider text-highlight-foreground">
        {PUBLISH_COST} credits to publish · you have {profile?.credits ?? 0}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="rounded-3xl border border-foreground/15 bg-card p-6 space-y-4 shadow-paper">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sleep habits among 2nd-year students"
            />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short context for respondents."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="td">Target department (optional)</Label>
              <Input
                id="td"
                value={targetDept}
                onChange={(e) => setTargetDept(e.target.value)}
                placeholder="Psychology"
              />
            </div>
            <div>
              <Label htmlFor="ty">Target year (optional)</Label>
              <Input
                id="ty"
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                placeholder="Year 2"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">
                      Q{i + 1}
                    </span>
                    <Select
                      value={q.type}
                      onValueChange={(v: any) =>
                        updateQ(q.id, { type: v, options: v === "choice" ? ["", ""] : undefined })
                      }
                    >
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Short answer</SelectItem>
                        <SelectItem value="choice">Multiple choice</SelectItem>
                        <SelectItem value="rating">Rating (1-5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    value={q.text}
                    onChange={(e) => updateQ(q.id, { text: e.target.value })}
                    placeholder="Question text"
                  />
                  {q.type === "choice" && (
                    <div className="space-y-2 pl-2">
                      {q.options?.map((opt, oi) => (
                        <div key={oi} className="flex gap-2">
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const opts = [...(q.options ?? [])];
                              opts[oi] = e.target.value;
                              updateQ(q.id, { options: opts });
                            }}
                            placeholder={`Option ${oi + 1}`}
                          />
                          {(q.options?.length ?? 0) > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                updateQ(q.id, {
                                  options: q.options?.filter((_, idx) => idx !== oi),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateQ(q.id, { options: [...(q.options ?? []), ""] })}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add option
                      </Button>
                    </div>
                  )}
                </div>
                {questions.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeQ(q.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
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

        <Button type="submit" size="lg" disabled={submitting || lowCredits} className="h-14 w-full rounded-full bg-primary text-base">
          {submitting ? "Publishing…" : lowCredits ? "Not enough credits — answer surveys to earn more" : `Publish for ${PUBLISH_COST} credits →`}
        </Button>
      </form>
    </div>
  );
}
