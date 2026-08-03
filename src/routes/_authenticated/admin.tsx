import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { SectionNav } from "@/components/SectionNav";
import { StatCard } from "@/components/StatCard";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShieldAlert, Check, Trash2, Power, UserPlus, UserMinus, Flag, FlagOff, Plus,
  GraduationCap, BarChart3, ClipboardList, LayoutDashboard, Building2, Users,
  FileText, Ban, ArrowRight, MessageSquare,
} from "lucide-react";
import {
  getAdminMetrics,
  listAdminUsers,
  grantCreditsToUser,
  setUserFlag,
  setUserAdminRole,
  setUserManagerRole,
  setUserFacultyRole,
  setUserUniversity,
  grantAdminByEmail,
  listAdminSurveys,
  setSurveyActive,
  deleteSurvey,
  grantSurveyTrackingAccess,
  revokeSurveyTrackingAccess,
  listSurveyTrackingAccess,
  listDisposableDomains,
  addDisposableDomain,
  removeDisposableDomain,
  listOpenFlags,
  resolveFlag,
} from "@/lib/admin.functions";
import {
  listLecturersForStaff,
  createLecturer,
  updateLecturer,
  deleteLecturer,
  createStandardEvaluation,
  listLecturerEvaluations,
} from "@/lib/lecturers.functions";
import { Briefcase } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
  head: () => ({
    meta: [
      { title: "Admin Console — CampusVerify" },
      { name: "description", content: "Manage schools, people, surveys and moderation across CampusVerify." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function Admin() {
  const fetchMetrics = useServerFn(getAdminMetrics);
  const [section, setSection] = useState("overview");
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: () => fetchMetrics(),
    retry: false,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) {
    const msg = (error as any)?.message ?? "";
    const isForbidden = /forbidden|admin only/i.test(msg);
    return (
      <div className="rounded-3xl border border-foreground/15 bg-card p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-3 font-serif text-3xl">
          {isForbidden ? "Admins only." : "Couldn't load admin."}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isForbidden
            ? "Your account doesn't have the admin role on this deployment."
            : msg || "Unknown error."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-serif text-5xl leading-[0.95]">Control <em className="text-primary">center.</em></h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Everything in one place — schools on the platform, the people in them, their surveys and moderation.
        </p>
      </div>

      <SectionNav
        value={section}
        onChange={setSection}
        items={[
          { value: "overview", label: "Overview", icon: LayoutDashboard },
          { value: "schools", label: "Schools", icon: Building2 },
          { value: "users", label: "People", icon: Users },
          { value: "surveys", label: "Surveys", icon: FileText },
          { value: "evaluations", label: "Lecturers", icon: GraduationCap },
          { value: "flags", label: "Flags", icon: Flag, badge: metrics?.openFlags },
          { value: "domains", label: "Blocked", icon: Ban },
        ]}
      />

      <div>
        {section === "overview" && <OverviewPanel metrics={metrics} onGo={setSection} />}
        {section === "schools" && <SchoolsPanel />}
        {section === "users" && <UsersPanel />}
        {section === "surveys" && <SurveysPanel />}
        {section === "evaluations" && <EvaluationsPanel />}
        {section === "flags" && <FlagsPanel />}
        {section === "domains" && <DomainsPanel />}
      </div>
    </div>
  );
}

// ---------------- Shared data hooks ----------------
function useAdminUsers() {
  const fetchUsers = useServerFn(listAdminUsers);
  return useQuery({
    queryKey: ["admin", "users", ""],
    queryFn: () => fetchUsers({ data: {} }),
  });
}

function useAdminSurveys() {
  const fetchSurveys = useServerFn(listAdminSurveys);
  return useQuery({ queryKey: ["admin", "surveys"], queryFn: () => fetchSurveys() });
}

// ---------------- Overview ----------------
function OverviewPanel({ metrics, onGo }: { metrics: any; onGo: (s: string) => void }) {
  const { data: users = [] } = useAdminUsers();
  const { data: surveys = [] } = useAdminSurveys();
  const schools = useSchools(users as any[], surveys as any[]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Schools" value={schools.length} icon={Building2} hint="Universities on the platform" onClick={() => onGo("schools")} />
        <StatCard label="People" value={metrics?.users ?? 0} icon={Users} hint="Registered accounts" onClick={() => onGo("users")} />
        <StatCard label="Surveys" value={`${metrics?.activeSurveys ?? 0}/${metrics?.surveys ?? 0}`} icon={FileText} hint="Active of total" onClick={() => onGo("surveys")} />
        <StatCard label="Responses 24h" value={metrics?.responses24h ?? 0} icon={MessageSquare} hint={`${metrics?.responses ?? 0} all time`} />
        <StatCard label="Open flags" value={metrics?.openFlags ?? 0} icon={Flag} accent={(metrics?.openFlags ?? 0) > 0} hint="Needs review" onClick={() => onGo("flags")} />
      </div>

      <section className="rounded-2xl border border-foreground/15 bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-foreground/10 px-4 py-3">
          <h2 className="font-serif text-xl">Top schools</h2>
          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => onGo("schools")}>
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
        {schools.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No schools yet.</p>
        ) : (
          <ul className="divide-y divide-foreground/10">
            {schools.slice(0, 5).map((s) => (
              <li key={s.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">{s.domain}</p>
                </div>
                <div className="flex gap-1.5 text-[10px]">
                  <Badge variant="secondary" className="rounded-full">{s.students} students</Badge>
                  <Badge variant="secondary" className="rounded-full">{s.surveys} surveys</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------- Schools ----------------
type School = {
  key: string;
  name: string;
  domain: string;
  total: number;
  students: number;
  general: number;
  faculty: number;
  admins: number;
  flagged: number;
  surveys: number;
  activeSurveys: number;
};

function useSchools(users: any[], surveys: any[]): School[] {
  return useMemo(() => {
    const map = new Map<string, School>();
    const keyOf = (name?: string, domain?: string) =>
      (domain || name || "unknown").toLowerCase();

    for (const u of users) {
      const k = keyOf(u.university_name, u.university_domain);
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          name: u.university_name || "Unspecified school",
          domain: u.university_domain || "—",
          total: 0, students: 0, general: 0, faculty: 0, admins: 0,
          flagged: 0, surveys: 0, activeSurveys: 0,
        });
      }
      const s = map.get(k)!;
      s.total += 1;
      if (u.user_type === "student") s.students += 1;
      else s.general += 1;
      if (u.roles?.includes("faculty") || u.roles?.includes("manager")) s.faculty += 1;
      if (u.roles?.includes("admin")) s.admins += 1;
      if (u.is_flagged) s.flagged += 1;
    }

    for (const sv of surveys) {
      const k = keyOf(undefined, sv.university_domain);
      const s = map.get(k);
      if (!s) continue;
      s.surveys += 1;
      if (sv.is_active) s.activeSurveys += 1;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [users, surveys]);
}

function SchoolsPanel() {
  const { data: users = [], isLoading } = useAdminUsers();
  const { data: surveys = [] } = useAdminSurveys();
  const schools = useSchools(users as any[], surveys as any[]);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("people");
  const [scope, setScope] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = schools.filter((s) =>
      !q || s.name.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q),
    );
    if (scope === "with-faculty") list = list.filter((s) => s.faculty > 0);
    if (scope === "no-faculty") list = list.filter((s) => s.faculty === 0);
    if (scope === "active") list = list.filter((s) => s.activeSurveys > 0);

    const sorted = [...list];
    if (sort === "people") sorted.sort((a, b) => b.total - a.total);
    if (sort === "students") sorted.sort((a, b) => b.students - a.students);
    if (sort === "surveys") sorted.sort((a, b) => b.surveys - a.surveys);
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [schools, search, sort, scope]);

  const totals = useMemo(
    () => ({
      students: schools.reduce((n, s) => n + s.students, 0),
      faculty: schools.reduce((n, s) => n + s.faculty, 0),
      surveys: schools.reduce((n, s) => n + s.surveys, 0),
    }),
    [schools],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Schools" value={schools.length} icon={Building2} />
        <StatCard label="Students" value={totals.students} icon={GraduationCap} />
        <StatCard label="Faculty staff" value={totals.faculty} icon={Briefcase} />
        <StatCard label="Surveys" value={totals.surveys} icon={FileText} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search school name or domain…"
        sort={sort}
        onSortChange={setSort}
        sortOptions={[
          { value: "people", label: "Most people" },
          { value: "students", label: "Most students" },
          { value: "surveys", label: "Most surveys" },
          { value: "name", label: "Name (A–Z)" },
        ]}
        filters={[
          {
            key: "scope",
            label: "Show",
            value: scope,
            onChange: setScope,
            options: [
              { value: "all", label: "All schools", count: schools.length },
              { value: "with-faculty", label: "Has faculty staff" },
              { value: "no-faculty", label: "No faculty staff" },
              { value: "active", label: "Has active surveys" },
            ],
          },
        ]}
        totalCount={schools.length}
        filteredCount={filtered.length}
        onClear={() => { setSearch(""); setScope("all"); }}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading schools…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/20 bg-card p-8 text-center text-sm text-muted-foreground">
          <Building2 className="mx-auto h-6 w-6" />
          <p className="mt-2">No schools match your filters.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((s) => (
            <li key={s.key} className="rounded-2xl border border-foreground/15 bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg leading-tight">{s.name}</p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">{s.domain}</p>
                </div>
                {s.flagged > 0 && <Badge variant="destructive" className="rounded-full">{s.flagged} flagged</Badge>}
              </div>
              <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
                <Metric label="People" value={s.total} />
                <Metric label="Students" value={s.students} />
                <Metric label="Faculty" value={s.faculty} />
                <Metric label="Surveys" value={`${s.activeSurveys}/${s.surveys}`} />
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-1 py-2">
      <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-serif text-base leading-none">{value}</dd>
    </div>
  );
}


// ---------------- Users ----------------
function UsersPanel() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listAdminUsers);
  const grant = useServerFn(grantCreditsToUser);
  const flag = useServerFn(setUserFlag);
  const setRole = useServerFn(setUserAdminRole);
  const setMgrRole = useServerFn(setUserManagerRole);
  const setFacRole = useServerFn(setUserFacultyRole);
  const setUni = useServerFn(setUserUniversity);
  const [search, setSearch] = useState("");
  const [userType, setUserType] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users", search],
    queryFn: () => fetchUsers({ data: { search: search || undefined } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    users.forEach((u: any) => counts.set(u.user_type ?? "—", (counts.get(u.user_type ?? "—") ?? 0) + 1));
    return [
      { value: "all", label: "All types", count: users.length },
      ...Array.from(counts.entries()).map(([v, c]) => ({ value: v, label: v, count: c })),
    ];
  }, [users]);

  const filtered = useMemo(() => {
    let list = users as any[];
    if (userType !== "all") list = list.filter((u) => (u.user_type ?? "—") === userType);
    if (roleFilter !== "all") {
      list = list.filter((u) =>
        roleFilter === "none"
          ? !u.roles?.length
          : u.roles?.includes(roleFilter),
      );
    }
    if (statusFilter === "flagged") list = list.filter((u) => u.is_flagged);
    if (statusFilter === "clean") list = list.filter((u) => !u.is_flagged);

    const sorted = [...list];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
        break;
      case "oldest":
        sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
        break;
      case "name":
        sorted.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
        break;
      case "credits-desc":
        sorted.sort((a, b) => (b.earned_credits ?? 0) - (a.earned_credits ?? 0));
        break;
      case "credits-asc":
        sorted.sort((a, b) => (a.earned_credits ?? 0) - (b.earned_credits ?? 0));
        break;
      case "university":
        sorted.sort((a, b) => (a.university_name ?? "").localeCompare(b.university_name ?? ""));
        break;
    }
    return sorted;
  }, [users, userType, roleFilter, statusFilter, sort]);

  return (
    <div>
      <PromoteAdminByEmail onDone={refresh} />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, university, domain…"
        sort={sort}
        onSortChange={setSort}
        sortOptions={[
          { value: "newest", label: "Newest first" },
          { value: "oldest", label: "Oldest first" },
          { value: "name", label: "Name (A–Z)" },
          { value: "university", label: "University (A–Z)" },
          { value: "credits-desc", label: "Credits (high → low)" },
          { value: "credits-asc", label: "Credits (low → high)" },
        ]}
        filters={[
          { key: "type", label: "Type", value: userType, onChange: setUserType, options: typeOptions },
          {
            key: "role",
            label: "Role",
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { value: "all", label: "All roles" },
              { value: "admin", label: "Admins" },
              { value: "manager", label: "Managers" },
              { value: "faculty", label: "Faculty" },
              { value: "none", label: "No role" },
            ],
          },
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "all", label: "All" },
              { value: "flagged", label: "Flagged" },
              { value: "clean", label: "Not flagged" },
            ],
          },
        ]}
        totalCount={users.length}
        filteredCount={filtered.length}
        onClear={() => {
          setSearch("");
          setUserType("all");
          setRoleFilter("all");
          setStatusFilter("all");
        }}
      />
      <div className="overflow-x-auto rounded-2xl border border-foreground/15 bg-card">
        <table className="w-full text-xs">
          <thead className="bg-secondary text-left uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">University</th>
              <th className="px-3 py-2">Credits</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: any) => (
              <tr key={u.id} className="border-t border-foreground/10">
                <td className="px-3 py-2">
                  <div className="font-medium">{u.full_name || "—"}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{u.id.slice(0, 8)}…</div>
                </td>
                <td className="px-3 py-2 capitalize">{u.user_type}</td>
                <td className="px-3 py-2">
                  <div>{u.university_name}</div>
                  <div className="text-[10px] text-muted-foreground">{u.university_domain}</div>
                </td>
                <td className="px-3 py-2">{u.earned_credits}</td>
                <td className="px-3 py-2">
                  {u.is_flagged && <Badge variant="destructive" className="mr-1">Flagged</Badge>}
                  {u.roles?.includes("admin") && <Badge className="mr-1">Admin</Badge>}
                  {u.roles?.includes("manager") && <Badge variant="secondary" className="mr-1">Manager</Badge>}
                  {u.roles?.includes("faculty") && <Badge variant="secondary">Faculty</Badge>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={async () => {
                      const v = prompt("Grant earned credits (negative to deduct):", "5");
                      if (!v) return;
                      const n = parseInt(v, 10);
                      if (!Number.isFinite(n)) return;
                      await grant({ data: { userId: u.id, wallet: "earned", amount: n, reason: "manual" } });
                      toast.success("Credits updated"); refresh();
                    }}>Credits</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      const reason = u.is_flagged ? undefined : prompt("Flag reason:", "abuse") ?? "abuse";
                      await flag({ data: { userId: u.id, flagged: !u.is_flagged, reason } });
                      toast.success(u.is_flagged ? "Unflagged" : "Flagged"); refresh();
                    }}>
                      {u.is_flagged ? <FlagOff className="h-3 w-3" /> : <Flag className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="outline" title={u.roles?.includes("manager") ? "Revoke faculty manager" : "Make faculty manager"} onClick={async () => {
                      const isMgr = u.roles?.includes("manager");
                      if (!confirm(isMgr ? "Revoke faculty manager role?" : `Grant faculty manager role to ${u.full_name || u.id}? They will track every survey for ${u.university_domain}.`)) return;
                      await setMgrRole({ data: { userId: u.id, grant: !isMgr } });
                      toast.success("Manager role updated"); refresh();
                    }}>
                      <Briefcase className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" title={u.roles?.includes("faculty") ? "Revoke faculty role" : "Grant faculty role"} onClick={async () => {
                      const isFac = u.roles?.includes("faculty");
                      if (isFac) {
                        if (!confirm("Revoke faculty role? They will lose access to their Faculty dashboard.")) return;
                        await setFacRole({ data: { userId: u.id, grant: false } });
                        toast.success("Faculty role updated"); refresh();
                        return;
                      }
                      // Granting: ensure a university is set (faculty tracking is university-scoped)
                      let uni = (u.university_name ?? "").trim();
                      if (!uni) {
                        const entered = prompt(`Which university does ${u.full_name || "this user"} belong to? Faculty officers can only track students at their own university.`, "")?.trim();
                        if (!entered) return;
                        try {
                          await setUni({ data: { userId: u.id, universityName: entered } });
                          uni = entered;
                        } catch (e: any) {
                          toast.error(e?.message ?? "Could not set university");
                          return;
                        }
                      }
                      if (!confirm(`Grant faculty role to ${u.full_name || u.id}? They will be able to track students at ${uni}.`)) return;
                      await setFacRole({ data: { userId: u.id, grant: true } });
                      toast.success("Faculty role updated"); refresh();
                    }}>
                      <GraduationCap className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      const isAdmin = u.roles?.includes("admin");
                      if (!confirm(isAdmin ? "Revoke admin role?" : "Grant admin role?")) return;
                      await setRole({ data: { userId: u.id, grant: !isAdmin } });
                      toast.success("Role updated"); refresh();
                    }}>
                      {u.roles?.includes("admin") ? <UserMinus className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No users match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PromoteAdminByEmail({ onDone }: { onDone: () => void }) {
  const promote = useServerFn(grantAdminByEmail);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mb-4 flex flex-col gap-2 rounded-2xl border border-foreground/15 bg-card p-3 sm:flex-row sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!email) return;
        setBusy(true);
        try {
          await promote({ data: { email } });
          toast.success(`${email} is now an admin`);
          setEmail("");
          onDone();
        } catch (err: any) {
          toast.error(err.message ?? "Could not promote user");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex-1">
        <Label htmlFor="promote-email" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Promote user to admin by email</Label>
        <Input id="promote-email" type="email" placeholder="person@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-10 rounded-xl" />
      </div>
      <Button type="submit" disabled={busy || !email}><UserPlus className="mr-1 h-3 w-3" /> {busy ? "Promoting…" : "Make admin"}</Button>
    </form>
  );
}

