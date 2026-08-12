import { useEffect, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, MailX } from "lucide-react";

type Search = { token?: string };

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    token: typeof search["token"] === "string" ? search["token"] : undefined,
  }),
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Unsubscribe from CampusVerify emails" },
      { name: "description", content: "Stop receiving CampusVerify notification emails at this address." },
      { property: "og:title", content: "Unsubscribe from CampusVerify emails" },
      { property: "og:description", content: "Manage the emails CampusVerify sends to your address." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function UnsubscribePage() {
  const { token } = useSearch({ from: "/unsubscribe" });
  const [state, setState] = useState<"checking" | "ready" | "used" | "invalid" | "working" | "done">("checking");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as { valid?: boolean; used?: boolean };
        if (!r.ok || !body.valid) setState(body.used ? "used" : "invalid");
        else setState("ready");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  async function confirm() {
    setState("working");
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? "done" : "invalid");
    } catch {
      setState("invalid");
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-paper">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
          {state === "done" ? <CheckCircle2 className="h-7 w-7" /> : <MailX className="h-7 w-7" />}
        </span>

        {state === "checking" && (
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
          </p>
        )}

        {state === "ready" && (
          <>
            <h1 className="mt-6 font-serif text-4xl">Unsubscribe?</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              You'll stop receiving CampusVerify notification emails at this address. Account security emails may still
              be sent.
            </p>
            <Button onClick={confirm} className="mt-6 rounded-full">
              Confirm unsubscribe
            </Button>
          </>
        )}

        {state === "working" && (
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Updating your preferences…
          </p>
        )}

        {state === "done" && (
          <>
            <h1 className="mt-6 font-serif text-4xl">You're unsubscribed.</h1>
            <p className="mt-3 text-sm text-muted-foreground">We won't email you at this address again.</p>
          </>
        )}

        {state === "used" && (
          <>
            <h1 className="mt-6 font-serif text-4xl">Already unsubscribed.</h1>
            <p className="mt-3 text-sm text-muted-foreground">This address is already off our list.</p>
          </>
        )}

        {state === "invalid" && (
          <>
            <h1 className="mt-6 font-serif text-4xl">This link isn't valid.</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              It may have expired. Reply to any CampusVerify email and we'll remove you manually.
            </p>
          </>
        )}

        <div className="mt-8">
          <Link to="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
            ← Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
