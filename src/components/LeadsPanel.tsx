import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listLeads, updateLead, type Lead } from "@/lib/leads.functions";
import { neutralizeFormula } from "@/lib/csv-safe";

const STATUSES = ["new", "contacted", "won", "lost"] as const;

function csvCell(v: unknown) {
  const s = neutralizeFormula(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function LeadsPanel() {
  const fetchLeads = useServerFn(listLeads);
  const save = useServerFn(updateLead);
  const qc = useQueryClient();
  const { data = [], isPending, isError, refetch } = useQuery({ queryKey: ["admin", "leads"], queryFn: () => fetchLeads(), retry: 1 });
  const [kind, setKind] = useState<"all" | "school" | "demo">("all");
  const [status, setStatus] = useState<"all" | Lead["status"]>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return data.filter((l) =>
      (kind === "all" || l.kind === kind) && (status === "all" || l.status === status) &&
      (!t || [l.full_name, l.email, l.organization, l.country].some((v) => (v ?? "").toLowerCase().includes(t))));
  }, [data, kind, status, q]);

  async function patch(id: string, p: { status?: Lead["status"]; notes?: string }) {
    try {
      await save({ data: { id, ...p } });
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
      toast.success("Saved");
    } catch { toast.error("Could not save"); }
  }

  function exportCsv() {
    const cols: (keyof Lead)[] = ["created_at", "kind", "status", "full_name", "email", "phone", "organization", "role_title", "country", "student_count", "message", "notes"];
    const body = [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + body], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `campusverify-leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (isPending) return <p className="text-sm text-muted-foreground">Loading leads…</p>;
  if (isError) return <Button onClick={() => refetch()}>Couldn't load leads — try again</Button>;

  const count = (s: Lead["status"]) => data.filter((l) => l.status === s).length;
  const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        {STATUSES.map((s) => <span key={s} className="rounded-full bg-secondary px-3 py-1 capitalize">{s}: <b>{count(s)}</b></span>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, organisation…" className="max-w-xs" />
        <select className={sel} value={kind} onChange={(e) => setKind(e.target.value as any)}>
          <option value="all">All forms</option><option value="school">School interest</option><option value="demo">Demo requests</option>
        </select>
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="all">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={exportCsv} className="ml-auto"><Download className="mr-1 h-4 w-4" />Download CSV</Button>
      </div>
      <ul className="space-y-3">
        {rows.length === 0 && <li className="rounded-2xl border border-foreground/15 bg-card p-6 text-center text-muted-foreground">No leads yet. Share /schools and /demo to collect them.</li>}
        {rows.map((l) => <LeadRow key={l.id} lead={l} onPatch={patch} sel={sel} />)}
      </ul>
    </div>
  );
}

function LeadRow({ lead: l, onPatch, sel }: { lead: Lead; onPatch: (id: string, p: any) => void; sel: string }) {
  const [notes, setNotes] = useState(l.notes ?? "");
  return (
    <li className="rounded-2xl border border-foreground/15 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-serif text-lg leading-tight">{l.full_name} <span className="text-sm text-muted-foreground">· {l.organization ?? "—"}</span></p>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{l.kind === "school" ? "School interest" : "Demo request"}</span> · <a className="underline" href={`mailto:${l.email}`}>{l.email}</a>
            {l.phone && ` · ${l.phone}`}{l.role_title && ` · ${l.role_title}`}{l.country && ` · ${l.country}`}{l.student_count && ` · ${l.student_count} students`} · {new Date(l.created_at).toLocaleDateString()}
          </p>
        </div>
        <select className={sel} value={l.status} onChange={(e) => onPatch(l.id, { status: e.target.value })}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {l.message && <p className="mt-2 whitespace-pre-wrap text-sm">{l.message}</p>}
      <div className="mt-3 flex gap-2">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private notes" rows={2} maxLength={4000} />
        <Button size="sm" variant="outline" disabled={notes === (l.notes ?? "")} onClick={() => onPatch(l.id, { notes })}>Save</Button>
      </div>
    </li>
  );
}
