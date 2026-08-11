// IndexedDB-backed offline store:
//   - cached survey questions (so they re-open offline)
//   - cached feed snapshot per user
//   - queued survey responses awaiting upload
import { get, set, del, keys, createStore } from "idb-keyval";

// NOTE: idb-keyval's createStore only creates ONE object store per database
// upgrade, so three stores sharing the "cv-offline" database name meant only
// the first one ever existed ("object store not found" at runtime).
// Each store gets its own database instead.
const surveyStore = createStore("cv-offline-surveys", "surveys");
const feedStore = createStore("cv-offline-feed", "feed");
const queueStore = createStore("cv-offline-queue", "response-queue");

export type CachedSurvey = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  questions: any[];
  response_count: number;
  response_goal: number;
  expires_at: string;
  target_department: string | null;
  target_year: string | null;
  cached_at: number;
};

export type CachedFeed = {
  user_id: string;
  surveys: any[];
  answered: string[];
  cached_at: number;
};

export type QueuedResponse = {
  id: string; // local uuid
  survey_id: string;
  respondent_id: string;
  answers: Record<string, string>;
  duration_ms: number;
  queued_at: number;
  attempts: number;
};

// ---------- localStorage fallback (private mode / blocked IndexedDB) ----------
const LS_QUEUE = "cv:offline-queue:v1";
function lsRead(): QueuedResponse[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_QUEUE) || "[]"); } catch { return []; }
}
function lsWrite(items: QueuedResponse[]): void {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(LS_QUEUE, JSON.stringify(items)); } catch {}
}

// ---------- Surveys ----------
export async function cacheSurvey(s: Omit<CachedSurvey, "cached_at">): Promise<void> {
  try { await set(s.id, { ...s, cached_at: Date.now() } as CachedSurvey, surveyStore); } catch {}
}
export async function getCachedSurvey(id: string): Promise<CachedSurvey | undefined> {
  try { return await get<CachedSurvey>(id, surveyStore); } catch { return undefined; }
}

// ---------- Feed ----------
export async function cacheFeed(payload: Omit<CachedFeed, "cached_at">): Promise<void> {
  try { await set(payload.user_id, { ...payload, cached_at: Date.now() } as CachedFeed, feedStore); } catch {}
}
export async function getCachedFeed(userId: string): Promise<CachedFeed | undefined> {
  try { return await get<CachedFeed>(userId, feedStore); } catch { return undefined; }
}

// ---------- Queue ----------
export async function enqueueResponse(r: Omit<QueuedResponse, "id" | "queued_at" | "attempts">): Promise<QueuedResponse> {
  const id = (crypto as any)?.randomUUID?.() ?? `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: QueuedResponse = { ...r, id, queued_at: Date.now(), attempts: 0 };
  try {
    await set(id, entry, queueStore);
  } catch {
    lsWrite([...lsRead(), entry]);
  }
  return entry;
}
export async function listQueued(): Promise<QueuedResponse[]> {
  let items: QueuedResponse[] = [];
  try {
    const ks = (await keys(queueStore)) as string[];
    const got = await Promise.all(ks.map((k) => get<QueuedResponse>(k, queueStore)));
    items = got.filter((x): x is QueuedResponse => !!x);
  } catch {}
  const seen = new Set(items.map((i) => i.id));
  for (const i of lsRead()) if (!seen.has(i.id)) items.push(i);
  return items.sort((a, b) => a.queued_at - b.queued_at);
}
export async function removeQueued(id: string): Promise<void> {
  try { await del(id, queueStore); } catch {}
  const rest = lsRead().filter((i) => i.id !== id);
  if (rest.length !== lsRead().length) lsWrite(rest);
}
export async function bumpAttempt(id: string): Promise<void> {
  try {
    const item = await get<QueuedResponse>(id, queueStore);
    if (item) { await set(id, { ...item, attempts: item.attempts + 1 }, queueStore); return; }
  } catch {}
  const items = lsRead();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) { items[idx] = { ...items[idx]!, attempts: items[idx]!.attempts + 1 }; lsWrite(items); }
}
export async function queueCount(): Promise<number> {
  return (await listQueued()).length;
}
