import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, ArrowLeft, BarChart3, Building2, Clock,
  Coins, FileText, RefreshCw, ShieldAlert, Users,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { getAdminAnalytics } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/admin-analytics")({
  component: AdminAnalytics,
  errorComponent: ({ error }) => (
    <ErrorCard message={(error as any)?.message ?? "Unknown error."} />
  ),
  head: () => ({
    meta: [
      { title: "Analytics — CampusVerify Admin" },
      { name: "description", content: "Read-only platform analytics for CampusVerify administrators." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const forbidden = /forbidden|owner only/i.test(message);
  return (
    <div className="rounded-3xl border border-foreground/15 bg-card p-8 text-center">
      <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
      <p className="mt-3 font-serif text-3xl">
        {forbidden ? "Private administration area." : "Couldn't load analytics."}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {forbidden ? "Only the CampusVerify app owner can open this page." : /verify app-owner access/i.test(message) ? "We couldn't confirm app-owner access. Please try again." : message}
      </p>
      {onRetry && !forbidden && (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      )}
    </div>
  );
}

function Panel({
  title, icon: Icon, children, hint,
}: { title: string; icon: any; children: React.ReactNode; hint?: string }) {
  return (
    <section className="rounded-2xl border border-foreground/15 bg-card p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-serif text-xl">{title}</h2>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Sparkbars({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-24 items-end gap-[3px]">
      {data.map((d) => (
        <div
          key={d.day}
          title={`${d.day}: ${d.count}`}
          className="flex-1 rounded-t bg-primary/70"
          style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function RankList({ rows, empty }: { rows: { label: string; count: number }[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate">{r.label}</span>
            <span className="tabular-nums text-muted-foreground">{r.count}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-foreground/10">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function AdminAnalytics() {
  const fetchAnalytics = useServerFn(getAdminAnalytics);
  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => fetchAnalytics(),
    retry: 1,
    staleTime: 60_000,
  });

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-foreground/10" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-foreground/10" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorCard message={(error as any)?.message ?? "No data returned."} onRetry={() => refetch()} />;
  }

  const t = data.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Admin console
          </Link>
          <h1 className="mt-1 font-serif text-4xl leading-[0.95] sm:text-5xl">
            Platform <em className="text-primary">analytics.</em>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Read-only view of activity, growth and health. Nothing here changes any data.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="People" value={t.users} hint={`${t.students} students · ${t.general} general`} icon={Users} />
        <StatCard label="Surveys" value={t.surveys} hint={`${t.activeSurveys} live · ${t.expiredSurveys} expired`} icon={FileText} />
        <StatCard label="Responses" value={t.responses} hint={`${t.responses24h} in the last 24h`} icon={BarChart3} />
        <StatCard label="Goal completion" value={`${t.goalCompletion}%`} hint="Responses against targets" icon={Activity} />
        <StatCard label="Credits issued (30d)" value={data.credits.issued30d} icon={Coins} />
        <StatCard label="Credits spent (30d)" value={data.credits.spent30d} icon={Coins} />
        <StatCard label="Credit balances" value={data.credits.earnedBalance + data.credits.paidBalance} hint={`${data.credits.earnedBalance} earned · ${data.credits.paidBalance} paid`} icon={Coins} />
        <StatCard label="Needs attention" value={t.openFlags + t.flagged} hint={`${t.openFlags} open flags · ${t.flagged} flagged people`} icon={AlertTriangle} accent={t.openFlags + t.flagged > 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Sign-ups" icon={Users} hint="Last 30 days">
          <Sparkbars data={data.signupsByDay} />
        </Panel>
        <Panel title="Surveys created" icon={FileText} hint="Last 30 days">
          <Sparkbars data={data.surveysByDay} />
        </Panel>
        <Panel title="Top universities" icon={Building2} hint="By registered people">
          <RankList rows={data.topUniversities} empty="No universities recorded yet." />
        </Panel>
        <Panel title="Survey types" icon={BarChart3} hint="Across all surveys">
          <RankList rows={data.byTier} empty="No surveys yet." />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Closing within 3 days" icon={Clock} hint="Live surveys about to expire">
          {data.expiringSoon.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing closing soon.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.expiringSoon.map((s) => (
                <li key={s.id} className="flex items-baseline justify-between gap-3 border-b border-foreground/10 pb-2 last:border-0">
                  <span className="truncate">{s.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {s.response_count}/{s.response_goal || "—"} · {fmtDate(s.expires_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Live surveys with no responses" icon={AlertTriangle} hint="Good candidates for a nudge">
          {data.stalled.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every live survey has at least one response.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.stalled.map((s) => (
                <li key={s.id} className="flex items-baseline justify-between gap-3 border-b border-foreground/10 pb-2 last:border-0">
                  <span className="truncate">
                    {s.title}
                    <span className="block text-xs text-muted-foreground">
                      {s.creator_name || "Unknown"}{s.university_domain ? ` · ${s.university_domain}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(s.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Generated {new Date(data.generatedAt).toLocaleString()} · read-only
      </p>
    </div>
  );
}
