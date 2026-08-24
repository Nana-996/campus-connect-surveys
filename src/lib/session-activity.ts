// Keeps users signed in across visits, but expires the session after a
// stretch of inactivity so an abandoned device doesn't stay logged in.
// The window length is chosen by the user at sign-in ("Remember me").

const KEY = "cv:last-active";
const DURATION_KEY = "cv:session-days";
const LOGIN_KEY = "cv:last-login";

export const REMEMBER_DAYS = 30;
export const SHORT_DAYS = 1;
export const INACTIVITY_DAYS = REMEMBER_DAYS;

const DAY_MS = 24 * 60 * 60 * 1000;

const hasStorage = () => typeof window !== "undefined" && !!window.localStorage;

export function markActive() {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage unavailable — ignore */
  }
}

/** Record a fresh sign-in and the chosen session length. */
export function startSession(remember: boolean) {
  if (!hasStorage()) return;
  try {
    const now = Date.now();
    localStorage.setItem(DURATION_KEY, String(remember ? REMEMBER_DAYS : SHORT_DAYS));
    localStorage.setItem(LOGIN_KEY, String(now));
    localStorage.setItem(KEY, String(now));
  } catch {
    /* ignore */
  }
}

export function getSessionDays(): number {
  if (!hasStorage()) return REMEMBER_DAYS;
  try {
    const raw = Number(localStorage.getItem(DURATION_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : REMEMBER_DAYS;
  } catch {
    return REMEMBER_DAYS;
  }
}

export function getRemember(): boolean {
  return getSessionDays() >= REMEMBER_DAYS;
}

/** Change the session length for the signed-in user, keeping the login stamp. */
export function setSessionDays(remember: boolean) {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(DURATION_KEY, String(remember ? REMEMBER_DAYS : SHORT_DAYS));
    markActive();
  } catch {
    /* ignore */
  }
}

function readNumber(key: string): number | null {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Timestamp (ms) of the last recorded sign-in, if known. */
export function getLastLogin(): number | null {
  return readNumber(LOGIN_KEY);
}

export function getLastActive(): number | null {
  return readNumber(KEY);
}

/** Milliseconds left before inactivity sign-out, or null when unknown. */
export function getTimeRemaining(): number | null {
  const last = getLastActive();
  if (last === null) return null;
  return Math.max(0, last + getSessionDays() * DAY_MS - Date.now());
}

export function clearActivity() {
  if (!hasStorage()) return;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(DURATION_KEY);
    localStorage.removeItem(LOGIN_KEY);
  } catch {
    /* ignore */
  }
}

/** True when the last recorded activity is older than the inactivity window. */
export function isSessionStale(): boolean {
  const last = getLastActive();
  if (last === null) return false; // no record yet: treat as fresh, then start tracking
  return Date.now() - last > getSessionDays() * DAY_MS;
}
