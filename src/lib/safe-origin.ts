// Payment callback URLs must only point back to our own site.
const FALLBACK = "https://campus-verify.live";

export function safeOrigin(input: unknown): string {
  try {
    const u = new URL(String(input ?? ""));
    const h = u.hostname.toLowerCase();
    const ok =
      (u.protocol === "https:" &&
        (h === "campus-verify.live" ||
          h === "www.campus-verify.live" ||
          h === "campus-verify.lovable.app" ||
          h.endsWith(".lovable.app") ||
          h.endsWith(".lovableproject.com"))) ||
      (u.protocol === "http:" && (h === "localhost" || h === "127.0.0.1"));
    return ok ? u.origin : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
