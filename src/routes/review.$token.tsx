import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Check, PencilLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/review/$token")({
  head: () => ({
    meta: [
      { title: "Supervisor survey review — CampusVerify" },
      { name: "description", content: "Review a student's research survey and approve it or request changes." },
      { property: "og:title", content: "Supervisor survey review — CampusVerify" },
      { property: "og:description", content: "Approve a research survey or request changes, no account needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewPage,
});

type Review = {
  status: string; comment: string | null; supervisorName: string | null; title: string;
  description: string; questions: any[]; researcher: string | null; university: string | null;
};

function ReviewPage() {
  const { token } = Route.useParams();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["public-review", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_survey_review" as any, { _token: token });
      if (error) throw error;
      return data as unknown as Review | null;
    },
    retry: 1,
  });
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(approve: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc("submit_survey_review" as any, { _token: token, _approve: approve, _comment: comment || null });
    setBusy(false);
    if (error) return toast.error(/explain|no longer active/.test(error.message) ? error.message : "Could not submit review");
    toast.success(approve ? "Survey approved" : "Changes requested");
    refetch();
  }

  const shell = (c: React.ReactNode) => <main className="mx-auto max-w-2xl px-4 py-12">{c}</main>;
  if (isPending) return shell(<p className="text-sm text-muted-foreground">Loading…</p>);
  if (isError || !data)
    return shell(<p className="rounded-3xl border border-foreground/15 bg-card p-8 text-center font-serif text-2xl">This review link isn't valid.</p>);

  return shell(
    <div className="space-y-6">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> Supervisor review
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-tight">{data.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          By {data.researcher ?? "a researcher"}{data.university ? ` · ${data.university}` : ""}
        </p>
        {data.description && <p className="mt-3 text-sm">{data.description}</p>}
      </div>

      <ol className="space-y-3">
        {(data.questions ?? []).map((q: any, i: number) => (
          <li key={q.id ?? i} className="rounded-2xl border border-foreground/15 bg-card p-4">
            <p className="font-medium">{i + 1}. {q.text ?? q.title ?? q.label}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{q.type}{q.required ? " · required" : ""}</p>
            {Array.isArray(q.options) && q.options.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{q.options.map((o: any, j: number) => <li key={j}>{typeof o === "string" ? o : o.label}</li>)}</ul>
            )}
          </li>
        ))}
      </ol>

      <div className="rounded-3xl border border-foreground/15 bg-card p-5">
        {data.status === "pending" ? (
          <>
            <p className="font-semibold">Your decision</p>
            <Textarea className="mt-2" rows={4} maxLength={2000} placeholder="Comments (required if requesting changes)" value={comment} onChange={(e) => setComment(e.target.value)} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => submit(true)}><Check className="mr-1 h-4 w-4" />Approve survey</Button>
              <Button variant="outline" disabled={busy} onClick={() => submit(false)}><PencilLine className="mr-1 h-4 w-4" />Request changes</Button>
            </div>
          </>
        ) : (
          <p className="text-sm">
            {data.status === "approved" && "You approved this survey. Thank you."}
            {data.status === "changes_requested" && "You requested changes. The researcher has been shown your comments."}
            {data.status === "expired" && "This review link has expired. Ask the researcher for a new one."}
            {data.status === "revoked" && "This link was replaced by a newer one."}
            {data.comment && <span className="mt-2 block text-muted-foreground">“{data.comment}”</span>}
          </p>
        )}
      </div>
    </div>,
  );
}
