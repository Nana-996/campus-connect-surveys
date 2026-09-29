import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listMyTopups, requestCreditTopup } from "@/lib/topup.functions";

export function TopupRequest() {
  const qc = useQueryClient();
  const fetchMine = useServerFn(listMyTopups);
  const send = useServerFn(requestCreditTopup);
  const { data = [] } = useQuery({ queryKey: ["topups", "mine"], queryFn: () => fetchMine(), retry: 1 });
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = data.find((r) => r.status === "pending");

  async function submit() {
    setBusy(true);
    try {
      await send({ data: { amount, reason } });
      toast.success("Request sent to your school admin");
      setReason("");
      qc.invalidateQueries({ queryKey: ["topups", "mine"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not send request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-foreground/15 bg-card p-4 text-left">
      <p className="flex items-center gap-2 font-semibold"><School className="h-4 w-4" /> Ask your school for credits</p>
      {pending ? (
        <p className="mt-2 text-sm text-muted-foreground">Your request for {pending.amount} credits is waiting for your school admin.</p>
      ) : (
        <div className="mt-3 space-y-2">
          <Input type="number" min={1} max={100} value={amount} onChange={(e) => setAmount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className="w-28" />
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why do you need them? e.g. final-year project survey" maxLength={500} />
          <Button size="sm" disabled={busy || reason.trim().length < 3} onClick={submit}>Send request</Button>
        </div>
      )}
      {data.filter((r) => r.status !== "pending").slice(0, 3).map((r) => (
        <p key={r.id} className="mt-2 text-xs text-muted-foreground">
          {r.amount} credits · <span className={r.status === "approved" ? "text-primary" : "text-destructive"}>{r.status}</span>
          {r.decision_note ? ` — ${r.decision_note}` : ""}
        </p>
      ))}
    </div>
  );
}
