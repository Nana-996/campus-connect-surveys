import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Copy, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LABEL: Record<string, string> = {
  pending: "Awaiting supervisor",
  approved: "Supervisor approved",
  changes_requested: "Changes requested",
};

export function SupervisorReviewBadge({ surveyId }: { surveyId: string }) {
  const { data } = useLatestReview(surveyId);
  if (!data || data.status === "revoked") return null;
  const tone = data.status === "approved" ? "text-primary" : data.status === "changes_requested" ? "text-destructive" : "opacity-70";
  return (
    <p className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${tone}`}>
      <ShieldCheck className="h-3.5 w-3.5" /> {LABEL[data.status] ?? data.status}
    </p>
  );
}

function useLatestReview(surveyId: string) {
  return useQuery({
    queryKey: ["survey-review", surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_reviews" as any)
        .select("status, comment, supervisor_email, token, expires_at, decided_at")
        .eq("survey_id", surveyId)
        .neq("status", "revoked")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any as { status: string; comment: string | null; supervisor_email: string; token: string; expires_at: string } | null;
    },
    retry: 1,
  });
}

export function SupervisorReviewPanel({ surveyId, title }: { surveyId: string; title: string }) {
  const qc = useQueryClient();
  const { data } = useLatestReview(surveyId);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const link = (t: string) => `${window.location.origin}/review/${t}`;

  async function send() {
    setBusy(true);
    const { data: tok, error } = await supabase.rpc("request_survey_review" as any, { _survey_id: surveyId, _email: email, _name: name || null });
    setBusy(false);
    if (error) return toast.error(/Invalid email/.test(error.message) ? "Enter a valid email" : "Could not create review link");
    const url = link(tok as unknown as string);
    await navigator.clipboard?.writeText(url).catch(() => {});
    toast.success("Review link copied — send it to your supervisor");
    qc.invalidateQueries({ queryKey: ["survey-review", surveyId] });
    window.location.href = mailto(email, name, title, url);
  }

  return (
    <div className="mt-3 rounded-2xl border border-foreground/15 bg-background/60 p-4 text-foreground">
      <p className="font-semibold">Supervisor review</p>
      {data && data.status !== "revoked" && (
        <div className="mt-2 text-sm">
          <p>{LABEL[data.status]} · {data.supervisor_email}</p>
          {data.comment && <p className="mt-1 rounded-lg bg-secondary p-2 text-xs">“{data.comment}”</p>}
          {data.status === "pending" && (
            <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard?.writeText(link(data.token)); toast.success("Link copied"); }}>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy link
            </Button>
          )}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Input className="max-w-[14rem]" placeholder="Supervisor email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input className="max-w-[12rem]" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <Button size="sm" disabled={busy || !email.includes("@")} onClick={send}>
          <Mail className="mr-1 h-3.5 w-3.5" /> {data ? "Send new link" : "Send review link"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Your supervisor doesn't need an account. Links last 14 days; a new link cancels the old one.</p>
    </div>
  );
}

function mailto(email: string, name: string, title: string, url: string) {
  const body = `Dear ${name || "Supervisor"},\n\nPlease review my survey "${title}" on CampusVerify and approve it or request changes:\n\n${url}\n\nThank you.`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Survey review request: ${title}`)}&body=${encodeURIComponent(body)}`;
}
