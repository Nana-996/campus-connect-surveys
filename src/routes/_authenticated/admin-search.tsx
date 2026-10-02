import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, RefreshCw, ArrowLeft, MousePointerClick, Eye, Percent, Crosshair,
  Globe, FileText, AlertTriangle, CheckCircle2,
} from "lucide-react";
import {
  getSearchConsoleStatus,
  selectSearchConsoleProperty,
  refreshSearchConsoleSnapshot,
  type SearchConsoleSnapshot,
} from "@/lib/search-console.functions";

export const Route = createFileRoute("/_authenticated/admin-search")({
  component: AdminSearchPage,
  head: () => ({
    meta: [
      { title: "Search visibility — CampusVerify" },
      { name: "description", content: "Private CampusVerify search performance." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function Delta({ current, previous, invert = false }: { current: number; previous: number | null | undefined; invert?: boolean }) {
  if (previous == null || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  if (!isFinite(pct)) return null;
  const good = invert ? pct < 0 : pct > 0;
  return (
    <span className={`text-xs font-semibold ${good ? "text-primary" : "text-destructive"}`}>
      {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, previous, invert }: {
  icon: typeof Eye; label: string; value: string; previous?: number | null; currentRaw?: number; invert?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      {previous != null && <Delta current={Number(value.replace(/[^0-9.-]/g, ""))} previous={previous} invert={invert} />}
    </div>
  );
}

type TableRow = { clicks: number; impressions: number; ctr: number; position: number } & Record<string, unknown>;

function DataTable({ title, icon: Icon, rows, nameKey }: {
  title: string;
  icon: typeof Globe;
  rows: TableRow[];
  nameKey: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">No data yet — Google reports search data with a delay of a few days, and a new site needs time to gather impressions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2 font-medium">{nameKey === "query" ? "Search term" : "Page"}</th>
                <th className="px-3 py-2 text-right font-medium">Clicks</th>
                <th className="px-3 py-2 text-right font-medium">Impressions</th>
                <th className="px-3 py-2 text-right font-medium">CTR</th>
                <th className="px-5 py-2 text-right font-medium">Position</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 25).map((r, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="max-w-[280px] truncate px-5 py-2.5">{String(r[nameKey])}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{fmt(r.clicks)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt(r.impressions)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{(r.ctr * 100).toFixed(1)}%</td>
                  <td className="px-5 py-2.5 text-right text-muted-foreground">{r.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SnapshotView({ snapshot }: { snapshot: SearchConsoleSnapshot }) {
  const { totals, previousTotals } = snapshot;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={MousePointerClick} label="Clicks" value={fmt(totals.clicks)} previous={previousTotals?.clicks} />
        <MetricCard icon={Eye} label="Impressions" value={fmt(totals.impressions)} previous={previousTotals?.impressions} />
        <MetricCard icon={Percent} label="Click-through rate" value={`${(totals.ctr * 100).toFixed(1)}%`} previous={previousTotals ? previousTotals.ctr : null} />
        <MetricCard icon={Crosshair} label="Avg. position" value={totals.position > 0 ? totals.position.toFixed(1) : "—"} previous={previousTotals?.position} invert />
      </div>

      <p className="text-xs text-muted-foreground">
        Last 28 days ({snapshot.period.start} → {snapshot.period.end}) · compared with the 28 days before · property {snapshot.siteUrl}
      </p>

      <DataTable title="Top search terms" icon={Search} rows={snapshot.queries} nameKey="query" />
      <DataTable title="Top pages" icon={FileText} rows={snapshot.pages} nameKey="page" />

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Sitemaps</h2>
        </div>
        {snapshot.sitemaps.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No sitemaps reported for this property.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {snapshot.sitemaps.map((s) => (
              <li key={s.path} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span className="truncate font-medium">{s.path}</span>
                <span className="flex items-center gap-2">
                  {s.errors > 0 ? (
                    <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {s.errors} errors</Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> OK</Badge>
                  )}
                  {s.lastDownloaded && (
                    <span className="text-xs text-muted-foreground">read {s.lastDownloaded.slice(0, 10)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AdminSearchPage() {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getSearchConsoleStatus);
  const runSelect = useServerFn(selectSearchConsoleProperty);
  const runRefresh = useServerFn(refreshSearchConsoleSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "search-console"],
    queryFn: () => fetchStatus(),
  });

  const forbidden = error?.message?.includes("Forbidden");

  const handleSelect = async (siteUrl: string) => {
    setSelecting(siteUrl);
    try {
      await runSelect({ data: { siteUrl } });
      toast.success("Search Console property saved.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "search-console"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that property.");
    } finally {
      setSelecting(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await runRefresh();
      toast.success("Search data refreshed.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "search-console"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading search data…</div>;
  }

  if (forbidden) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="font-serif text-3xl">Private administration area.</p>
          <p className="mt-2 text-sm text-muted-foreground">Only the CampusVerify app owner can open this page.</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="font-serif text-3xl">Couldn't load search data.</p>
          <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Please try again."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">App owner</p>
          <h1 className="mt-1 font-serif text-5xl leading-[0.95]">Search <em className="text-primary">visibility.</em></h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            How campus-verify.live performs on Google, straight from Search Console. Refreshed daily.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Admin</Link>
          </Button>
          {data.state === "ok" && (
            <Button size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh now"}
            </Button>
          )}
        </div>
      </div>

      {data.state === "no_property" && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-serif text-2xl">No verified property covers this site.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The connected Google account has no verified Search Console property for campus-verify.live.
            Verify the site in Search Console first, then return here.
          </p>
        </div>
      )}

      {data.state === "needs_property" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="font-serif text-2xl">Choose which property to track.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            More than one verified Search Console property covers campus-verify.live. Pick the one this page should report on:
          </p>
          <div className="mt-4 space-y-2">
            {data.candidates.map((c) => (
              <button
                key={c}
                onClick={() => handleSelect(c)}
                disabled={selecting !== null}
                className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-left text-sm font-medium transition hover:border-primary disabled:opacity-50"
              >
                {c}
                {selecting === c && <RefreshCw className="h-4 w-4 animate-spin" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {data.state === "ok" && !data.snapshot && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-serif text-2xl">No data pulled yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Press "Refresh now" to pull the first snapshot from Google. After that, it refreshes automatically once a day.
          </p>
        </div>
      )}

      {data.state === "ok" && data.snapshot && (
        <>
          <p className="text-xs text-muted-foreground">
            Last refreshed {new Date(data.snapshot.refreshedAt).toLocaleString()}.
          </p>
          <SnapshotView snapshot={data.snapshot} />
        </>
      )}
    </div>
  );
}
