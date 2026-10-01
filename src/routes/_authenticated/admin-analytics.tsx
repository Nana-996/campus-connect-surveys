import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowUpRight, BarChart3,
  Building2, Clock, Coins, Download, FileText, LayoutDashboard, RefreshCw,
  School, ShieldAlert, Users, WalletCards,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { SectionNav } from "@/components/SectionNav";
import { getAdminAnalytics, type AdminAnalyticsData, type AnalyticsPeriod } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/admin-analytics")({
  component: AdminAnalytics,
  errorComponent: ({ error }) => <ErrorCard message={error instanceof Error ? error.message : "Unknown error."} />,
  head: () => ({
    meta: [
      { title: "Analytics — CampusVerify Admin" },
      { name: "description", content: "Private platform growth, activity, survey and revenue analytics for the CampusVerify app owner." },
      { property: "og:title", content: "Analytics — CampusVerify Admin" },
      { property: "og:description", content: "Private platform growth, activity, survey and revenue analytics for the CampusVerify app owner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 7, label: "7 days" }, { value: 30, label: "30 days" },
  { value: 90, label: "90 days" }, { value: 0, label: "All time" },
];

const SECTION_ITEMS = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "people", label: "People & schools", icon: Users },
  { value: "surveys", label: "Surveys", icon: FileText },
  { value: "revenue", label: "Revenue & credits", icon: WalletCards },
];

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const forbidden = /forbidden|owner only/i.test(message);
  return (
    <div className="rounded-2xl border border-foreground/15 bg-card p-8 text-center">
      <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
      <p className="mt-3 font-serif text-3xl">{forbidden ? "Private administration area." : "Couldn't load analytics."}</p>
      <p className="mt-1 text-sm text-muted-foreground">{forbidden ? "Only the CampusVerify app owner can open this page." : message}</p>
      {onRetry && !forbidden && <Button className="mt-4" variant="outline" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" /> Try again</Button>}
    </div>
  );
}

function Panel({ title, icon: Icon, children, hint, action }: { title: string; icon: typeof Activity; children: React.ReactNode; hint?: string; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-foreground/15 bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><h2 className="font-serif text-xl">{title}</h2></div>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Delta({ current, previous, suffix = "" }: { current: number; previous: number | null; suffix?: string }) {
  if (previous === null) return <span>All recorded activity</span>;
  if (previous === 0) return <span>{current > 0 ? "New activity this period" : "No change"}</span>;
  const value = Math.round(((current - previous) / previous) * 100);
  const UpIcon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={`inline-flex items-center gap-1 ${value >= 0 ? "text-primary" : "text-destructive"}`}><UpIcon className="h-3 w-3" /> {Math.abs(value)}% {value >= 0 ? "up" : "down"}{suffix}</span>;
}

function Metric({ label, value, description, icon: Icon, delta, accent }: { label: string; value: string | number; description: string; icon: typeof Activity; delta?: React.ReactNode; accent?: boolean }) {
  return (
    <article className={`min-h-32 rounded-2xl border p-4 ${accent ? "border-destructive/35 bg-destructive/5" : "border-foreground/15 bg-card"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${accent ? "text-destructive" : "text-primary"}`} />
      </div>
      <p className="mt-3 font-serif text-3xl tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      {delta && <p className="mt-2 text-xs font-medium">{delta}</p>}
    </article>
  );
}

function formatDate(value: string, bucket: "day" | "month") {
  return new Date(value).toLocaleDateString(undefined, bucket === "month" ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" });
}

function fmtNumber(value: number) { return new Intl.NumberFormat().format(value); }
function fmtMoney(value: number) { return new Intl.NumberFormat(undefined, { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(value); }
function titleCase(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

function TrendChart({ data, bucket, lines }: { data: AdminAnalyticsData["trend"]; bucket: "day" | "month"; lines: ("signups" | "surveys" | "responses")[] }) {
  const chartData = data.map((row) => ({ ...row, label: formatDate(row.period, bucket) }));
  const labels = { signups: "New people", surveys: "New surveys", responses: "Responses" };
  return (
    <div className="h-72 w-full" role="img" aria-label={`${lines.map((line) => labels[line]).join(", ")} trend over the selected period`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {lines.map((line, index) => <Line key={line} type="monotone" dataKey={line} name={labels[line]} stroke={index === 0 ? "var(--primary)" : index === 1 ? "var(--accent)" : "var(--highlight-foreground)"} strokeWidth={2.5} dot={data.length <= 14} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function RankedBars({ rows, dataKey = "count", empty = "No data in this view." }: { rows: Record<string, string | number | boolean>[]; dataKey?: string; empty?: string }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  const height = Math.max(220, rows.length * 42);
  return (
    <div style={{ height }} role="img" aria-label="Ranked comparison chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 18, left: 12, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <YAxis type="category" dataKey="label" width={112} tick={{ fill: "var(--foreground)", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(value) => fmtNumber(Number(value))} />
          <Bar dataKey={dataKey} fill="var(--primary)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyChart() { return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No activity in this period.</p>; }

function downloadCsv(data: AdminAnalyticsData, periodLabel: string) {
  const rows: (string | number | boolean | null)[][] = [
    ["CampusVerify analytics", periodLabel], ["Generated", data.generatedAt], [],
    ["Summary", "Value"], ...Object.entries(data.summary), [],
    ["Trend period", "New people", "New surveys", "Responses", "Revenue GHS"],
    ...data.trend.map((r) => [r.period, r.signups, r.surveys, r.responses, r.revenueGhs]), [],
    ["School", "Domain", "People", "Surveys", "Responses", "Partner"],
    ...data.schools.map((r) => [r.label, r.domain, r.users, r.surveys, r.responses, r.partner]), [],
    ["Survey tier", "Count"], ...data.surveyTiers.map((r) => [r.label, r.count]), [],
    ["Revenue source", "GHS", "Transactions"], ...data.revenue.bySource.map((r) => [r.label, r.ghs, r.transactions]), [],
    ["Credit reason", "Issued", "Spent"], ...data.credits.byReason.map((r) => [r.label, r.issued, r.spent]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `campusverify-analytics-${data.period.days || "all-time"}-days.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function SurveyWatchlist({ data, kind }: { data: AdminAnalyticsData; kind: "expiring" | "stalled" }) {
  const rows = kind === "expiring" ? data.expiringSoon : data.stalled;
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">{kind === "expiring" ? "Nothing is closing in the next three days." : "Every live survey has received a response."}</p>;
  return <ul className="divide-y divide-foreground/10">{rows.map((row) => (
    <li key={row.id} className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
      <div className="min-w-0"><p className="truncate text-sm font-medium">{row.title}</p><p className="text-xs text-muted-foreground">{"creator_name" in row ? `${row.creator_name || "Unknown owner"} · ${row.university_domain}` : `${row.response_count} of ${row.response_goal || "—"} responses`}</p></div>
      <p className="text-xs text-muted-foreground">{new Date("expires_at" in row ? row.expires_at : row.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>
    </li>
  ))}</ul>;
}

function AdminAnalytics() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [section, setSection] = useState("overview");
  const fetchAnalytics = useServerFn(getAdminAnalytics);
  const query = useQuery({ queryKey: ["admin", "analytics", period], queryFn: () => fetchAnalytics({ data: { days: period } }), retry: 1, staleTime: 60_000 });
  const periodLabel = PERIODS.find((item) => item.value === period)?.label ?? "Selected period";

  const revenueTrend = useMemo(() => query.data?.trend.map((row) => ({ ...row, label: formatDate(row.period, query.data?.period.bucket ?? "day") })) ?? [], [query.data]);

  if (query.isPending) return <div className="space-y-4"><div className="h-12 w-72 animate-pulse rounded-xl bg-foreground/10" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-foreground/10" />)}</div></div>;
  if (query.error || !query.data) return <ErrorCard message={query.error instanceof Error ? query.error.message : "No data returned."} onRetry={() => query.refetch()} />;

  const data = query.data;
  const s = data.summary;
  const totalAttention = s.openFlags + s.stalledSurveys + s.expiringSoon;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Admin console</Link>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">App owner</p>
          <h1 className="mt-1 font-serif text-4xl leading-none sm:text-5xl">Platform <em className="text-primary">analytics.</em></h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Growth, engagement, survey health and income in one read-only view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCsv(data, periodLabel)}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /> Refresh</Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-foreground/15 bg-card p-2">
        <div className="flex flex-wrap gap-1" aria-label="Reporting period">{PERIODS.map((item) => <Button key={item.value} size="sm" variant={period === item.value ? "default" : "ghost"} onClick={() => setPeriod(item.value)}>{item.label}</Button>)}</div>
        <p className="px-2 text-xs text-muted-foreground">{formatDate(data.period.start, data.period.bucket)}–{formatDate(data.period.end, data.period.bucket)}</p>
      </div>

      <SectionNav value={section} onChange={setSection} items={SECTION_ITEMS} />

      {section === "overview" && <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="New people" value={fmtNumber(s.newUsers)} description={`${fmtNumber(s.totalUsers)} registered overall`} icon={Users} delta={<Delta current={s.newUsers} previous={s.previousNewUsers} />} />
          <Metric label="Active people" value={fmtNumber(s.activeUsers)} description="Published or answered in this period" icon={Activity} delta={<Delta current={s.activeUsers} previous={s.previousActiveUsers} />} />
          <Metric label="New surveys" value={fmtNumber(s.newSurveys)} description={`${fmtNumber(s.liveSurveys)} live now`} icon={FileText} delta={<Delta current={s.newSurveys} previous={s.previousNewSurveys} />} />
          <Metric label="Responses" value={fmtNumber(s.responses)} description={`${fmtNumber(s.totalResponses)} collected overall`} icon={BarChart3} delta={<Delta current={s.responses} previous={s.previousResponses} />} />
        </div>
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <Panel title="Platform activity" icon={Activity} hint={`${periodLabel} · hover or tap a point for exact figures`}>{data.trend.some((row) => row.signups || row.surveys || row.responses) ? <TrendChart data={data.trend} bucket={data.period.bucket} lines={["responses", "signups", "surveys"]} /> : <EmptyChart />}</Panel>
          <Panel title="Needs attention" icon={AlertTriangle} hint="Current platform health">
            <div className="space-y-3">
              {[{ label: "Open reports", value: s.openFlags }, { label: "Live surveys with no responses", value: s.stalledSurveys }, { label: "Closing within three days", value: s.expiringSoon }].map((item) => <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg bg-secondary p-3"><span className="text-sm">{item.label}</span><strong className="font-serif text-2xl tabular-nums">{item.value}</strong></div>)}
              <p className="text-xs text-muted-foreground">{totalAttention ? `${totalAttention} items may need review.` : "Nothing currently needs attention."}</p>
            </div>
          </Panel>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Goal completion" value={`${s.goalCompletion}%`} description="All responses against all survey targets" icon={Activity} />
          <Metric label="Targets reached" value={fmtNumber(s.completedTargets)} description="Surveys at or above their response goal" icon={BarChart3} />
          <Metric label="Participating schools" value={fmtNumber(s.participatingSchools)} description={`${fmtNumber(s.partnerSchools)} active partnerships`} icon={Building2} />
          <Metric label="Operating revenue" value={fmtMoney(data.revenue.ghs)} description={`${fmtNumber(data.revenue.transactions)} successful transactions`} icon={WalletCards} delta={<Delta current={data.revenue.ghs} previous={data.revenue.previousGhs} />} />
        </div>
      </div>}

      {section === "people" && <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Registered people" value={fmtNumber(s.totalUsers)} description="All accounts" icon={Users} />
          <Metric label="Students" value={fmtNumber(s.students)} description={`${s.totalUsers ? Math.round(s.students / s.totalUsers * 100) : 0}% of accounts`} icon={School} />
          <Metric label="General / Researcher" value={fmtNumber(s.general)} description={`${s.totalUsers ? Math.round(s.general / s.totalUsers * 100) : 0}% of accounts`} icon={Users} />
          <Metric label="Active people" value={fmtNumber(s.activeUsers)} description={`Published or answered in ${periodLabel.toLowerCase()}`} icon={Activity} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Sign-up trend" icon={Users} hint={`New accounts · ${periodLabel}`}>{data.trend.some((row) => row.signups) ? <TrendChart data={data.trend} bucket={data.period.bucket} lines={["signups"]} /> : <EmptyChart />}</Panel>
          <Panel title="Account mix" icon={Users} hint="All registered accounts"><RankedBars rows={data.accountTypes} /></Panel>
        </div>
        <Panel title="Leading schools" icon={Building2} hint="Ranked by registered people; partnership status shown separately">
          {data.schools.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-foreground/15 text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="pb-3 font-semibold">School</th><th className="pb-3 text-right font-semibold">People</th><th className="pb-3 text-right font-semibold">Surveys</th><th className="pb-3 text-right font-semibold">Responses</th><th className="pb-3 text-right font-semibold">Status</th></tr></thead><tbody>{data.schools.map((row) => <tr key={row.domain} className="border-b border-foreground/10 last:border-0"><td className="py-3"><p className="font-medium">{row.label}</p><p className="text-xs text-muted-foreground">{row.domain}</p></td><td className="py-3 text-right tabular-nums">{fmtNumber(row.users)}</td><td className="py-3 text-right tabular-nums">{fmtNumber(row.surveys)}</td><td className="py-3 text-right tabular-nums">{fmtNumber(row.responses)}</td><td className="py-3 text-right"><span className={`rounded-full px-2 py-1 text-xs ${row.partner ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>{row.partner ? "Partner" : "Not partnered"}</span></td></tr>)}</tbody></table></div> : <EmptyChart />}
        </Panel>
      </div>}

      {section === "surveys" && <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="All surveys" value={fmtNumber(s.totalSurveys)} description={`${fmtNumber(s.newSurveys)} created in ${periodLabel.toLowerCase()}`} icon={FileText} />
          <Metric label="Live surveys" value={fmtNumber(s.liveSurveys)} description="Currently open for responses" icon={Activity} />
          <Metric label="Responses" value={fmtNumber(s.responses)} description={`Collected in ${periodLabel.toLowerCase()}`} icon={BarChart3} />
          <Metric label="Targets reached" value={fmtNumber(s.completedTargets)} description={`${s.goalCompletion}% overall goal completion`} icon={BarChart3} />
        </div>
        <Panel title="Survey and response activity" icon={BarChart3} hint={periodLabel}>{data.trend.some((row) => row.surveys || row.responses) ? <TrendChart data={data.trend} bucket={data.period.bucket} lines={["responses", "surveys"]} /> : <EmptyChart />}</Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Survey tiers" icon={BarChart3} hint="All surveys"><RankedBars rows={data.surveyTiers.map((r) => ({ ...r, label: titleCase(r.label) }))} /></Panel>
          <Panel title="Visibility" icon={Activity} hint="Who surveys are open to"><RankedBars rows={data.surveyVisibility.map((r) => ({ ...r, label: titleCase(r.label) }))} /></Panel>
          <Panel title="Closing within three days" icon={Clock} hint="Live surveys approaching their deadline"><SurveyWatchlist data={data} kind="expiring" /></Panel>
          <Panel title="No responses yet" icon={AlertTriangle} hint="Live surveys that may need help"><SurveyWatchlist data={data} kind="stalled" /></Panel>
        </div>
      </div>}

      {section === "revenue" && <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Operating revenue" value={fmtMoney(data.revenue.ghs)} description="Successful credit, boost and slot purchases" icon={WalletCards} delta={<Delta current={data.revenue.ghs} previous={data.revenue.previousGhs} />} />
          <Metric label="Transactions" value={fmtNumber(data.revenue.transactions)} description={`Successful in ${periodLabel.toLowerCase()}`} icon={Activity} />
          <Metric label="Credits sold" value={fmtNumber(data.credits.sold)} description="From successful credit-pack purchases" icon={Coins} />
          <Metric label="Current balances" value={fmtNumber(data.credits.earnedBalance + data.credits.paidBalance)} description={`${fmtNumber(data.credits.earnedBalance)} earned · ${fmtNumber(data.credits.paidBalance)} paid`} icon={Coins} />
        </div>
        <Panel title="Revenue trend" icon={WalletCards} hint={`${periodLabel} · Ghana cedis`}>
          {revenueTrend.some((row) => row.revenueGhs) ? <div className="h-72 w-full" role="img" aria-label="Revenue trend in Ghana cedis"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueTrend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval="preserveStartEnd" /><YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickFormatter={(v) => `GH₵${v}`} /><Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(value) => fmtMoney(Number(value))} /><Area type="monotone" dataKey="revenueGhs" name="Revenue" stroke="var(--primary)" fill="var(--accent)" fillOpacity={0.35} strokeWidth={2.5} /></AreaChart></ResponsiveContainer></div> : <EmptyChart />}
        </Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Revenue sources" icon={WalletCards} hint="Successful transactions only"><RankedBars rows={data.revenue.bySource.map((r) => ({ ...r, count: r.ghs }))} /></Panel>
          <Panel title="Credit movement" icon={Coins} hint={periodLabel}>
            <div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-secondary p-3"><p className="text-xs text-muted-foreground">Issued</p><p className="mt-1 font-serif text-2xl">{fmtNumber(data.credits.issued)}</p></div><div className="rounded-lg bg-secondary p-3"><p className="text-xs text-muted-foreground">Spent</p><p className="mt-1 font-serif text-2xl">{fmtNumber(data.credits.spent)}</p></div></div>
            <div className="mt-4 space-y-2">{data.credits.byReason.map((row) => <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-foreground/10 pb-2 text-sm last:border-0"><span>{titleCase(row.label)}</span><span className="tabular-nums text-primary">+{fmtNumber(row.issued)}</span><span className="tabular-nums text-muted-foreground">−{fmtNumber(row.spent)}</span></div>)}</div>
          </Panel>
        </div>
        <p className="text-xs text-muted-foreground">Donations are intentionally excluded from operating revenue.</p>
      </div>}

      <p className="text-center text-[11px] text-muted-foreground">Updated {new Date(data.generatedAt).toLocaleString()} · full-platform aggregates · read-only</p>
    </div>
  );
}