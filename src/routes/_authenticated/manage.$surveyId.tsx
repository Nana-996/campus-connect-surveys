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
import { FilterBar } from "@/components/FilterBar";

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
  const fetchResponses = useServerFn(getSurveyResponsesForManager);
  const fetchQuestions = useServerFn(getSurveyQuestionsForManager);
  const { data: scope } = useQuery({ queryKey: ["mgr", "scope"], queryFn: () => fetchScope(), retry: false });
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["mgr", "tracking", surveyId],
    queryFn: () => fetchTracking({ data: { surveyId } }),
    enabled: !!scope?.canAccess,
    retry: false,
  });
  const { data: responses = [] } = useQuery({
    queryKey: ["mgr", "responses", surveyId],
    queryFn: () => fetchResponses({ data: { surveyId } }),
    enabled: !!scope?.isAdmin || !!scope?.isManager,
    retry: false,
  });
  const { data: surveyMeta } = useQuery({
    queryKey: ["mgr", "questions", surveyId],
    queryFn: () => fetchQuestions({ data: { surveyId } }),
    enabled: !!scope?.canAccess,
    retry: false,
  });
  const questions = surveyMeta?.questions ?? [];

  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [year, setYear] = useState("all");
  const [sort, setSort] = useState("name");

  const deptOptions = useMemo(() => {
    const c = new Map<string, number>();
    rows.forEach((r) => {
      const k = r.department ?? "—";
      c.set(k, (c.get(k) ?? 0) + 1);
    });
    return [
      { value: "all", label: "All departments", count: rows.length },
      ...Array.from(c.entries()).sort().map(([v, count]) => ({ value: v, label: v, count })),
    ];
  }, [rows]);

  const yearOptions = useMemo(() => {
    const c = new Map<string, number>();
    rows.forEach((r) => {
      const k = r.year ?? "—";
      c.set(k, (c.get(k) ?? 0) + 1);
    });
    return [
      { value: "all", label: "All years", count: rows.length },
      ...Array.from(c.entries()).sort().map(([v, count]) => ({ value: v, label: v, count })),
    ];
  }, [rows]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (t && !(
        r.full_name?.toLowerCase().includes(t) ||
        (r.index_number ?? "").toLowerCase().includes(t) ||
        (r.department ?? "").toLowerCase().includes(t)
      )) return false;
      if (dept !== "all" && (r.department ?? "—") !== dept) return false;
      if (year !== "all" && (r.year ?? "—") !== year) return false;
      return true;
    });
    const sorted = [...list];
    switch (sort) {
      case "name":
        sorted.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
        break;
      case "index":
        sorted.sort((a, b) => (a.index_number ?? "").localeCompare(b.index_number ?? ""));
        break;
      case "responded-newest":
        sorted.sort((a, b) => (+new Date(b.responded_at ?? 0)) - (+new Date(a.responded_at ?? 0)));
        break;
      case "responded-oldest":
        sorted.sort((a, b) => {
          const av = a.responded_at ? +new Date(a.responded_at) : Infinity;
          const bv = b.responded_at ? +new Date(b.responded_at) : Infinity;
          return av - bv;
        });
        break;
    }
    return sorted;
  }, [rows, q, dept, year, sort]);
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

  const canSeeAnswers = !!scope?.isAdmin || !!scope?.isManager;

  if (!scope?.canAccess) return <p className="text-sm text-muted-foreground">Tracking access required.</p>;

  return (
    <div className="space-y-6">
      <Link to="/manage" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All surveys
      </Link>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Survey tracking</p>
        <h1 className="mt-1 font-serif text-4xl leading-[0.95]">
          {responded.length} of {filtered.length} <em className="text-primary">responded.</em>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">Track responders, pending students, departments, and years for this survey.</p>
      </div>

      <FilterBar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search name, index, department…"
        sort={sort}
        onSortChange={setSort}
        sortOptions={[
          { value: "name", label: "Name (A–Z)" },
          { value: "index", label: "Index number" },
          { value: "responded-newest", label: "Responded (newest)" },
          { value: "responded-oldest", label: "Responded (oldest)" },
        ]}
        filters={[
          { key: "dept", label: "Dept", value: dept, onChange: setDept, options: deptOptions },
          { key: "year", label: "Year", value: year, onChange: setYear, options: yearOptions },
        ]}
        totalCount={rows.length}
        filteredCount={filtered.length}
        onClear={() => { setQ(""); setDept("all"); setYear("all"); }}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading students…</p>
      ) : (
        <Tabs defaultValue={canSeeAnswers ? "responses" : "responded"}>
          <TabsList>
            {canSeeAnswers && (
              <TabsTrigger value="responses">
                <MessageSquare className="mr-1 h-3 w-3" /> Responses · {responses.length}
              </TabsTrigger>
            )}
            <TabsTrigger value="responded">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Responded · {responded.length}
            </TabsTrigger>
            <TabsTrigger value="pending">
              <Circle className="mr-1 h-3 w-3" /> Pending · {pending.length}
            </TabsTrigger>
          </TabsList>
          {canSeeAnswers && (
            <TabsContent value="responses" className="mt-4">
              <ResponsesList responses={responses} questions={questions} />
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const header = ["respondent", "type", "index_number", "department", "year", "submitted_at", ...questions.map((q) => q.text)];
                    const lines = [header.join(",")].concat(
                      responses.map((r) =>
                        [
                          r.respondent_label,
                          r.user_type ?? "",
                          r.index_number ?? "",
                          r.department ?? "",
                          r.year ?? "",
                          r.created_at,
                          ...questions.map((q) => r.answers?.[q.id] ?? ""),
                        ]
                          .map((v) => {
                            const s = String(v ?? "").replace(/"/g, '""');
                            return /[",\n]/.test(s) ? `"${s}"` : s;
                          })
                          .join(","),
                      ),
                    );
                    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `responses-${surveyId.slice(0, 8)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="mr-1 h-3 w-3" /> Export responses CSV
                </Button>
              </div>
            </TabsContent>
          )}
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

function ResponsesList({
  responses,
  questions,
}: {
  responses: Array<{
    response_id: string;
    created_at: string;
    quality_score: number | null;
    duration_ms: number | null;
    answers: Record<string, string>;
    is_identified: boolean;
    respondent_label: string;
    full_name: string | null;
    index_number: string | null;
    department: string | null;
    year: string | null;
    user_type: string | null;
  }>;
  questions: Array<{ id: string; text: string; type: string }>;
}) {
  if (responses.length === 0) {
    return <p className="rounded-2xl border border-foreground/15 bg-card p-6 text-center text-sm text-muted-foreground">No responses yet.</p>;
  }
  return (
    <div className="space-y-3">
      {responses.map((r) => (
        <details key={r.response_id} className="group rounded-2xl border border-foreground/15 bg-card p-4 open:shadow-sm">
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{r.respondent_label}</span>
              {r.is_identified ? (
                <>
                  {r.index_number && <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px]">{r.index_number}</span>}
                  {r.department && <span className="text-xs text-muted-foreground">{r.department}</span>}
                  {r.year && <span className="text-xs text-muted-foreground">· {r.year}</span>}
                </>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Anonymous</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
          </summary>
          <div className="mt-4 space-y-3 border-t border-foreground/10 pt-3">
            {questions.map((q) => (
              <div key={q.id}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{q.text}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{r.answers?.[q.id] || <span className="text-muted-foreground">—</span>}</p>
              </div>
            ))}
          </div>
        </details>
      ))}
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
