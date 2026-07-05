import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CREDIT_BUNDLES, PAID_BUNDLES } from "@/lib/credit-bundles";
import { useUsdToGhs } from "@/hooks/useForex";
import { initializePaystackCheckout, verifyPaystackCheckout } from "@/utils/paystack.functions";
import { Coins, Sparkles, Check } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/_authenticated/buy-credits")({
  component: BuyCredits,
});

function BuyCredits() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isGeneral = profile?.user_type === "general";
  const forex = useUsdToGhs();
  const initCheckout = useServerFn(initializePaystackCheckout);
  const verifyCheckout = useServerFn(verifyPaystackCheckout);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // On return from Paystack, verify the transaction and credit the account.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("paystack_ref") || params.get("reference") || params.get("trxref");
    if (!ref) return;
    void (async () => {
      try {
        const result = await verifyCheckout({ data: { reference: ref } });
        if (result.status === "success") {
          toast.success(`Payment received — ${result.credits} credits added.`);
          await refreshProfile();
        } else {
          toast.error("Payment could not be confirmed. If you were charged, contact support.");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Verification failed");
      } finally {
        // Clean the URL so a refresh doesn't re-verify.
        const url = new URL(window.location.href);
        url.searchParams.delete("paystack_ref");
        url.searchParams.delete("reference");
        url.searchParams.delete("trxref");
        window.history.replaceState({}, "", url.toString());
      }
    })();
  }, [verifyCheckout, refreshProfile]);

  if (!profile) return null;

  if (!isGeneral) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
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
      </div>
    );
  }

  const handleBuy = async (bundleId: string, usdAmount: number) => {
    if (usdAmount <= 0) return;
    setLoadingId(bundleId);
    try {
      const amountGhs = forex.toGhs(usdAmount);
      const { authorizationUrl } = await initCheckout({
        data: { bundleId, amountGhs, originUrl: window.location.origin },
      });
      window.location.href = authorizationUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setLoadingId(null);
    }
  };

  const freeBundle = CREDIT_BUNDLES.find((b) => b.id === "free")!;

  return (
    <div>
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
          Prices are shown in USD and charged in Ghana Cedis at the live exchange rate.
          {forex.usingFallback && " Rate may be slightly outdated."}
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Free tier — signup bonus, non-purchasable */}
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
                  <p className="text-[11px] text-muted-foreground">
                    ≈ GHS {ghs}
                    {forex.loading && " …"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/80">Price includes exchange rate adjustment</p>
                </div>

                <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  {b.features?.map((f) => (
                    <li key={f} className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 text-primary" /> {f}</li>
                  ))}
                </ul>

                <Button
                  className="mt-6 w-full rounded-full"
                  disabled={loadingId !== null || forex.loading}
                  onClick={() => handleBuy(b.id, b.usdAmount)}
                >
                  {loadingId === b.id ? "Opening…" : `Buy ${b.label}`}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-3xl border border-foreground/15 bg-card p-6 text-sm">
          <h3 className="font-serif text-xl">What credits cost to publish</h3>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>· Basic — 2 credits</li>
            <li>· Targeted — 6 credits</li>
            <li>· Boosted — 16 credits</li>
            <li>· Pro — 30 credits</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Payments are processed securely by Paystack in Ghana Cedis. Refunds available within 30 days — contact support.
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
