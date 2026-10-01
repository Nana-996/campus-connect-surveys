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
import { PromoRedeem } from "@/components/PromoRedeem";
import { TopupRequest } from "@/components/TopupRequest";
import { useSchoolOnboarded, STUDENT_PRICE_FACTOR } from "@/hooks/useSchoolOnboarded";

export const Route = createFileRoute("/_authenticated/buy-credits")({
  component: BuyCredits,
});

function BuyCredits() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isGeneral = profile?.user_type === "general";
  const forex = useUsdToGhs();
  const { onboarded, loading: onboardLoading } = useSchoolOnboarded();
  const isStudent = profile?.user_type === "student";
  const factor = isStudent ? STUDENT_PRICE_FACTOR : 1;
  const initCheckout = useServerFn(initializePaystackCheckout);
  const verifyCheckout = useServerFn(verifyPaystackCheckout);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ code: string; pct: number } | null>(null);

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
  if (isStudent && onboardLoading) return null;

  if (!isGeneral && !(isStudent && !onboarded)) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 font-serif text-4xl">Your partner-school credits</h1>
        <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm text-muted-foreground">
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> Your partner-school account starts with 50 permanent credits</li>
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> Earn credits by answering campus surveys</li>
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> Answer 1 survey = +1 credit</li>
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> Publish 1 survey = −2 credits</li>
        </ul>
        <div className="mt-6 text-left"><PromoRedeem /></div>
        <div className="mt-4"><TopupRequest /></div>
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
      const amountGhs = forex.toGhs(usdAmount * factor);
      const { authorizationUrl } = await initCheckout({
        data: { bundleId, amountGhs, originUrl: window.location.origin, promoCode: promo?.code },
      });
      window.location.href = authorizationUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setLoadingId(null);
    }
  };

  const freeBundle = CREDIT_BUNDLES.find((b) => b.id === "free");
  if (!freeBundle) return null;
  const signupCredits = isStudent ? 10 : 5;
  const signupDescription = isStudent
    ? "Your non-partner student account received 10 permanent sign-up credits."
    : "Your General / Researcher account received 5 permanent sign-up credits.";

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
          <span className="font-bold text-primary">{profile.earned_credits + profile.paid_credits} credits</span>
          <span className="text-muted-foreground">· in your balance</span>
        </p>

        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          Prices are shown in USD and charged in Ghana Cedis at the live exchange rate.
          {forex.usingFallback && " Rate may be slightly outdated."}
        </p>

        {isStudent && (
          <div className="mt-6 max-w-2xl rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 text-sm">
            <p className="font-semibold text-primary">Your student price is 50% off.</p>
            <p className="mt-1 text-muted-foreground">
              Your school has not partnered with CampusVerify yet. You received 10 permanent sign-up credits and can
              buy more at the student price or earn them by answering surveys.
            </p>
            <p className="mt-2 text-muted-foreground">
              To explore a school partnership, ask a school administrator to contact the CampusVerify app owner at{" "}
              <a className="font-semibold text-foreground underline" href="mailto:hello@campus-verify.live">hello@campus-verify.live</a>.
            </p>
          </div>
        )}

        <div className="mt-6 max-w-2xl">
          <PromoRedeem onDiscount={(code, pct) => setPromo({ code, pct })} />
          {promo && (
            <p className="mt-2 text-sm font-medium text-primary">
              {promo.code}: {promo.pct}% off will be applied at checkout.{" "}
              <button className="underline" onClick={() => setPromo(null)}>Remove</button>
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Free tier — signup bonus, non-purchasable */}
          <div className="relative rounded-3xl border-2 border-dashed border-foreground/20 bg-card p-6 shadow-paper">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{freeBundle.tagline}</p>
            <h2 className="mt-1 font-serif text-3xl">{freeBundle.label}</h2>
            <p className="mt-4 font-serif text-5xl leading-none text-primary">{signupCredits}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">credits</p>
            <div className="mt-5">
              <p className="font-serif text-2xl">Free</p>
              <p className="text-[11px] text-muted-foreground">On signup</p>
            </div>
            <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 text-primary" /> {signupDescription}</li>
              <li className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 text-primary" /> Never expires</li>
            </ul>
          </div>

          {PAID_BUNDLES.map((b) => {
            const ghs = forex.toGhs(b.usdAmount * factor);
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
                  <p className="font-serif text-2xl">
                    {isStudent && <span className="mr-2 text-base text-muted-foreground line-through">${b.usdAmount.toFixed(2)}</span>}
                    ${(b.usdAmount * factor).toFixed(2)}
                  </p>
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
            <li>· Basic — {isStudent ? 1 : 2} credits</li>
            <li>· Targeted — {isStudent ? 3 : 6} credits</li>
            <li>· Boosted — {isStudent ? 8 : 16} credits</li>
            <li>· Pro — {isStudent ? 15 : 30} credits</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Payments are processed securely by Paystack in Ghana Cedis. All purchases are final and non-refundable, except where applicable law requires otherwise.
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
