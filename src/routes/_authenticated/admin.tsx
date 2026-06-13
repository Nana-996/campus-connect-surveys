import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldAlert, Check, Trash2, Power, UserPlus, UserMinus, Flag, FlagOff, Plus, GraduationCap, BarChart3, ClipboardList } from "lucide-react";
import {
  getAdminMetrics,
  listAdminUsers,
  grantCreditsToUser,
  setUserFlag,
  setUserAdminRole,
  setUserManagerRole,
  grantAdminByEmail,
  listAdminSurveys,
  setSurveyActive,
  deleteSurvey,
  listDisposableDomains,
  addDisposableDomain,
  removeDisposableDomain,
  listOpenFlags,
  resolveFlag,
} from "@/lib/admin.functions";
import {
  listLecturers,
  createLecturer,
  updateLecturer,
  deleteLecturer,
  createStandardEvaluation,
  listLecturerEvaluations,
} from "@/lib/lecturers.functions";
import { Briefcase } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
});

function Admin() {
  const fetchMetrics = useServerFn(getAdminMetrics);
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: () => fetchMetrics(),
    retry: false,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) {
    return (
      <div className="rounded-3xl border border-foreground/15 bg-card p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-3 font-serif text-3xl">Admins only.</p>
        <p className="mt-1 text-sm text-muted-foreground">Your account doesn't have the admin role.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-serif text-5xl leading-[0.95]">Control <em className="text-primary">center.</em></h1>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Users" value={metrics.users} />
          <Kpi label="Active surveys" value={`${metrics.activeSurveys}/${metrics.surveys}`} />
          <Kpi label="Responses (24h)" value={`${metrics.responses24h} / ${metrics.responses}`} />
          <Kpi label="Open flags" value={metrics.openFlags} accent={metrics.openFlags > 0} />
        </div>
      )}

      <Tabs defaultValue="users">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="flags">Flags</TabsTrigger>
          <TabsTrigger value="domains">Blocked domains</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4"><UsersPanel /></TabsContent>
        <TabsContent value="surveys" className="mt-4"><SurveysPanel /></TabsContent>
        <TabsContent value="flags" className="mt-4"><FlagsPanel /></TabsContent>
        <TabsContent value="domains" className="mt-4"><DomainsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-destructive/40 bg-destructive/5" : "border-foreground/15 bg-card"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
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
  const [search, setSearch] = useState("");
  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users", search],
    queryFn: () => fetchUsers({ data: { search: search || undefined } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  return (
    <div>
      <PromoteAdminByEmail onDone={refresh} />
      <div className="mb-3 flex gap-2">
        <Input placeholder="Search name, university, domain…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded-xl" />
      </div>
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
            {users.map((u: any) => (
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
                  {u.roles?.includes("manager") && <Badge variant="secondary">Manager</Badge>}
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
                    <Button size="sm" variant="outline" title={u.roles?.includes("manager") ? "Revoke manager" : "Make faculty manager"} onClick={async () => {
                      const isMgr = u.roles?.includes("manager");
                      if (!confirm(isMgr ? "Revoke manager role?" : `Grant manager role to ${u.full_name || u.id}? They will see who in ${u.university_domain} has responded to each survey.`)) return;
                      await setMgrRole({ data: { userId: u.id, grant: !isMgr } });
                      toast.success("Manager role updated"); refresh();
                    }}>
                      <Briefcase className="h-3 w-3" />
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
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No users.</td></tr>
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
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {surveys.map((s: any) => (
            <tr key={s.id} className="border-t border-foreground/10">
              <td className="px-3 py-2">{s.title}</td>
              <td className="px-3 py-2 capitalize">{s.tier}</td>
              <td className="px-3 py-2">{s.allow_general_respondents ? "Open" : s.university_domain}</td>
              <td className="px-3 py-2">{s.response_count}/{s.response_goal}</td>
              <td className="px-3 py-2">{s.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</td>
              <td className="px-3 py-2">
                <div className="flex justify-end gap-1">
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
          {surveys.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No surveys.</td></tr>}
        </tbody>
      </table>
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
