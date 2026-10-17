import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CREDIT_BUNDLES, PAID_BUNDLES, getBundleByBundleId } from "@/lib/credit-bundles";
import { useUsdToGhs } from "@/hooks/useForex";
import { initializePaystackCheckout, verifyPaystackCheckout } from "@/utils/paystack.functions";
import { Coins, Sparkles, Check, RotateCcw, AlertCircle } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { PromoRedeem } from "@/components/PromoRedeem";
import { TopupRequest } from "@/components/TopupRequest";
import { useSchoolOnboarded, STUDENT_PRICE_FACTOR } from "@/hooks/useSchoolOnboarded";

export const Route = createFileRoute("/_authenticated/buy-credits")({
  component: BuyCredits,
  head: () => ({ meta: [
    { title: "Buy survey credits | CampusVerify" },
    { name: "description", content: "Top up research publishing credits, starting with the Mini pack in Ghana Cedis." },
    { property: "og:title", content: "Buy survey credits | CampusVerify" },
    { property: "og:description", content: "Choose your publishing credit pack and pay securely through Paystack." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
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

  const [payment, setPayment] = useState<{ status: "failed" | "pending"; message: string; reference: string; bundleId?: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const checkPayment = async (reference: string) => {
    setChecking(true);
    try {
      const result = await verifyCheckout({ data: { reference } });
      if (result.status === "success") {
        setPayment(null);
        sessionStorage.removeItem("cv:credit-checkout-ref");
        toast.success(`Payment received — ${result.credits} credits added.`);
        await refreshProfile();
      } else {
        setPayment({ ...result, reference });
      }
    } catch {
      setPayment({ status: "pending", reference, message: "We could not check your payment yet. Check again before paying again. If you were debited, contact founder@campus-verify.live." });
    } finally {
      setChecking(false);
    }
  };

  // Keep unconfirmed references across refreshes so buyers can check before retrying.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("paystack_ref") || params.get("reference") || params.get("trxref") || sessionStorage.getItem("cv:credit-checkout-ref");
    if (!ref) return;
    sessionStorage.setItem("cv:credit-checkout-ref", ref);
    void checkPayment(ref);
    const url = new URL(window.location.href);
    ["paystack_ref", "reference", "trxref"].forEach((key) => url.searchParams.delete(key));
    window.history.replaceState({}, "", url.toString());
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

  const handleBuy = async (bundleId: string) => {
    if (!getBundleByBundleId(bundleId) || bundleId === "free") return;
    setLoadingId(bundleId);
    try {
      const { authorizationUrl, reference } = await initCheckout({
        data: { bundleId, originUrl: window.location.origin, promoCode: promo?.code },
      });
      sessionStorage.setItem("cv:credit-checkout-ref", reference);
      window.location.href = authorizationUrl;
    } catch (e) {
      setPayment({ status: "failed", reference: "", bundleId, message: "Checkout could not be opened. Please try again shortly. If this continues, contact founder@campus-verify.live." });
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
          Mini has a fixed Ghana Cedi price. Other packs are shown in USD and charged in Ghana Cedis at the live exchange rate.
          {forex.usingFallback && " Rate may be slightly outdated."}
        </p>

        {payment && (
          <section role="alert" className="mt-6 border border-destructive/30 bg-card p-4 rounded-lg">
            <h2 className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4 text-destructive" />{payment.status === "pending" ? "Awaiting payment confirmation" : "Payment not completed"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{payment.message}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {payment.status === "failed" && payment.bundleId && <Button disabled={loadingId !== null || checking} onClick={() => { if (payment.bundleId) void handleBuy(payment.bundleId); }}><RotateCcw className="h-4 w-4" />Try again</Button>}
              {payment.reference && <Button variant="outline" disabled={checking} onClick={() => void checkPayment(payment.reference)}>{checking ? "Checking…" : "Check payment status"}</Button>}
              <Button variant="ghost" asChild><a href="mailto:founder@campus-verify.live">Contact support</a></Button>
            </div>
          </section>
        )}

        {isStudent && (
          <div className="mt-6 max-w-2xl rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 text-sm">
            <p className="font-semibold text-primary">Your student price is 50% off.</p>
            <p className="mt-1 text-muted-foreground">
              Your school has not partnered with CampusVerify yet. You received 10 permanent sign-up credits and can
              buy more at the student price or earn them by answering surveys.
            </p>
            <p className="mt-2 text-muted-foreground">
              To explore a school partnership, ask a school administrator to contact the CampusVerify app owner at{" "}
              <a className="font-semibold text-foreground underline" href="mailto:founder@campus-verify.live">founder@campus-verify.live</a>.
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
            const ghs = b.ghsAmount !== undefined ? b.ghsAmount * factor : forex.toGhs(b.usdAmount * factor);
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
                    {isStudent && <span className="mr-2 text-base text-muted-foreground line-through">{b.ghsAmount !== undefined ? `GHS ${b.ghsAmount.toFixed(2)}` : `$${b.usdAmount.toFixed(2)}`}</span>}
                    {b.ghsAmount !== undefined ? `GHS ${ghs.toFixed(2)}` : `$${(b.usdAmount * factor).toFixed(2)}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {b.ghsAmount !== undefined ? "Fixed price · no currency conversion" : `≈ GHS ${ghs}`}
                    {b.ghsAmount === undefined && forex.loading && " …"}
                  </p>
                  {b.ghsAmount === undefined && <p className="mt-0.5 text-[10px] text-muted-foreground/80">Price includes exchange rate adjustment</p>}
                </div>

                <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  {b.features?.map((f) => (
                    <li key={f} className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 text-primary" /> {f}</li>
                  ))}
                </ul>

                <Button
                  className="mt-6 w-full rounded-full"
                  disabled={loadingId !== null || (b.ghsAmount === undefined && forex.loading) || checking || payment?.status === "pending"}
                  onClick={() => handleBuy(b.id)}
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
