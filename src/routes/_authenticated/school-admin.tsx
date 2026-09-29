import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ShieldAlert, Users, FileText, Building2, CalendarClock } from "lucide-react";
import { getMySchoolAdminOverview } from "@/lib/school-admin.functions";
import { StatCard } from "@/components/StatCard";
import { SectionNav } from "@/components/SectionNav";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/school-admin")({
  head: () => ({
    meta: [
      { title: "School Admin Portal — CampusVerify" },
      { name: "description", content: "Manage your school's students, surveys and departments on CampusVerify." },
      { property: "og:title", content: "School Admin Portal — CampusVerify" },
      { property: "og:description", content: "Your school's students, active surveys and department breakdown." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchoolAdminPage,
  errorComponent: () => (
    <div className="rounded-3xl border border-foreground/15 bg-card p-8 text-center">
      <p className="font-serif text-2xl">Something went wrong</p>
      <p className="mt-2 text-sm text-muted-foreground">Please refresh and try again.</p>
    </div>
  ),
});

function SchoolAdminPage() {
  const fetchOverview = useServerFn(getMySchoolAdminOverview);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["school-admin", "overview"],
    queryFn: () => fetchOverview(),
    retry: 1,
  });
  const [tab, setTab] = useState("students");
  const [q, setQ] = useState("");

  const students = useMemo(() => {
    const s = data?.students ?? [];
    const t = q.trim().toLowerCase();
    if (!t) return s;
    return s.filter((x) =>
      [x.full_name, x.department, x.index_number, x.year].some((v) => (v ?? "").toLowerCase().includes(t)),
    );
  }, [data, q]);

  if (isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (isError)
    return (
      <div className="rounded-3xl border border-foreground/15 bg-card p-8 text-center">
        <p className="font-serif text-2xl">Couldn't load your school</p>
        <button onClick={() => refetch()} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button>
      </div>
    );
  if (!data?.isSchoolAdmin || !data.school)
    return (
      <div className="rounded-3xl border border-foreground/15 bg-card p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-3 font-serif text-3xl">School admins only.</p>
        <p className="mt-1 text-sm text-muted-foreground">Ask CampusVerify to set you as your school's admin.</p>
      </div>
    );

  const surveys = data.surveys ?? [];
  const depts = data.departments ?? [];
  const live = surveys.filter((s) => s.is_active && new Date(s.expires_at) > new Date());
  const maxDept = Math.max(1, ...depts.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">School admin portal</p>
        <h1 className="mt-1 font-serif text-5xl leading-[0.95]">{data.school.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.school.domain} · Plan: <span className="font-semibold capitalize text-foreground">{data.school.status}</span>
          {data.school.validUntil && <> · until {new Date(data.school.validUntil).toLocaleDateString()}</>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Students" value={data.students?.length ?? 0} icon={Users} />
        <StatCard label="Live surveys" value={live.length} hint={`${surveys.length} total`} icon={FileText} />
        <StatCard label="Departments" value={depts.length} icon={Building2} />
        <StatCard label="Responses" value={surveys.reduce((a, s) => a + s.response_count, 0)} icon={CalendarClock} />
      </div>

      <SectionNav
        items={[
          { value: "students", label: "Students", icon: Users },
          { value: "surveys", label: "Surveys", icon: FileText },
          { value: "departments", label: "Departments", icon: Building2 },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "students" && (
        <div className="space-y-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, department, index…" className="max-w-sm" />
          <div className="overflow-x-auto rounded-2xl border border-foreground/15 bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wider">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Index</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Year</th><th className="px-4 py-3">Joined</th></tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-foreground/10">
                    <td className="px-4 py-3 font-medium">{s.full_name}{s.is_flagged && <span className="ml-2 text-xs text-destructive">flagged</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.index_number ?? "—"}</td>
                    <td className="px-4 py-3">{s.department || "—"}</td>
                    <td className="px-4 py-3">{s.year || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {students.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No students found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "surveys" && (
        <ul className="space-y-3">
          {surveys.length === 0 && <li className="rounded-2xl border border-foreground/15 bg-card p-6 text-center text-muted-foreground">No surveys at your school yet.</li>}
          {surveys.map((s) => {
            const isLive = s.is_active && new Date(s.expires_at) > new Date();
            const pct = Math.min(100, Math.round((s.response_count / Math.max(1, s.response_goal)) * 100));
            return (
              <li key={s.id} className="rounded-2xl border border-foreground/15 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-serif text-lg leading-tight">{s.title}</p>
                  <span className={`text-xs font-semibold ${isLive ? "text-primary" : "text-muted-foreground"}`}>{isLive ? "Live" : "Closed"}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.response_count}/{s.response_goal} responses{s.target_department ? ` · ${s.target_department}` : ""} · ends {new Date(s.expires_at).toLocaleDateString()}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "departments" && (
        <div className="space-y-2 rounded-2xl border border-foreground/15 bg-card p-4">
          {depts.length === 0 && <p className="text-center text-sm text-muted-foreground">No students yet.</p>}
          {depts.map((d) => (
            <div key={d.department}>
              <div className="flex justify-between text-sm"><span>{d.department}</span><span className="tabular-nums">{d.count}</span></div>
              <div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${(d.count / maxDept) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
