import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { CREDIT_BUNDLES, PAID_BUNDLES } from "@/lib/credit-bundles";
import { useUsdToGhs } from "@/hooks/useForex";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Check, Coins, Sparkles } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — Credit bundles for CampusVerify" },
      { name: "description", content: "Credit bundle pricing for CampusVerify. Students earn credits for free; general users buy credits to publish surveys." },
      { property: "og:title", content: "Pricing — Credit bundles for CampusVerify" },
      { property: "og:description", content: "Compare CampusVerify credit bundles: students earn credits by answering surveys, general users buy credits to publish theirs." },
      { property: "og:url", content: "https://campus-verify.live/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://campus-verify.live/pricing" }],
  }),
});

const GENERAL_COSTS = [
  { tier: "Basic", credits: 2 },
  { tier: "Targeted", credits: 6 },
  { tier: "Boosted", credits: 16 },
  { tier: "Pro", credits: 30 },
];

function PricingPage() {
  const { profile } = useAuth();
  const forex = useUsdToGhs();

  // Verified students should never see this page — redirect them into the app.
  if (profile?.user_type === "student") {
    return <StudentFreeNotice />;
  }

  const freeBundle = CREDIT_BUNDLES.find((b) => b.id === "free")!;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link to="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">← Back home</Link>
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Pricing</p>
      <h1 className="mt-1 font-serif text-5xl leading-[0.95]">Simple <em className="text-primary">credit</em> bundles.</h1>
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
        General users buy credit bundles to publish surveys. Prices are shown in USD and charged in Ghana Cedis at the live exchange rate.
        {forex.usingFallback && " Rate may be slightly outdated."}
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Free */}
        <div className="relative rounded-3xl border-2 border-dashed border-foreground/20 bg-card p-6 shadow-paper">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{freeBundle.tagline}</p>
          <h2 className="mt-1 font-serif text-3xl">{freeBundle.label}</h2>
          <p className="mt-4 font-serif text-5xl leading-none text-primary">{freeBundle.credits}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">credits</p>
          <div className="mt-5">
            <p className="font-serif text-2xl">Free</p>
            <p className="text-[11px] text-muted-foreground">On signup</p>
          </div>
          <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
            {freeBundle.features?.map((f) => (
              <li key={f} className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 text-primary" /> {f}</li>
            ))}
          </ul>
        </div>

        {PAID_BUNDLES.map((b) => {
          const ghs = forex.toGhs(b.usdAmount);
          return (
            <div
              key={b.id}
              className={`relative rounded-3xl border-2 p-6 shadow-paper ${
                b.badge === "Most popular" ? "border-primary bg-primary/5" : "border-foreground/15 bg-card"
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
                <p className="text-[11px] text-muted-foreground">≈ GHS {ghs}{forex.loading && " …"}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/80">Price includes exchange rate adjustment</p>
              </div>
              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                {b.features?.map((f) => (
                  <li key={f} className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 text-primary" /> {f}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-12 rounded-3xl border border-foreground/15 bg-card p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Publishing cost — General users</p>
        <h3 className="mt-1 font-serif text-2xl">Buy &amp; publish</h3>
        <p className="mt-2 text-xs text-muted-foreground">General users get a 5-credit signup bonus, then top up with the bundles above.</p>
        <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
          {GENERAL_COSTS.map((c) => (
            <li key={c.tier} className="flex items-center justify-between border-b border-foreground/10 py-1.5">
              <span>{c.tier}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-primary"><Coins className="h-3.5 w-3.5" />{c.credits} credits</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 rounded-3xl border border-foreground/15 bg-card p-6 text-sm">
        <h3 className="font-serif text-xl">Billing &amp; refunds</h3>
        <p className="mt-2 text-muted-foreground">
          Payments are processed securely by Paystack in Ghana Cedis. See our{" "}
          <Link to="/refund-policy" className="underline">Refund Policy</Link> and{" "}
          <Link to="/terms" className="underline">Terms of Service</Link> for details.
        </p>
      </div>
    </div>
  );
}

function StudentFreeNotice() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-primary" />
      <h1 className="mt-3 font-serif text-4xl">CampusVerify is free for students</h1>
      <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm text-muted-foreground">
        <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> Start with 5 free credits</li>
        <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> Earn credits by answering campus surveys</li>
        <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> Answer 1 survey = +1 credit</li>
        <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> Publish 1 survey = −2 credits</li>
      </ul>
      <Button asChild className="mt-6 rounded-full">
        <Link to="/feed">Go to feed</Link>
      </Button>
      {/* Also keep a hard redirect fallback if profile loads slower */}
      <NavigateNoop />
    </div>
  );
}

function NavigateNoop() {
  // No-op wrapper so Navigate import isn't tree-shaken and future routing changes stay easy.
  return <Navigate to="/feed" />;
}
