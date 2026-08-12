import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { completeDonation } from "@/utils/donations.functions";
import { CheckCircle2, Loader2, Mail, XCircle } from "lucide-react";

type Search = { ref?: string };

export const Route = createFileRoute("/donate/thank-you")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ref: typeof search["ref"] === "string" ? search["ref"] : undefined,
  }),
  component: ThankYouPage,
  head: () => ({
    meta: [
      { title: "Thank you for your gift — CampusVerify" },
      {
        name: "description",
        content: "Your donation to CampusVerify is confirmed and your tax receipt is on its way by email.",
      },
      { property: "og:title", content: "Thank you for your gift — CampusVerify" },
      { property: "og:description", content: "Your donation keeps verified student research free. Receipt emailed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Result = Awaited<ReturnType<typeof completeDonation>>;

function ThankYouPage() {
  const { ref } = useSearch({ from: "/donate/thank-you" });
  const confirm = useServerFn(completeDonation);
  const [state, setState] = useState<"loading" | "done" | "failed" | "error">(ref ? "loading" : "error");
  const [result, setResult] = useState<Result | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!ref || ran.current) return;
    ran.current = true;
    confirm({ data: { reference: ref } })
      .then((r) => {
        setResult(r);
        setState(r.status === "success" ? "done" : "failed");
      })
      .catch(() => setState("error"));
  }, [ref, confirm]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      {state === "loading" && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Confirming your gift…</p>
        </>
      )}

      {state === "done" && result?.status === "success" && (
        <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-paper sm:p-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Gift received
          </p>
          <h1 className="mt-1 font-serif text-5xl leading-[0.95]">
            Thank you{result.donorName ? `, ${result.donorName.split(" ")[0]}` : ""}.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Your {result.frequency === "monthly" ? "monthly pledge" : "gift"} of{" "}
            <strong className="text-foreground">{result.amountLabel}</strong>
            {result.frequency === "monthly" ? " per month" : ""} keeps verified campus research free for students who
            can't pay for responses.
          </p>

          <div className="mt-8 rounded-xl border border-border bg-background p-5 text-left">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Receipt number</p>
            <p className="font-serif text-2xl">{result.receiptNumber || "Issuing…"}</p>
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              We've emailed your tax receipt to {result.donorEmail}. Keep it for your records — it can take a couple of
              minutes to arrive.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full">
              <Link to="/">Back home</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/donate">Give again</Link>
            </Button>
          </div>
        </div>
      )}

      {(state === "failed" || state === "error") && (
        <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-paper">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-destructive">
            <XCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-6 font-serif text-4xl">We couldn't confirm that gift.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            No charge has been recorded. If money left your account, email support with your reference and we'll sort it
            out.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/donate">Try again</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
