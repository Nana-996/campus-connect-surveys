// Service-worker registration with strict guards. Never registers in dev,
// Lovable preview iframes, or when ?sw=off is set. In any refused context,
// unregisters any matching /sw.js so stale workers can't linger.

function shouldRefuse(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  if (
    new URLSearchParams(window.location.search).has("sw") &&
    new URLSearchParams(window.location.search).get("sw") === "off"
  ) {
    return true;
  }
  return false;
}

async function unregisterMatching(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const u = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return u.endsWith("/sw.js");
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

export async function registerPwa(): Promise<void> {
  if (shouldRefuse()) {
    await unregisterMatching();
    return;
  }
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.warn("[pwa] register failed", err);
  }
}
