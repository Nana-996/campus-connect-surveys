import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, ListChecks } from "lucide-react";
import { listMySchoolTrackingGrants, getMySchoolTrackingRoster } from "@/lib/manager.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/school-tracking")({
  head: () => ({
    meta: [
      { title: "School-assigned survey tracking — CampusVerify" },
      { name: "description", content: "Follow response status by index number for surveys your school asked you to help with." },
      { property: "og:title", content: "School-assigned survey tracking — CampusVerify" },
      { property: "og:description", content: "Index-number response status for school-assigned surveys." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchoolTrackingPage,
  errorComponent: () => <p className="text-sm text-muted-foreground">Couldn't load school tracking. Please refresh.</p>,
  notFoundComponent: () => <p className="text-muted-foreground">Not found.</p>,
});

const LABEL = { not_started: "Not started", responding: "Responding", responded: "Responded" } as const;
type Status = keyof typeof LABEL;

function SchoolTrackingPage() {
  const fetchGrants = useServerFn(listMySchoolTrackingGrants);
  const fetchRoster = useServerFn(getMySchoolTrackingRoster);
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");

  const { data: grants = [], isPending } = useQuery({ queryKey: ["school-tracking", "grants"], queryFn: () => fetchGrants(), retry: false });
  const active = surveyId ?? grants[0]?.survey_id ?? null;
  const grant = grants.find((g) => g.survey_id === active);
  const { data: roster = [], isPending: rosterPending } = useQuery({
    queryKey: ["school-tracking", "roster", active],
    queryFn: () => fetchRoster({ data: { surveyId: active! } }),
    enabled: !!active,
    retry: false,
  });

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return roster.filter((r) => (filter === "all" || r.response_status === filter) &&
      (!t || r.index_number.toLowerCase().includes(t) || (r.department ?? "").toLowerCase().includes(t)));
  }, [roster, q, filter]);
  const counts = useMemo(() => {
    const c = { not_started: 0, responding: 0, responded: 0 };
    roster.forEach((r) => { c[r.response_status]++; });
    return c;
  }, [roster]);

  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""').replace(/^[=+\-@]/, "'$&")}"`;
    const csv = ["Index number,Department,Status", ...rows.map((r) => [r.index_number, r.department ?? "", LABEL[r.response_status]].map(esc).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "school-tracking.csv";
    a.click();
  };

  if (isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">School-assigned tracking</p>
        <h1 className="mt-1 font-serif text-5xl leading-[0.95]">Response <em className="text-primary">follow-up.</em></h1>
        <p className="mt-2 text-sm text-muted-foreground">Your school gave you access to see which eligible students have responded, by index number only.</p>
      </div>

      {grants.length === 0 ? (
        <div className="rounded-2xl border border-foreground/15 bg-card p-8 text-center text-sm text-muted-foreground">
          No surveys have been assigned to you by your school yet.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {grants.map((g) => (
              <Button key={g.survey_id} size="sm" variant={g.survey_id === active ? "default" : "outline"} onClick={() => setSurveyId(g.survey_id)}>
                {g.title}
              </Button>
            ))}
          </div>
          {grant && (
            <p className="text-xs text-muted-foreground">
              {grant.school_name} · {grant.scope === "university" ? "University-wide" : grant.department} · {grant.response_count}/{grant.response_goal} responses · {grant.is_active ? "Live" : "Closed"}
            </p>
          )}
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(LABEL) as Status[]).map((k) => (
              <button key={k} onClick={() => setFilter(filter === k ? "all" : k)} className={`rounded-2xl border bg-card p-4 text-left ${filter === k ? "border-primary" : "border-foreground/15"}`}>
                <p className="text-xs text-muted-foreground">{LABEL[k]}</p>
                <p className="font-serif text-3xl tabular-nums">{counts[k]}</p>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search index or department…" className="max-w-sm" />
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}><Download /> Export CSV</Button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-foreground/15 bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wider">
                <tr><th className="px-4 py-3">Index</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody>
                {rosterPending && <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
                {!rosterPending && rows.map((r) => (
                  <tr key={r.index_number} className="border-t border-foreground/10">
                    <td className="px-4 py-3 font-mono text-xs">{r.index_number}</td>
                    <td className="px-4 py-3">{r.department || "—"}</td>
                    <td className={`px-4 py-3 font-semibold ${r.response_status === "responded" ? "text-primary" : "text-muted-foreground"}`}>{LABEL[r.response_status]}</td>
                  </tr>
                ))}
                {!rosterPending && rows.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground"><ListChecks className="mx-auto mb-2 h-5 w-5" />No matching students.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
