// Maps raw errors (Supabase/PostgREST/etc) to safe user-facing messages.
// Full error is logged to the console for debugging; never shown to users.

export function safeErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error) {
    // Always log full details for developers
    // eslint-disable-next-line no-console
    console.error("[safe-error]", error);
  }

  const raw =
    (typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : typeof error === "string"
        ? error
        : "") || "";

  const lower = raw.toLowerCase();

  // Known leaky patterns — replace with generic messages
  if (
    lower.includes("row-level security") ||
    lower.includes("row level security") ||
    lower.includes("violates row") ||
    lower.includes("permission denied") ||
    lower.includes("policy")
  ) {
    return "You don't have permission to do that.";
  }
  if (lower.includes("duplicate key") || lower.includes("unique constraint")) {
    return "That already exists.";
  }
  if (lower.includes("violates foreign key") || lower.includes("foreign key constraint")) {
    return "That action references something that no longer exists.";
  }
  if (lower.includes("violates check constraint") || lower.includes("not-null") || lower.includes("null value")) {
    return "Some required information is missing or invalid.";
  }
  if (lower.includes("jwt") || lower.includes("invalid token") || lower.includes("expired")) {
    return "Your session has expired. Please sign in again.";
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed to fetch")) {
    return "Network problem. Check your connection and try again.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  return fallback;
}
