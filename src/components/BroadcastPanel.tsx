import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Megaphone, RefreshCw, Mail } from "lucide-react";
import { getBroadcastAudience } from "@/lib/admin.functions";

type Filters = {
  userType: "all" | "student" | "general";
  role: "all" | "admin" | "manager" | "faculty" | "none";
  universityDomain: string;
  onlyConfirmed: boolean;
};

const DEFAULT_FILTERS: Filters = {
  userType: "all",
  role: "all",
  universityDomain: "",
  onlyConfirmed: true,
};

const DEFAULT_SUBJECT = "An update from CampusVerify";
const DEFAULT_BODY = `Hi there,

Quick update from CampusVerify.

[Write your announcement here.]

— The CampusVerify team
https://campus-verify.live`;

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function BroadcastPanel() {
  const fetchAudience = useServerFn(getBroadcastAudience);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [batchSize, setBatchSize] = useState(50);

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["admin", "broadcast", filters],
    queryFn: () =>
      fetchAudience({
        data: {
          userType: filters.userType,
          role: filters.role,
          universityDomain: filters.universityDomain || undefined,
          onlyConfirmed: filters.onlyConfirmed,
        },
      }),
    retry: false,
  });

  const recipients = data?.recipients ?? [];
  const emails = useMemo(() => recipients.map((r) => r.email), [recipients]);

  const batches = useMemo(() => {
    const size = Math.max(1, Math.min(500, batchSize));
    const out: string[][] = [];
    for (let i = 0; i < emails.length; i += size) out.push(emails.slice(i, i + size));
    return out;
  }, [emails, batchSize]);

  async function copy(text: string, label: string) {
    if (!text) return toast.error("Nothing to copy yet.");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard blocked by your browser.");
    }
  }

  function downloadCsv() {
    if (recipients.length === 0) return toast.error("No recipients to export.");
    const header = ["email", "name", "user_type", "university", "domain", "roles"];
    const lines = [
      header.join(","),
      ...recipients.map((r) =>
        [r.email, r.name, r.userType, r.university, r.domain, r.roles.join(" ")]
          .map((v) => csvEscape(String(v ?? "")))
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campusverify-audience-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  const errMsg = (error as any)?.message as string | undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-foreground/15 bg-card p-5">
        <div className="flex items-start gap-3">
          <Megaphone className="mt-1 h-5 w-5 text-primary" />
          <div>
            <p className="font-serif text-2xl leading-tight">Broadcast studio</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Build the recipient list, write the announcement, then export both into your own email
              platform. Nothing is sent from CampusVerify — suppressed (unsubscribed / bounced)
              addresses are removed automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Audience */}
      <div className="rounded-2xl border border-foreground/15 bg-card p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Audience</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Account type</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={filters.userType}
              onChange={(e) => setFilters((f) => ({ ...f, userType: e.target.value as Filters["userType"] }))}
            >
              <option value="all">Everyone</option>
              <option value="student">Students</option>
              <option value="general">General users</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={filters.role}
              onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value as Filters["role"] }))}
            >
              <option value="all">Any role</option>
              <option value="none">No special role</option>
              <option value="faculty">Faculty</option>
              <option value="manager">Managers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">University domain</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={filters.universityDomain}
              onChange={(e) => setFilters((f) => ({ ...f, universityDomain: e.target.value }))}
            >
              <option value="">All campuses</option>
              {(data?.domains ?? []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.onlyConfirmed}
                onChange={(e) => setFilters((f) => ({ ...f, onlyConfirmed: e.target.checked }))}
              />
              Verified emails only
            </label>
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {errMsg ? (
          <p className="mt-3 text-sm text-destructive">{errMsg}</p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <Badge>{isFetching ? "Counting…" : `${data?.total ?? 0} recipients`}</Badge>
            <Badge variant="outline">{data?.skippedSuppressed ?? 0} suppressed skipped</Badge>
            <Badge variant="outline">{data?.skippedUnconfirmed ?? 0} unverified skipped</Badge>
          </div>
        )}
      </div>

      {/* Message */}
      <div className="rounded-2xl border border-foreground/15 bg-card p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Message</p>
        <div className="mt-3 space-y-3">
          <div>
            <Label className="text-xs" htmlFor="bc-subject">Subject</Label>
            <Input id="bc-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} />
          </div>
          <div>
            <Label className="text-xs" htmlFor="bc-body">Body</Label>
            <textarea
              id="bc-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void copy(subject, "Subject")}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy subject
            </Button>
            <Button variant="outline" size="sm" onClick={() => void copy(body, "Body")}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy body
            </Button>
            <Button variant="outline" size="sm" onClick={() => void copy(`Subject: ${subject}\n\n${body}`, "Message")}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy both
            </Button>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="rounded-2xl border border-foreground/15 bg-card p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Export recipients</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={downloadCsv} disabled={recipients.length === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Download CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => void copy(emails.join(", "), "Email list")} disabled={emails.length === 0}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy all emails
          </Button>
          <div className="flex items-center gap-2">
            <Label className="text-xs" htmlFor="bc-batch">Batch size</Label>
            <Input
              id="bc-batch"
              type="number"
              min={1}
              max={500}
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value) || 1)}
              className="h-9 w-20"
            />
          </div>
        </div>

        {batches.length > 0 && (
          <ul className="mt-4 space-y-2">
            {batches.map((batch, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 px-3 py-2 text-sm">
                <span className="truncate">
                  Batch {i + 1} · {batch.length} addresses
                </span>
                <span className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={() => void copy(batch.join(", "), `Batch ${i + 1}`)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <a
                    href={`mailto:?bcc=${encodeURIComponent(batch.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                    className="inline-flex items-center rounded-md px-2 text-muted-foreground hover:text-foreground"
                    title="Open in your mail app (BCC)"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </a>
                </span>
              </li>
            ))}
          </ul>
        )}

        {recipients.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground">Preview recipients</summary>
            <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-foreground/10">
              <table className="w-full text-xs">
                <thead className="bg-secondary text-left uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Campus</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.slice(0, 300).map((r) => (
                    <tr key={r.email} className="border-t border-foreground/10">
                      <td className="px-3 py-1.5">{r.email}</td>
                      <td className="px-3 py-1.5">{r.name}</td>
                      <td className="px-3 py-1.5">{r.userType}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.university || r.domain}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
