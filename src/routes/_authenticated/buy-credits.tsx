import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CREDIT_BUNDLES } from "@/lib/credit-bundles";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Coins, Sparkles, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/buy-credits")({
  component: BuyCredits,
});

function BuyCredits() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { openCheckout, loading } = usePaddleCheckout();
  const isGeneral = profile?.user_type === "general";

  // Refresh profile when we return from a successful checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Payment received — credits will land in your balance shortly.");
      const tick = setInterval(() => refreshProfile(), 2000);
      const stop = setTimeout(() => clearInterval(tick), 20000);
      return () => { clearInterval(tick); clearTimeout(stop); };
    }
  }, [refreshProfile]);

  if (!profile) return null;

  if (!isGeneral) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 font-serif text-4xl">Credits are free for students</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          As a verified student you earn credits by answering surveys — no purchase needed.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/feed">Go to feed</Link>
        </Button>
      </div>
    );
  }

  const handleBuy = async (priceId: string) => {
    try {
      await openCheckout({
        priceId,
        customerEmail: user?.email,
        customData: { userId: user!.id },
        successUrl: `${window.location.origin}/buy-credits?checkout=success`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start checkout";
      toast.error(msg);
    }
  };

  return (
    <div>
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-5xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Buy credits</p>
        <h1 className="mt-1 font-serif text-5xl leading-[0.95]">
          Stock up to <em className="text-primary">publish.</em>
        </h1>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-semibold">
          <Coins className="h-3.5 w-3.5 text-primary" />
          <span className="font-bold text-primary">{profile.paid_credits} credits</span>
          <span className="text-muted-foreground">· in your balance</span>
        </p>

        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          Credits never expire. Prices show in USD at checkout but your bank converts to GHS automatically —
          approximate cedi values are shown below at ~12 GHS / USD.
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {b.tagline}
              </p>
              <h2 className="mt-1 font-serif text-3xl">{b.label}</h2>
              <p className="mt-4 font-serif text-5xl leading-none text-primary">{b.credits}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">credits</p>

              <div className="mt-5">
                <p className="font-serif text-2xl">${b.usdAmount.toFixed(2)}</p>
                <p className="text-[11px] text-muted-foreground">≈ GHS {b.ghsApprox}</p>
              </div>

              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 text-primary" /> Never expire</li>
                <li className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 text-primary" /> ${(b.usdAmount / b.credits).toFixed(3)} per credit</li>
                <li className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 text-primary" /> Instant top-up</li>
              </ul>

              <Button
                className="mt-6 w-full rounded-full"
                disabled={loading}
                onClick={() => handleBuy(b.priceId)}
              >
                {loading ? "Opening…" : `Buy ${b.label}`}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-foreground/15 bg-card p-6 text-sm">
          <h3 className="font-serif text-xl">What credits cost to publish</h3>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>· Basic — 2 credits (≈ 5 Basic surveys per Starter pack)</li>
            <li>· Targeted — 6 credits</li>
            <li>· Boosted — 16 credits</li>
            <li>· Pro — 30 credits (Plus pack covers two Pro surveys)</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Payments are processed securely. Refunds available within 30 days — contact support.
          </p>
          <Button
            variant="ghost"
            className="mt-3 px-0 text-xs"
            onClick={() => navigate({ to: "/create" })}
          >
            ← Back to publishing
          </Button>
        </div>
      </div>
    </div>
  );
}
