import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listSchoolSubscriptions, setSchoolSubscription } from "@/lib/admin.functions";

type Row = { domain: string; name: string; subscription_status: string; valid_until: string | null; admin_email: string | null };

export function SchoolSubscriptionsPanel() {
  const fetchRows = useServerFn(listSchoolSubscriptions);
  const { data = [], isPending } = useQuery({ queryKey: ["admin", "school-subs"], queryFn: () => fetchRows(), retry: 1 });
  return (
    <div className="rounded-2xl border border-foreground/15 bg-card p-4">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-primary" />
        <p className="font-serif text-xl">Plans & school admins</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Set each school's plan, end date and the email of the person who manages its School Admin Portal. The person must already have an account.
      </p>
      {isPending ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No schools yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">{data.map((r) => <SubRow key={r.domain} row={r} />)}</ul>
      )}
    </div>
  );
}

function SubRow({ row }: { row: Row }) {
  const save = useServerFn(setSchoolSubscription);
  const qc = useQueryClient();
  const [status, setStatus] = useState(row.subscription_status);
  const [until, setUntil] = useState(row.valid_until ? row.valid_until.slice(0, 10) : "");
  const [email, setEmail] = useState(row.admin_email ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <li className="rounded-xl border border-foreground/10 p-3">
      <p className="text-sm font-semibold">{row.name} <span className="font-normal text-muted-foreground">· {row.domain}</span></p>
      <form
        className="mt-2 grid gap-2 sm:grid-cols-[120px_160px_1fr_auto] sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await save({ data: { domain: row.domain, status: status as any, validUntil: until ? new Date(until + "T23:59:59Z").toISOString() : null, adminEmail: email.trim() } });
            toast.success("Saved");
            qc.invalidateQueries({ queryKey: ["admin", "school-subs"] });
          } catch (err: any) {
            toast.error(err.message || "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Plan
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground">
            <option value="trial">Trial</option><option value="active">Active</option><option value="expired">Expired</option>
          </select>
        </label>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Valid until
          <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="mt-1 h-9" />
        </label>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">School admin email
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dean@school.edu.gh" className="mt-1 h-9" />
        </label>
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </form>
    </li>
  );
}
