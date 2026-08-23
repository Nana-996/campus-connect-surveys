// Keeps users signed in across visits, but expires the session after a
// stretch of inactivity so an abandoned device doesn't stay logged in.

const KEY = "cv:last-active";
export const INACTIVITY_DAYS = 30;
const INACTIVITY_MS = INACTIVITY_DAYS * 24 * 60 * 60 * 1000;

const hasStorage = () => typeof window !== "undefined" && !!window.localStorage;

export function markActive() {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function clearActivity() {
  if (!hasStorage()) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** True when the last recorded activity is older than the inactivity window. */
export function isSessionStale(): boolean {
  if (!hasStorage()) return false;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false; // no record yet: treat as fresh, then start tracking
    const last = Number(raw);
    if (!Number.isFinite(last)) return false;
    return Date.now() - last > INACTIVITY_MS;
  } catch {
    return false;
  }
}
