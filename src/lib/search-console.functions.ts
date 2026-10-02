import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAppOwnerClaims } from "@/lib/app-owner";

/**
 * Google Search Console integration for the app owner.
 * All Google calls happen server-side through the connector gateway.
 * Data is stored as a daily snapshot; the admin page reads the snapshot.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const TARGET_URL = "https://campus-verify.live/";

const requireOwner = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    if (isAppOwnerClaims(context.claims as Record<string, unknown>)) return next();
    throw new Error("Forbidden: app owner only");
  });

type SiteEntry = { siteUrl: string; permissionLevel?: string };

export type SearchConsoleSnapshot = {
  refreshedAt: string;
  siteUrl: string;
  period: { start: string; end: string };
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  previousTotals: { clicks: number; impressions: number; ctr: number; position: number } | null;
  daily: { date: string; clicks: number; impressions: number; ctr: number; position: number }[];
  queries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
  pages: { page: string; clicks: number; impressions: number; ctr: number; position: number }[];
  sitemaps: { path: string; lastSubmitted: string | null; lastDownloaded: string | null; errors: number; warnings: number }[];
};

function gatewayHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connectionKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovableKey || !connectionKey) {
    throw new Error("Search Console connection is not configured yet.");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
  };
}

function coversTarget(siteUrl: string, target: URL) {
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = siteUrl.slice("sc-domain:".length).toLowerCase();
    const host = target.hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  }
  try {
    const prefix = new URL(siteUrl);
    return target.href.startsWith(prefix.href);
  } catch {
    return false;
  }
}

async function listVerifiedProperties(): Promise<SiteEntry[]> {
  const res = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers: gatewayHeaders() });
  if (!res.ok) throw new Error(`Could not list Search Console properties [${res.status}]: ${await res.text()}`);
  const { siteEntry = [] } = (await res.json()) as { siteEntry?: SiteEntry[] };
  const target = new URL(TARGET_URL);
  return siteEntry.filter(
    (e) => e.permissionLevel !== "siteUnverifiedUser" && coversTarget(e.siteUrl, target),
  );
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function queryAnalytics(siteUrl: string, startDate: string, endDate: string, dimensions: string[], rowLimit = 1000) {
  const res = await fetch(
    `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { ...gatewayHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit }),
    },
  );
  if (res.status === 403) {
    throw new Error("The connected Google account cannot access the selected Search Console property.");
  }
  if (!res.ok) throw new Error(`Search Console query failed [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as { rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[] };
  return json.rows ?? [];
}

function sumTotals(rows: { clicks: number; impressions: number; ctr: number; position: number }[]) {
  const clicks = rows.reduce((a, r) => a + r.clicks, 0);
  const impressions = rows.reduce((a, r) => a + r.impressions, 0);
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const position = rows.length > 0 ? rows.reduce((a, r) => a + r.position * r.impressions, 0) / Math.max(impressions, 1) : 0;
  return { clicks, impressions, ctr, position };
}

async function buildSnapshot(siteUrl: string): Promise<SearchConsoleSnapshot> {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2); // Search Console data lags ~2 days
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  const prevEnd = new Date(start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - 27);

  const [dailyRows, queryRows, pageRows, prevRows] = await Promise.all([
    queryAnalytics(siteUrl, isoDate(start), isoDate(end), ["date"]),
    queryAnalytics(siteUrl, isoDate(start), isoDate(end), ["query"], 50),
    queryAnalytics(siteUrl, isoDate(start), isoDate(end), ["page"], 50),
    queryAnalytics(siteUrl, isoDate(prevStart), isoDate(prevEnd), ["date"]).catch(() => []),
  ]);

  let sitemaps: SearchConsoleSnapshot["sitemaps"] = [];
  try {
    const res = await fetch(
      `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`,
      { headers: gatewayHeaders() },
    );
    if (res.ok) {
      const json = (await res.json()) as { sitemap?: { path: string; lastSubmitted?: string; lastDownloaded?: string; errors?: string; warnings?: string }[] };
      sitemaps = (json.sitemap ?? []).map((s) => ({
        path: s.path,
        lastSubmitted: s.lastSubmitted ?? null,
        lastDownloaded: s.lastDownloaded ?? null,
        errors: Number(s.errors ?? 0),
        warnings: Number(s.warnings ?? 0),
      }));
    }
  } catch {
    sitemaps = [];
  }

  return {
    refreshedAt: new Date().toISOString(),
    siteUrl,
    period: { start: isoDate(start), end: isoDate(end) },
    totals: sumTotals(dailyRows),
    previousTotals: prevRows.length > 0 ? sumTotals(prevRows) : null,
    daily: dailyRows.map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    queries: queryRows.map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    pages: pageRows.map((r) => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    sitemaps,
  };
}

async function storeSnapshot(snapshot: SearchConsoleSnapshot) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("search_console_snapshots")
    .upsert({ id: true, snapshot, refreshed_at: snapshot.refreshedAt } as never);
  if (error) throw new Error(error.message);
}

export type SearchConsoleStatus =
  | { state: "needs_property"; candidates: string[] }
  | { state: "no_property" }
  | { state: "ok"; siteUrl: string; snapshot: SearchConsoleSnapshot | null };

export const getSearchConsoleStatus = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async (): Promise<SearchConsoleStatus> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("search_console_settings")
      .select("site_url")
      .eq("id", true)
      .maybeSingle();

    const matches = await listVerifiedProperties();
    const selected = settings?.site_url as string | null | undefined;

    if (!selected) {
      if (matches.length === 0) return { state: "no_property" };
      if (matches.length === 1) {
        // Auto-select the sole match.
        await supabaseAdmin
          .from("search_console_settings")
          .update({ site_url: matches[0].siteUrl, updated_at: new Date().toISOString() } as never)
          .eq("id", true);
      } else {
        return { state: "needs_property", candidates: matches.map((m) => m.siteUrl) };
      }
    } else if (!matches.some((m) => m.siteUrl === selected)) {
      return { state: "needs_property", candidates: matches.map((m) => m.siteUrl) };
    }

    const siteUrl = (selected ?? matches[0]?.siteUrl) as string;
    // Keep the daily cron job's shared secret in sync (service-role only table).
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      await supabaseAdmin
        .from("cron_config")
        .upsert({ key: "search_console_refresh", value: cronSecret } as never)
        .then(({ error }) => { if (error) console.error("[search-console] cron secret sync failed:", error.message); });
    }
    const { data: row } = await supabaseAdmin
      .from("search_console_snapshots")
      .select("snapshot")
      .eq("id", true)
      .maybeSingle();
    return { state: "ok", siteUrl, snapshot: (row?.snapshot as SearchConsoleSnapshot | undefined) ?? null };
  });

export const selectSearchConsoleProperty = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .inputValidator((input: { siteUrl: string }) => z.object({ siteUrl: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const matches = await listVerifiedProperties();
    const chosen = matches.find((m) => m.siteUrl === data.siteUrl);
    if (!chosen) throw new Error("That Search Console property is not verified for this site.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("search_console_settings")
      .update({ site_url: chosen.siteUrl, updated_at: new Date().toISOString() } as never)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true, siteUrl: chosen.siteUrl };
  });

export const refreshSearchConsoleSnapshot = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("search_console_settings")
      .select("site_url")
      .eq("id", true)
      .maybeSingle();
    const matches = await listVerifiedProperties();
    const siteUrl = (settings?.site_url as string | null | undefined) ?? (matches.length === 1 ? matches[0].siteUrl : null);
    if (!siteUrl) throw new Error("No Search Console property selected yet.");
    if (!matches.some((m) => m.siteUrl === siteUrl)) {
      throw new Error("The selected Search Console property is no longer verified for this site.");
    }
    const snapshot = await buildSnapshot(siteUrl);
    await storeSnapshot(snapshot);
    return { ok: true, refreshedAt: snapshot.refreshedAt };
  });

/** Shared core for the cron route (no auth middleware — the route verifies its own secret). */
export async function runScheduledRefresh() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin
    .from("search_console_settings")
    .select("site_url")
    .eq("id", true)
    .maybeSingle();
  const siteUrl = settings?.site_url as string | null | undefined;
  if (!siteUrl) return { skipped: true, reason: "no property selected" };
  const matches = await listVerifiedProperties();
  if (!matches.some((m) => m.siteUrl === siteUrl)) return { skipped: true, reason: "property no longer verified" };
  const snapshot = await buildSnapshot(siteUrl);
  await storeSnapshot(snapshot);
  return { skipped: false, refreshedAt: snapshot.refreshedAt };
}
