import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Check, ArrowLeft, ShieldCheck } from "lucide-react";
import { packsFor } from "@/lib/credits";
import { initializePaystackPayment, verifyPaystackPayment } from "@/lib/payments.functions";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  reference: z.string().optional(),
  trxref: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/buy")({
  validateSearch: searchSchema,
  component: BuyPage,
});

function BuyPage() {
  const { profile, refreshProfile, session, isPreviewMode } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/buy" });
  const initFn = useServerFn(initializePaystackPayment);
  const verifyFn = useServerFn(verifyPaystackPayment);
  const [busy, setBusy] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const getAuthHeaders = async () => {
    const token = session?.access_token ?? (await supabase.auth.getSession()).data.session?.access_token;
    if (!token || isPreviewMode) {
      throw new Error("Please sign in with a real account before starting checkout.");
    }
    return { Authorization: `Bearer ${token}` };
  };

  // After callback from Paystack, verify the transaction
  useEffect(() => {
    const ref = search.reference || search.trxref;
    if (!ref || verifying) return;
    setVerifying(true);
    (async () => {
      try {
        const result = await verifyFn({ data: { reference: ref }, headers: await getAuthHeaders() });
        if (result.status === "success") {
          toast.success(`Payment confirmed — +${result.credits} paid credits`);
          await refreshProfile();
        } else if (result.status === "pending") {
          toast.message("Payment is still processing. We'll credit you automatically.");
        } else {
          toast.error(`Payment ${result.status}.`);
        }
      } catch (e: any) {
        toast.error(e.message ?? "Could not verify payment");
      } finally {
        setVerifying(false);
        navigate({ to: "/buy", search: {} as any, replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.reference, search.trxref]);

  const purchase = async (packId: "starter" | "researcher" | "lab") => {
    setBusy(packId);
    try {
      const callback_url = `${window.location.origin}/buy`;
      const { authorization_url } = await initFn({ data: { pack: packId, callback_url }, headers: await getAuthHeaders() });
      window.location.href = authorization_url;
    } catch (err: any) {
      toast.error(err.message ?? "Could not start checkout");
      setBusy(null);
    }
  };

  return (
    <div>
      <button onClick={() => history.back()} className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back
      </button>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Power up</p>
      <h1 className="mt-1 font-serif text-5xl leading-[0.95]">Buy <em className="text-primary">paid credits.</em></h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Pay securely with <strong>Paystack</strong> — card, mobile money, bank transfer, or USSD. Paid credits never expire and unlock targeting, boosting, premium placement, and large response goals.
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Current balance: <strong>{profile?.paid_credits ?? 0}</strong> paid · {profile?.earned_credits ?? 0} earned
      </p>

      {verifying && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          Verifying your payment…
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {PACKS.map((p) => {
          const per = (p.price / p.credits).toFixed(2);
          const isFeatured = p.badge === "Most popular";
          return (
            <div key={p.id} className={`relative rounded-3xl p-6 shadow-paper border-2 ${
              isFeatured ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 bg-card"
            }`}>
              {p.badge && (
                <span className="absolute -top-2 right-4 rounded-full bg-highlight px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-highlight-foreground">
                  {p.badge}
                </span>
              )}
              <p className="text-[11px] uppercase tracking-[0.25em] opacity-70">{p.label}</p>
              <p className="mt-2 font-serif text-6xl leading-none">{p.credits}</p>
              <p className="mt-1 text-xs opacity-80">paid credits · {p.currency} {per} each</p>
              <p className="mt-6 font-serif text-3xl">{p.currency} {p.price}</p>
              <Button
                onClick={() => purchase(p.id)}
                disabled={busy !== null || verifying}
                className={`mt-4 h-11 w-full rounded-full ${isFeatured ? "bg-highlight text-highlight-foreground hover:bg-highlight/90" : "bg-primary text-primary-foreground"}`}
              >
                {busy === p.id ? "Redirecting…" : <><Zap className="mr-1 h-4 w-4" /> Pay with Paystack</>}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-3xl border border-foreground/15 bg-card p-6">
        <p className="font-serif text-2xl">Why paid?</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
          {[
            "Target by department and year",
            "Pin your survey at the top of the feed",
            "Reach 100, 250, or 1,000 verified students",
            "Instant publish — skip the standard queue",
            "Export analytics to CSV / PDF",
            "Credits never expire",
          ].map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-primary" /> {f}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
        <ShieldCheck className="h-3 w-3" /> Payments processed securely by Paystack · <Sparkles className="h-3 w-3" /> Ghana-first
      </p>
    </div>
  );
}
