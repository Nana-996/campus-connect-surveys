// Remembers which partner link a visitor arrived through until they register.
const KEY = "cv:partner-slug";

export function storePartnerSlug(slug: string) {
  try {
    window.localStorage.setItem(KEY, slug.toLowerCase());
  } catch {
    /* storage unavailable */
  }
}

export function storedPartnerSlug(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPartnerSlug() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
