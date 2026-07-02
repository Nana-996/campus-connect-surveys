import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, UserPlus, UserMinus, Eye, ShieldAlert, X, GraduationCap, CheckCircle2, Clock, ListChecks } from "lucide-react";
import {
  getMyFacultyScope,
  searchStudentByIndex,
  addToWatchlist,
  removeFromWatchlist,
  listWatchlist,
  getStudentDetail,
  setMyFacultyUniversity,
} from "@/lib/faculty.functions";

export const Route = createFileRoute("/_authenticated/faculty")({
  component: FacultyDashboard,
});

function FacultyDashboard() {
  const fetchScope = useServerFn(getMyFacultyScope);
  const { data: scope, isLoading, error } = useQuery({
    queryKey: ["faculty", "scope"],
    queryFn: () => fetchScope(),
    retry: false,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (error || !scope?.isFaculty) {
    return (
      <div className="rounded-3xl border border-foreground/15 bg-card p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-3 font-serif text-3xl">Faculty only.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This dashboard is only available to users with the faculty role. Ask an admin to grant you access.
        </p>
      </div>
    );
  }

  const hasUni = !!(scope.university_name && scope.university_name.trim());

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Faculty</p>
        <h1 className="mt-1 font-serif text-5xl leading-[0.95]">My <em className="text-primary">roster.</em></h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {hasUni ? (
            <>Build your personal watchlist of students at <span className="font-semibold">{scope.university_name}</span>. Only students you add appear here.</>
          ) : (
            <>Set your university below to start tracking students. Faculty tracking is scoped to a single university.</>
          )}
        </p>
      </div>

      {hasUni ? (
        <>
          <SearchAddPanel />
          <RosterPanel />
        </>
      ) : (
        <SetUniversityPanel />
      )}
    </div>
  );
}

function SetUniversityPanel() {
  const qc = useQueryClient();
  const setUni = useServerFn(setMyFacultyUniversity);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = name.trim();
    if (v.length < 2) return;
    setBusy(true);
    try {
      await setUni({ data: { universityName: v } });
      toast.success("University saved");
      qc.invalidateQueries({ queryKey: ["faculty", "scope"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save university");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-3xl border border-foreground/15 bg-card p-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-primary" />
        <h2 className="font-serif text-2xl">Set your university</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        This is the university whose students you will track. Once saved, only an admin can change it.
      </p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. University of Ghana"
          className="h-10 rounded-xl"
          maxLength={120}
        />
        <Button type="submit" disabled={busy || name.trim().length < 2}>
          {busy ? "Saving…" : "Save university"}
        </Button>
      </form>
    </section>
  );
}

function SearchAddPanel() {
  const qc = useQueryClient();
  const search = useServerFn(searchStudentByIndex);
  const add = useServerFn(addToWatchlist);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof search>> | null>(null);
  const [busy, setBusy] = useState(false);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    try {
      const rows = await search({ data: { indexNumber: query.trim() } });
      setResults(rows);
      if (!rows.length) toast.info("No student found with that index number");
    } catch (err: any) {
      toast.error(err.message ?? "Search failed");
    } finally {
      setBusy(false);
    }
  };

  const onAdd = async (studentId: string) => {
    try {
      await add({ data: { studentId } });
      toast.success("Added to your watchlist");
      setResults(null);
      setQuery("");
      qc.invalidateQueries({ queryKey: ["faculty", "watchlist"] });
    } catch (err: any) {
      toast.error(err.message ?? "Could not add student");
    }
  };

  return (
    <section className="rounded-3xl border border-foreground/15 bg-card p-5">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-serif text-2xl">Add a student</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Search by index number. Only students from your university can be added.
      </p>
      <form onSubmit={onSearch} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. CS/2021/045"
          className="h-10 rounded-xl"
          maxLength={32}
        />
        <Button type="submit" disabled={busy || !query.trim()}>
          <Search className="h-3 w-3" /> {busy ? "Searching…" : "Search"}
        </Button>
      </form>

      {results && results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((r) => (
            <div key={r.student_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-foreground/10 bg-background p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.full_name || "Unnamed student"}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{r.index_number}</span>
                  {r.department ? ` · ${r.department}` : ""}
                  {r.year ? ` · ${r.year}` : ""}
                </p>
              </div>
              {r.already_on_watchlist ? (
                <Badge variant="secondary">Already on watchlist</Badge>
              ) : (
                <Button size="sm" onClick={() => onAdd(r.student_id)}>
                  <UserPlus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RosterPanel() {
  const qc = useQueryClient();
  const fetchRoster = useServerFn(listWatchlist);
  const remove = useServerFn(removeFromWatchlist);
  const { data: roster = [], isLoading } = useQuery({
    queryKey: ["faculty", "watchlist"],
    queryFn: () => fetchRoster(),
  });
  const [viewing, setViewing] = useState<{ id: string; name: string } | null>(null);

  const removeMut = useMutation({
    mutationFn: (studentId: string) => remove({ data: { studentId } }),
    onSuccess: () => {
      toast.success("Removed from watchlist");
      qc.invalidateQueries({ queryKey: ["faculty", "watchlist"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not remove"),
  });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-serif text-2xl">Watchlist ({roster.length})</h2>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading roster…</p>
      ) : roster.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-foreground/20 bg-card p-8 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Your watchlist is empty. Search for a student above to add them.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-foreground/15 bg-card">
          <table className="w-full text-xs">
            <thead className="bg-secondary text-left uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Responded</th>
                <th className="px-3 py-2">Pending</th>
                <th className="px-3 py-2">Last activity</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => (
                <tr key={s.student_id} className="border-t border-foreground/10">
                  <td className="px-3 py-2">
                    <div className="font-medium">{s.full_name || "Unnamed"}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{s.index_number || "—"}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{s.department || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{s.year || ""}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-primary" /> {s.surveys_responded}
                      <span className="text-muted-foreground">/ {s.surveys_available}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {s.surveys_pending > 0 ? (
                      <Badge variant="destructive">{s.surveys_pending} pending</Badge>
                    ) : (
                      <Badge variant="secondary">All caught up</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {s.last_activity ? new Date(s.last_activity).toLocaleString() : <span className="text-muted-foreground">Never</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setViewing({ id: s.student_id, name: s.full_name || s.index_number || "Student" })}>
                        <Eye className="h-3 w-3" /> View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Remove ${s.full_name || s.index_number} from your watchlist?`)) {
                            removeMut.mutate(s.student_id);
                          }
                        }}
                      >
                        <UserMinus className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && <StudentDetailModal studentId={viewing.id} name={viewing.name} onClose={() => setViewing(null)} />}
    </section>
  );
}

function StudentDetailModal({ studentId, name, onClose }: { studentId: string; name: string; onClose: () => void }) {
  const fetchDetail = useServerFn(getStudentDetail);
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["faculty", "student", studentId],
    queryFn: () => fetchDetail({ data: { studentId } }),
  });

  const respondedCount = rows.filter((r) => r.responded).length;
  const total = rows.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-t-3xl border border-foreground/15 bg-background sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-foreground/10 p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Survey activity</p>
            <h3 className="font-serif text-2xl">{name}</h3>
            {total > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                <ListChecks className="mr-1 inline h-3 w-3" />
                {respondedCount} of {total} relevant surveys completed
              </p>
            )}
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">{(error as any).message}</p>}
          {!isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No surveys match this student's department/year yet.</p>
          )}
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.survey_id} className="rounded-2xl border border-foreground/10 bg-card p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      by {r.creator_name}
                      {r.target_department ? ` · ${r.target_department}` : ""}
                      {r.target_year ? ` · ${r.target_year}` : ""}
                      {!r.is_active ? " · inactive" : ""}
                    </p>
                  </div>
                  {r.responded ? (
                    <Badge className="shrink-0">
                      <CheckCircle2 className="h-3 w-3" /> Responded
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="shrink-0">
                      <Clock className="h-3 w-3" /> Pending
                    </Badge>
                  )}
                </div>
                {r.responded && (
                  <div className="mt-2 grid grid-cols-2 gap-3 text-[11px] text-muted-foreground sm:grid-cols-3">
                    <div>
                      <span className="font-semibold text-foreground">When: </span>
                      {r.responded_at ? new Date(r.responded_at).toLocaleString() : "—"}
                    </div>
                    {r.quality_score != null && (
                      <div>
                        <span className="font-semibold text-foreground">Quality: </span>
                        {Math.round(Number(r.quality_score) * 100)}%
                      </div>
                    )}
                    {r.duration_ms != null && (
                      <div>
                        <span className="font-semibold text-foreground">Time: </span>
                        {Math.max(1, Math.round(Number(r.duration_ms) / 1000))}s
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
