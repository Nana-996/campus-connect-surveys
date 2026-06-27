import { createFileRoute, Link } from "@tanstack/react-router";
import { CREDIT_BUNDLES } from "@/lib/credit-bundles";
import { Check, Coins } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — CampusVerify" },
      { name: "description", content: "Credit bundle pricing for CampusVerify. Students earn credits for free; general users buy credits to publish surveys." },
      { property: "og:title", content: "Pricing — CampusVerify" },
      { property: "og:description", content: "Credit bundle pricing for CampusVerify. Students earn credits for free; general users buy credits to publish surveys." },
    ],
  }),
});

const STUDENT_COSTS = [
  { tier: "Basic", credits: 1 },
  { tier: "Targeted", credits: 3 },
  { tier: "Boosted", credits: 8 },
  { tier: "Pro", credits: 15 },
];

const GENERAL_COSTS = [
  { tier: "Basic", credits: 2 },
  { tier: "Targeted", credits: 6 },
  { tier: "Boosted", credits: 16 },
  { tier: "Pro", credits: 30 },
];

function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link to="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">← Back home</Link>
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Pricing</p>
      <h1 className="mt-1 font-serif text-5xl leading-[0.95]">Simple <em className="text-primary">credit</em> bundles.</h1>
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
        CampusVerify runs on credits. Students earn credits for free by answering surveys.
        General users buy credit bundles below to publish surveys. Prices are in USD;
        your bank converts automatically. Approximate GHS shown at ~12 GHS / USD.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {CREDIT_BUNDLES.map((b) => (
          <div
            key={b.id}
            className={`relative rounded-3xl border-2 p-6 shadow-paper ${
              b.id === "plus" ? "border-primary bg-primary/5" : "border-foreground/15 bg-card"
            }`}
          >
            {b.badge && (
              <span className="absolute -top-2 left-6 rounded-full bg-highlight px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-highlight-foreground">
                {b.badge}
              </span>
            )}
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{b.tagline}</p>
            <h2 className="mt-1 font-serif text-3xl">{b.label}</h2>
            <p className="mt-4 font-serif text-5xl leading-none text-primary">{b.credits}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">credits</p>
            <div className="mt-5">
              <p className="font-serif text-2xl">${b.usdAmount.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground">≈ GHS {b.ghsApprox}</p>
            </div>
            <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 text-primary" /> Purchased credits never expire</li>
              <li className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 text-primary" /> ${(b.usdAmount / b.credits).toFixed(3)} per credit</li>
              <li className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 text-primary" /> 30-day money-back guarantee</li>
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-foreground/15 bg-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Publishing cost — Students</p>
          <h3 className="mt-1 font-serif text-2xl">Earn-and-spend</h3>
          <p className="mt-2 text-xs text-muted-foreground">Students get a 10-credit signup bonus and earn more by answering surveys.</p>
          <ul className="mt-4 space-y-1.5 text-sm">
            {STUDENT_COSTS.map((c) => (
              <li key={c.tier} className="flex items-center justify-between border-b border-foreground/10 py-1.5">
                <span>{c.tier}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary"><Coins className="h-3.5 w-3.5" />{c.credits} credits</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-foreground/15 bg-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Publishing cost — General users</p>
          <h3 className="mt-1 font-serif text-2xl">Buy &amp; publish</h3>
          <p className="mt-2 text-xs text-muted-foreground">General users get a 5-credit signup bonus, then top up with the bundles above.</p>
          <ul className="mt-4 space-y-1.5 text-sm">
            {GENERAL_COSTS.map((c) => (
              <li key={c.tier} className="flex items-center justify-between border-b border-foreground/10 py-1.5">
                <span>{c.tier}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary"><Coins className="h-3.5 w-3.5" />{c.credits} credits</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 rounded-3xl border border-foreground/15 bg-card p-6 text-sm">
        <h3 className="font-serif text-xl">Billing &amp; refunds</h3>
        <p className="mt-2 text-muted-foreground">
          Payments are processed securely by our Merchant of Record, Paddle.com. All charges appear on your statement
          from Paddle. See our <Link to="/refund-policy" className="underline">Refund Policy</Link> and{" "}
          <Link to="/terms" className="underline">Terms of Service</Link> for details.
        </p>
      </div>
    </div>
  );
}