// ---------------- Surveys ----------------
function SurveysPanel() {
  const qc = useQueryClient();
  const fetchSurveys = useServerFn(listAdminSurveys);
  const setActive = useServerFn(setSurveyActive);
  const remove = useServerFn(deleteSurvey);
  const grantTracking = useServerFn(grantSurveyTrackingAccess);
  const { data: surveys = [] } = useQuery({ queryKey: ["admin", "surveys"], queryFn: () => fetchSurveys() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "surveys"] });

  return (
    <div className="overflow-x-auto rounded-2xl border border-foreground/15 bg-card">
      <table className="w-full text-xs">
        <thead className="bg-secondary text-left uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Tier</th>
            <th className="px-3 py-2">University</th>
            <th className="px-3 py-2">Responses</th>
              <th className="px-3 py-2">Faculty</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {surveys.map((s: any) => (
            <tr key={s.id} className="border-t border-foreground/10">
              <td className="px-3 py-2">
                <div className="font-medium">{s.title}</div>
                <div className="text-[10px] text-muted-foreground">{s.creator_name}</div>
              </td>
              <td className="px-3 py-2 capitalize">{s.tier}</td>
              <td className="px-3 py-2">
                <div>{s.allow_general_respondents ? "Open" : s.university_domain}</div>
                {(s.target_department || s.target_year) && (
                  <div className="text-[10px] text-muted-foreground">{[s.target_department, s.target_year].filter(Boolean).join(" · ")}</div>
                )}
              </td>
              <td className="px-3 py-2">{s.response_count}/{s.response_goal}</td>
              <td className="px-3 py-2">{s.tracking_grants ?? 0}</td>
              <td className="px-3 py-2">{s.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap justify-end gap-1">
                  <Link to="/manage/$surveyId" params={{ surveyId: s.id }}>
                    <Button size="sm" variant="outline"><BarChart3 className="h-3 w-3" /></Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={async () => {
                    const email = prompt("Faculty member email:", "");
                    if (!email) return;
                    await grantTracking({ data: { surveyId: s.id, email } });
                    toast.success("Tracking access granted"); refresh();
                  }}><Briefcase className="h-3 w-3" /></Button>
                  <SurveyTrackingAccessButton surveyId={s.id} />
                  <Button size="sm" variant="outline" onClick={async () => {
                    await setActive({ data: { surveyId: s.id, active: !s.is_active } });
                    toast.success(s.is_active ? "Deactivated" : "Activated"); refresh();
                  }}><Power className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    if (!confirm("Delete this survey and all its responses?")) return;
                    await remove({ data: { surveyId: s.id } });
                    toast.success("Deleted"); refresh();
                  }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </td>
            </tr>
          ))}
          {surveys.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No surveys.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function SurveyTrackingAccessButton({ surveyId }: { surveyId: string }) {
  const listAccess = useServerFn(listSurveyTrackingAccess);
  const revokeAccess = useServerFn(revokeSurveyTrackingAccess);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: grants = [], isLoading } = useQuery({
    queryKey: ["admin", "survey-tracking-access", surveyId],
    queryFn: () => listAccess({ data: { surveyId } }),
    enabled: open,
  });

  if (!open) {
    return <Button size="sm" variant="outline" onClick={() => setOpen(true)}><UserMinus className="h-3 w-3" /></Button>;
  }

  return (
    <div className="w-72 rounded-2xl border border-foreground/15 bg-background p-3 text-left shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Faculty access</p>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : grants.length === 0 ? (
        <p className="text-xs text-muted-foreground">No faculty assigned.</p>
      ) : (
        <ul className="space-y-2">
          {grants.map((g: any) => (
            <li key={g.user_id} className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-medium">{g.full_name || g.email}</p>
                <p className="truncate text-[10px] text-muted-foreground">{g.email}</p>
              </div>
              <Button size="sm" variant="outline" onClick={async () => {
                await revokeAccess({ data: { surveyId, facultyUserId: g.user_id } });
                toast.success("Tracking access revoked");
                qc.invalidateQueries({ queryKey: ["admin", "survey-tracking-access", surveyId] });
                qc.invalidateQueries({ queryKey: ["admin", "surveys"] });
              }}><Trash2 className="h-3 w-3" /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------- Flags ----------------
function FlagsPanel() {
  const qc = useQueryClient();
  const fetchFlags = useServerFn(listOpenFlags);
  const resolve = useServerFn(resolveFlag);
  const { data: flags = [] } = useQuery({ queryKey: ["admin", "flags"], queryFn: () => fetchFlags() });
  if (flags.length === 0)
    return <div className="rounded-2xl border border-dashed border-foreground/30 bg-card p-8 text-center text-sm text-muted-foreground">No open flags.</div>;
  return (
    <ul className="space-y-3">
      {flags.map((f: any) => (
        <li key={f.id} className="rounded-2xl border border-foreground/15 bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">{f.type}</p>
              <p className="mt-1 font-mono text-xs">user: {f.user_id}</p>
              <pre className="mt-1 overflow-x-auto rounded bg-secondary p-2 text-[11px]">{JSON.stringify(f.details, null, 2)}</pre>
              <p className="mt-1 text-[11px] text-muted-foreground">{new Date(f.created_at).toLocaleString()}</p>
            </div>
            <Button size="sm" variant="outline" onClick={async () => {
              await resolve({ data: { id: f.id } });
              toast.success("Cleared");
              qc.invalidateQueries({ queryKey: ["admin", "flags"] });
            }}><Check className="mr-1 h-3 w-3" /> Clear</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}


// ---------------- Domains ----------------
function DomainsPanel() {
  const qc = useQueryClient();
  const fetchDomains = useServerFn(listDisposableDomains);
  const add = useServerFn(addDisposableDomain);
  const remove = useServerFn(removeDisposableDomain);
  const [domain, setDomain] = useState("");
  const { data: domains = [] } = useQuery({ queryKey: ["admin", "domains"], queryFn: () => fetchDomains() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "domains"] });

  return (
    <div>
      <form
        className="mb-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!domain) return;
          try {
            await add({ data: { domain } });
            toast.success("Domain blocked");
            setDomain(""); refresh();
          } catch (err: any) { toast.error(err.message); }
        }}
      >
        <Input placeholder="e.g. mailinator.com" value={domain} onChange={(e) => setDomain(e.target.value)} className="h-10 rounded-xl" />
        <Button type="submit"><Plus className="mr-1 h-3 w-3" /> Block</Button>
      </form>
      <ul className="divide-y divide-foreground/10 rounded-2xl border border-foreground/15 bg-card">
        {domains.map((d: any) => (
          <li key={d.domain} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="font-mono">{d.domain}</span>
            <Button size="sm" variant="outline" onClick={async () => {
              await remove({ data: { domain: d.domain } });
              toast.success("Removed"); refresh();
            }}><Trash2 className="h-3 w-3" /></Button>
          </li>
        ))}
        {domains.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No blocked domains.</li>}
      </ul>
    </div>
  );
}

// ---------------- Lecturer evaluations ----------------
type Lecturer = {
  id: string;
  full_name: string;
  department: string | null;
  title: string | null;
  email: string | null;
  university_domain: string;
};

function EvaluationsPanel() {
  const qc = useQueryClient();
  const fetchLecturers = useServerFn(listLecturersForStaff);
  const { data: lecturers = [], isLoading } = useQuery({
    queryKey: ["admin", "lecturers"],
    queryFn: () => fetchLecturers(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "lecturers"] });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-foreground/15 bg-card p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">About this tab</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the lecturers in your faculty, then issue an official end-of-semester evaluation. The
          standard form asks five rating questions plus two open-comment questions. Results are
          private to admins and managers of the lecturer's campus.
        </p>
      </div>

      <LecturerForm onDone={refresh} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : lecturers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/20 bg-card p-8 text-center text-sm text-muted-foreground">
          <GraduationCap className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2">No lecturers yet. Add one above to start running evaluations.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {lecturers.map((l: Lecturer) => (
            <LecturerRow key={l.id} lecturer={l} onChanged={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LecturerForm({ onDone, initial, onCancel }: {
  onDone: () => void;
  initial?: Lecturer;
  onCancel?: () => void;
}) {
  const create = useServerFn(createLecturer);
  const update = useServerFn(updateLecturer);
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [busy, setBusy] = useState(false);

  const editing = !!initial;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setBusy(true);
    try {
      if (editing) {
        await update({ data: { id: initial!.id, full_name: fullName, department, title, email } });
        toast.success("Lecturer updated");
      } else {
        await create({ data: { full_name: fullName, department, title, email } });
        toast.success("Lecturer added");
        setFullName(""); setDepartment(""); setTitle(""); setEmail("");
      }
      onDone();
      onCancel?.();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-foreground/15 bg-card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {editing ? "Edit lecturer" : "Add a lecturer"}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="lec-name" className="text-xs">Full name *</Label>
          <Input id="lec-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Ama Boateng" />
        </div>
        <div>
          <Label htmlFor="lec-dept" className="text-xs">Department</Label>
          <Input id="lec-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Computer Science" />
        </div>
        <div>
          <Label htmlFor="lec-title" className="text-xs">Title</Label>
          <Input id="lec-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Lecturer" />
        </div>
        <div>
          <Label htmlFor="lec-email" className="text-xs">Email (optional)</Label>
          <Input id="lec-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lecturer@university.edu.gh" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={busy} className="rounded-full">
          {editing ? "Save" : <><Plus className="mr-1 h-4 w-4" /> Add lecturer</>}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} className="rounded-full">Cancel</Button>
        )}
      </div>
    </form>
  );
}

function LecturerRow({ lecturer, onChanged }: { lecturer: Lecturer; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const remove = useServerFn(deleteLecturer);
  const startStandard = useServerFn(createStandardEvaluation);

  if (editing) {
    return (
      <li>
        <LecturerForm initial={lecturer} onDone={onChanged} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-foreground/15 bg-card">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="font-serif text-lg leading-tight">
            {lecturer.title ? `${lecturer.title} ` : ""}
            {lecturer.full_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {lecturer.department || "No department"}
            {lecturer.email ? ` · ${lecturer.email}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="rounded-full"
            onClick={async () => {
              const course = prompt("Course code (optional, e.g. CSCD403):", "") ?? "";
              if (!confirm(`Issue a standard evaluation for ${lecturer.full_name}${course ? " (" + course + ")" : ""}? It will appear in students' feeds for 30 days.`)) return;
              try {
                const r = await startStandard({ data: { lecturer_id: lecturer.id, course_code: course || null } });
                toast.success("Evaluation published");
                onChanged();
                setExpanded(true);
                // Optional: open the survey in a new tab
                window.open(`/survey/${r.id}/analyze`, "_blank");
              } catch (e: any) {
                toast.error(e.message ?? "Failed to publish");
              }
            }}
          >
            <ClipboardList className="mr-1 h-3 w-3" /> Standard form
          </Button>
          <Link
            to="/create"
            search={{ lecturer: lecturer.id } as any}
            className="inline-flex"
          >
            <Button size="sm" variant="outline" className="rounded-full">Custom</Button>
          </Link>
          <Button size="sm" variant="outline" onClick={() => setExpanded((v) => !v)}>
            <BarChart3 className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (!confirm(`Remove ${lecturer.full_name}? Past evaluations stay in the system.`)) return;
              await remove({ data: { id: lecturer.id } });
              toast.success("Removed");
              onChanged();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {expanded && <LecturerEvaluationsList lecturerId={lecturer.id} />}
    </li>
  );
}

function LecturerEvaluationsList({ lecturerId }: { lecturerId: string }) {
  const fetchEvals = useServerFn(listLecturerEvaluations);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "lecturer-evals", lecturerId],
    queryFn: () => fetchEvals({ data: { lecturer_id: lecturerId } }),
  });

  if (isLoading) return <p className="px-4 pb-4 text-xs text-muted-foreground">Loading…</p>;
  if (data.length === 0) {
    return <p className="px-4 pb-4 text-xs text-muted-foreground">No evaluations yet.</p>;
  }
  return (
    <ul className="border-t border-foreground/10">
      {data.map((e: any) => (
        <li key={e.survey_id} className="flex flex-wrap items-center gap-3 border-t border-foreground/5 px-4 py-2 text-xs first:border-t-0">
          <div className="flex-1 min-w-[180px]">
            <p className="font-medium">{e.title}</p>
            <p className="text-[10px] text-muted-foreground">
              {e.course_code ? `${e.course_code} · ` : ""}
              {e.response_count}/{e.response_goal} responses
              {e.is_active ? "" : " · ended"}
            </p>
          </div>
          <Link to="/survey/$id/analyze" params={{ id: e.survey_id }}>
            <Button size="sm" variant="outline" className="rounded-full">Open results</Button>
          </Link>
        </li>
      ))}
    </ul>
  );
}
