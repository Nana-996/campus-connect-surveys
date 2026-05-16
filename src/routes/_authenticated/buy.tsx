import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Check, ArrowLeft } from "lucide-react";
import { PACKS } from "@/lib/credits";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/buy")({
  component: BuyPage,
});

function BuyPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<number | null>(null);

  const purchase = async (credits: number, price: number) => {
    if (!user) return;
    setBusy(credits);
    try {
      const { error: pErr } = await supabase.from("profiles")
        .update({ paid_credits: (profile?.paid_credits ?? 0) + credits })
        .eq("id", user.id);
      if (pErr) throw pErr;
      await supabase.from("credit_ledger").insert({
        user_id: user.id, wallet: "paid", delta: credits,
        reason: `purchase_demo_${price}`,
      });
      await refreshProfile();
      toast.success(`+${credits} paid credits added (demo)`);
      navigate({ to: "/create" });
    } catch (err: any) {
      toast.error(err.message ?? "Purchase failed");
    } finally {
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
        Paid credits never expire and unlock <strong>targeting</strong>, <strong>boosting</strong>, <strong>premium placement</strong>, and <strong>large response goals</strong>. Earn credits stay useful for casual posts.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {PACKS.map((p) => {
          const per = (p.price / p.credits).toFixed(2);
          const isFeatured = !!p.badge && p.badge === "Most popular";
          return (
            <div key={p.credits} className={`relative rounded-3xl p-6 shadow-paper border-2 ${
              isFeatured ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 bg-card"
            }`}>
              {p.badge && (
                <span className="absolute -top-2 right-4 rounded-full bg-highlight px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-highlight-foreground">
                  {p.badge}
                </span>
              )}
              <p className="text-[11px] uppercase tracking-[0.25em] opacity-70">{p.label}</p>
              <p className="mt-2 font-serif text-6xl leading-none">{p.credits}</p>
              <p className="mt-1 text-xs opacity-80">paid credits · ${per} each</p>
              <p className="mt-6 font-serif text-3xl">${p.price}</p>
              <Button
                onClick={() => purchase(p.credits, p.price)}
                disabled={busy !== null}
                className={`mt-4 h-11 w-full rounded-full ${isFeatured ? "bg-highlight text-highlight-foreground hover:bg-highlight/90" : "bg-primary text-primary-foreground"}`}
              >
                {busy === p.credits ? "Processing…" : <><Zap className="mr-1 h-4 w-4" /> Buy instantly</>}
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

      <p className="mt-6 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
        <Sparkles className="inline h-3 w-3" /> Demo checkout — wire Stripe next.
      </p>
    </div>
  );
}
