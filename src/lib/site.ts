// Canonical site URL. Configure via VITE_SITE_URL on your host (Vercel, etc.).
// Falls back to the current production domain so SEO metadata stays valid
// even when the env var is missing.
const FALLBACK = "https://your-domain.com";

export const SITE_URL: string =
  (import.meta.env?.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
  (typeof process !== "undefined" ? process.env?.VITE_SITE_URL?.replace(/\/$/, "") : undefined) ||
  FALLBACK;

export const siteUrl = (path = "/"): string =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
