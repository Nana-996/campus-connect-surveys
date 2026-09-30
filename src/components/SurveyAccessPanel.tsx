import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteSurveyTracker, listSurveyTrackers, revokeSurveyTracker } from "@/lib/survey-access.functions";

export function SurveyAccessPanel({ surveyId, asAdmin = false, className = "" }: { surveyId: string; asAdmin?: boolean; className?: string }) {
  const qc = useQueryClient();
  const invite = useServerFn(inviteSurveyTracker);
  const list = useServerFn(listSurveyTrackers);
  const revoke = useServerFn(revokeSurveyTracker);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const key = ["survey-trackers", surveyId];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => list({ data: { surveyId } }) });

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return toast.error("Enter a valid email address.");
    setBusy(true);
    try {
      const res = await invite({ data: { surveyId, email: clean } });
      toast.success(res.ownerNotified ? `Invitation sent to ${clean}. The owner has been notified.` : `Invitation sent to ${clean}.`);
      setEmail("");
      qc.invalidateQueries({ queryKey: key });
    } catch (err: any) {
      toast.error(err?.message || "Could not send the invitation.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (payload: { userId?: string; inviteId?: string }, msg: string) => {
    try {
      await revoke({ data: { surveyId, ...payload } });
      toast.success(msg);
      qc.invalidateQueries({ queryKey: key });
    } catch (err: any) {
      toast.error(err?.message || "Could not update access.");
    }
  };

  return (
    <div className={`rounded-2xl border border-foreground/15 bg-background p-4 text-left text-foreground ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Progress access</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {asAdmin
          ? "Invite someone on the owner's behalf. The owner will be emailed about it."
          : "Invite someone to follow this survey's progress. They'll get an email and must accept with a CampusVerify account."}
      </p>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <Input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
        <Button type="submit" size="sm" disabled={busy || !email}><Mail className="mr-1 h-3.5 w-3.5" />{busy ? "Sending…" : "Invite"}</Button>
      </form>
      {isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading…</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {data?.active.map((a) => (
            <li key={a.userId} className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0"><p className="truncate font-medium">{a.name || a.email}</p><p className="truncate text-[10px] text-muted-foreground">{a.email} · has access</p></div>
              <Button size="sm" variant="outline" aria-label="Remove access" onClick={() => remove({ userId: a.userId }, "Access removed.")}><Trash2 className="h-3 w-3" /></Button>
            </li>
          ))}
          {data?.pending.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0"><p className="truncate font-medium">{p.email}</p><p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" />{p.expired ? "Invitation expired — invite again" : "Waiting for them to accept"}{p.viaAdmin ? " · sent by admin" : ""}</p></div>
              <Button size="sm" variant="outline" aria-label="Cancel invitation" onClick={() => remove({ inviteId: p.id }, "Invitation cancelled.")}><Trash2 className="h-3 w-3" /></Button>
            </li>
          ))}
          {!data?.active.length && !data?.pending.length && <li className="text-xs text-muted-foreground">No one else has access yet.</li>}
        </ul>
      )}
    </div>
  );
}
