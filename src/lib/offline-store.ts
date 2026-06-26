// IndexedDB-backed offline store:
//   - cached survey questions (so they re-open offline)
//   - cached feed snapshot per user
//   - queued survey responses awaiting upload
import { get, set, del, keys, createStore } from "idb-keyval";

const surveyStore = createStore("cv-offline", "surveys");
const feedStore = createStore("cv-offline", "feed");
const queueStore = createStore("cv-offline", "response-queue");

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

// ---------- Surveys ----------
export async function cacheSurvey(s: Omit<CachedSurvey, "cached_at">): Promise<void> {
  await set(s.id, { ...s, cached_at: Date.now() } as CachedSurvey, surveyStore);
}
export async function getCachedSurvey(id: string): Promise<CachedSurvey | undefined> {
  return get<CachedSurvey>(id, surveyStore);
}

// ---------- Feed ----------
export async function cacheFeed(payload: Omit<CachedFeed, "cached_at">): Promise<void> {
  await set(payload.user_id, { ...payload, cached_at: Date.now() } as CachedFeed, feedStore);
}
export async function getCachedFeed(userId: string): Promise<CachedFeed | undefined> {
  return get<CachedFeed>(userId, feedStore);
}

// ---------- Queue ----------
export async function enqueueResponse(
  r: Omit<QueuedResponse, "id" | "queued_at" | "attempts">,
): Promise<QueuedResponse> {
  const id =
    (crypto as any)?.randomUUID?.() ?? `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: QueuedResponse = { ...r, id, queued_at: Date.now(), attempts: 0 };
  await set(id, entry, queueStore);
  return entry;
}
export async function listQueued(): Promise<QueuedResponse[]> {
  const ks = (await keys(queueStore)) as string[];
  const items = await Promise.all(ks.map((k) => get<QueuedResponse>(k, queueStore)));
  return items.filter((x): x is QueuedResponse => !!x).sort((a, b) => a.queued_at - b.queued_at);
}
export async function removeQueued(id: string): Promise<void> {
  await del(id, queueStore);
}
export async function bumpAttempt(id: string): Promise<void> {
  const item = await get<QueuedResponse>(id, queueStore);
  if (item) await set(id, { ...item, attempts: item.attempts + 1 }, queueStore);
}
export async function queueCount(): Promise<number> {
  return (await keys(queueStore)).length;
}
