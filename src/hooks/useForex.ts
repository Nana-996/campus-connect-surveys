import { useEffect, useState, useCallback } from "react";

const FALLBACK_RATE = 12; // GHS per USD
const BUFFER = 1.05; // 5% buffer for FX + fees
const CACHE_KEY = "cv_usd_ghs_rate_v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

type CachedRate = { rate: number; ts: number };

export type ForexState = {
  /** Raw live USD→GHS rate (no buffer). */
  rate: number;
  /** Effective rate used for display: rate × 1.05. */
  bufferedRate: number;
  loading: boolean;
  /** True when we couldn't reach the API and are showing a stale/fallback rate. */
  stale: boolean;
  /** True when even the cache is empty and we're using the hardcoded fallback. */
  usingFallback: boolean;
  /** Convert a USD amount to a displayable whole-GHS integer (with buffer). */
  toGhs: (usd: number) => number;
  refresh: () => Promise<void>;
};

function readCache(): CachedRate | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRate;
    if (!parsed || typeof parsed.rate !== "number" || typeof parsed.ts !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rate: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, ts: Date.now() } satisfies CachedRate));
  } catch {
    /* ignore */
  }
}

async function fetchLiveRate(): Promise<number> {
  const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", { cache: "no-store" });
  if (!res.ok) throw new Error(`Rate fetch failed: ${res.status}`);
  const body = (await res.json()) as { rates?: Record<string, number> };
  const ghs = body?.rates?.GHS;
  if (!ghs || typeof ghs !== "number" || ghs <= 0) throw new Error("Invalid GHS rate in response");
  return ghs;
}

export function useUsdToGhs(): ForexState {
  const [rate, setRate] = useState<number>(() => readCache()?.rate ?? FALLBACK_RATE);
  const [loading, setLoading] = useState<boolean>(true);
  const [stale, setStale] = useState<boolean>(false);
  const [usingFallback, setUsingFallback] = useState<boolean>(() => !readCache());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const live = await fetchLiveRate();
      setRate(live);
      setStale(false);
      setUsingFallback(false);
      writeCache(live);
    } catch {
      const cached = readCache();
      if (cached) {
        setRate(cached.rate);
        setStale(Date.now() - cached.ts > CACHE_TTL_MS);
        setUsingFallback(false);
      } else {
        setRate(FALLBACK_RATE);
        setStale(true);
        setUsingFallback(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = readCache();
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setRate(cached.rate);
      setStale(false);
      setUsingFallback(false);
      setLoading(false);
      return;
    }
    void refresh();
  }, [refresh]);

  const bufferedRate = rate * BUFFER;
  const toGhs = useCallback((usd: number) => Math.round(usd * bufferedRate), [bufferedRate]);

  return { rate, bufferedRate, loading, stale, usingFallback, toGhs, refresh };
}
