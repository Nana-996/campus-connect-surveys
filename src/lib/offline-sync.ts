// Auto-sync queued offline survey responses when the device is online.
import { supabase } from "@/integrations/supabase/client";
import { listQueued, removeQueued, bumpAttempt, queueCount } from "./offline-store";

let syncing = false;
const listeners = new Set<() => void>();

export function onQueueChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

export async function syncQueuedResponses(): Promise<{ synced: number; remaining: number }> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { synced: 0, remaining: await queueCount() };
  }
  if (syncing) return { synced: 0, remaining: await queueCount() };
  syncing = true;
  let synced = 0;
  try {
    const queue = await listQueued();
    for (const item of queue) {
      try {
        // Re-call begin to ensure server has a start row (safe; insert-or-noop).
        await supabase.rpc("begin_survey_response", { _survey_id: item.survey_id });
        const { error } = await supabase.from("survey_responses").insert({
          survey_id: item.survey_id,
          respondent_id: item.respondent_id,
          answers: item.answers as any,
          duration_ms: item.duration_ms,
        });
        if (error) {
          // If it's a duplicate (already submitted) — drop it.
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already")) {
            await removeQueued(item.id);
          } else {
            await bumpAttempt(item.id);
          }
          continue;
        }
        await removeQueued(item.id);
        synced++;
      } catch {
        await bumpAttempt(item.id);
      }
    }
  } finally {
    syncing = false;
    notify();
  }
  return { synced, remaining: await queueCount() };
}

let installed = false;
export function installAutoSync(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const trigger = () => {
    void syncQueuedResponses();
  };
  window.addEventListener("online", trigger);
  window.addEventListener("focus", trigger);
  // Initial pass after a short delay (lets auth hydrate).
  setTimeout(trigger, 1500);
}
