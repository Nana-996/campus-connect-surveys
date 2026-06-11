import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, CheckCircle2, Circle } from "lucide-react";
import { getMyManagerScope, getSurveyTracking, getSurveyResponsesForManager, getSurveyQuestionsForManager } from "@/lib/manager.functions";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/manage/$surveyId")({
  component: ManageSurveyPage,
  errorComponent: ({ error }) => {
    console.error("[manage-survey]", error);
    return (
      <div className="rounded-3xl border border-foreground/15 bg-card p-8 text-center">
        <p className="font-serif text-2xl">Cannot load tracking</p>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong loading this survey. Please try again or contact support.</p>
      </div>
    );
  },
  notFoundComponent: () => <p className="text-muted-foreground">Survey not found.</p>,
});

type Row = {
  student_id: string;
  full_name: string;
  index_number: string | null;
  department: string | null;
  year: string | null;
  responded_at: string | null;
};

function ManageSurveyPage() {
  const { surveyId } = Route.useParams();
  const fetchScope = useServerFn(getMyManagerScope);
  const fetchTracking = useServerFn(getSurveyTracking);
  const { data: scope } = useQuery({ queryKey: ["mgr", "scope"], queryFn: () => fetchScope(), retry: false });
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["mgr", "tracking", surveyId],
    queryFn: () => fetchTracking({ data: { surveyId } }),
    enabled: !!scope?.canAccess,
    retry: false,
  });

  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(t) ||
        (r.index_number ?? "").toLowerCase().includes(t) ||
        (r.department ?? "").toLowerCase().includes(t),
    );
  }, [rows, q]);
  const responded = filtered.filter((r) => r.responded_at);
  const pending = filtered.filter((r) => !r.responded_at);

  const downloadCsv = (subset: Row[], label: string) => {
    const header = ["full_name", "index_number", "department", "year", "responded_at"];
    const lines = [header.join(",")].concat(
      subset.map((r) =>
        header
          .map((k) => {
            const v = (r as any)[k] ?? "";
            const s = String(v).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
          })
          .join(","),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label}-${surveyId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!scope?.canAccess) return <p className="text-sm text-muted-foreground">Managers only.</p>;

  return (
    <div className="space-y-6">
      <Link to="/manage" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All surveys
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Survey tracking</p>
          <h1 className="mt-1 font-serif text-4xl leading-[0.95]">
            {responded.length} of {filtered.length} <em className="text-primary">responded.</em>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">Answer content stays confidential — this view only shows who has and hasn't completed the survey.</p>
        </div>
        <Input
          placeholder="Search name, index, department…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10 w-full max-w-xs rounded-xl"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading students…</p>
      ) : (
        <Tabs defaultValue="responded">
          <TabsList>
            <TabsTrigger value="responded">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Responded · {responded.length}
            </TabsTrigger>
            <TabsTrigger value="pending">
              <Circle className="mr-1 h-3 w-3" /> Pending · {pending.length}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="responded" className="mt-4">
            <StudentTable rows={responded} showRespondedAt />
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => downloadCsv(responded, "responded")}>
                <Download className="mr-1 h-3 w-3" /> Export CSV
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="pending" className="mt-4">
            <StudentTable rows={pending} />
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => downloadCsv(pending, "pending")}>
                <Download className="mr-1 h-3 w-3" /> Export CSV
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function StudentTable({ rows, showRespondedAt }: { rows: Row[]; showRespondedAt?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-foreground/15 bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left text-xs uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3">Index #</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Year</th>
            {showRespondedAt && <th className="px-4 py-3">Responded at</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.student_id} className="border-t border-foreground/10">
              <td className="px-4 py-2">{r.full_name || "—"}</td>
              <td className="px-4 py-2 font-mono text-xs">{r.index_number || <span className="text-muted-foreground">—</span>}</td>
              <td className="px-4 py-2">{r.department || "—"}</td>
              <td className="px-4 py-2">{r.year || "—"}</td>
              {showRespondedAt && (
                <td className="px-4 py-2 text-muted-foreground">
                  {r.responded_at ? new Date(r.responded_at).toLocaleString() : "—"}
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={showRespondedAt ? 5 : 4} className="px-4 py-8 text-center text-muted-foreground">No students.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
