import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decideTopup, listSchoolTopups } from "@/lib/topup.functions";

export function TopupQueue() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listSchoolTopups);
  const decide = useServerFn(decideTopup);
  const { data = [], isPending } = useQuery({ queryKey: ["topups", "school"], queryFn: () => fetchAll(), retry: 1 });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, approve: boolean) {
    setBusy(id);
    try {
      await decide({ data: { id, approve, note: notes[id] } });
      toast.success(approve ? "Credits granted" : "Request declined");
      qc.invalidateQueries({ queryKey: ["topups", "school"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setBusy(null);
    }
  }

  if (isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (data.length === 0)
    return <p className="rounded-2xl border border-foreground/15 bg-card p-6 text-center text-muted-foreground">No credit requests yet.</p>;

  return (
    <ul className="space-y-3">
      {data.map((r) => (
        <li key={r.id} className="rounded-2xl border border-foreground/15 bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{r.student_name} <span className="font-normal text-muted-foreground">asks for {r.amount} credits</span></p>
              <p className="text-xs text-muted-foreground">
                {r.department || "—"} · {r.index_number ?? "no index"} · has {r.earned_credits ?? 0} · {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
            {r.status !== "pending" && (
              <span className={`text-xs font-semibold capitalize ${r.status === "approved" ? "text-primary" : "text-destructive"}`}>{r.status}</span>
            )}
          </div>
          <p className="mt-2 text-sm">“{r.reason}”</p>
          {r.status === "pending" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input className="max-w-xs" placeholder="Note (optional)" maxLength={300}
                value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
              <Button size="sm" disabled={busy === r.id} onClick={() => act(r.id, true)}><Check className="mr-1 h-4 w-4" />Approve</Button>
              <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => act(r.id, false)}><X className="mr-1 h-4 w-4" />Decline</Button>
            </div>
          ) : r.decision_note ? (
            <p className="mt-2 text-xs text-muted-foreground">Note: {r.decision_note}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
