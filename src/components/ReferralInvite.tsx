import { useEffect, useState } from "react";
import { Copy, Check, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  REFERRAL_REWARD_GENERAL,
  REFERRAL_REWARD_STUDENT,
  referralLink,
  referralShareMessage,
  referralShareText,
} from "@/lib/referral";

/**
 * Post-completion invitation to refer others. Real referral plumbing:
 * each member has a unique code, and credits are awarded server-side once
 * per referred account.
 */
export function ReferralInvite({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      const [{ data: rpcCode }, { count: n }] = await Promise.all([
        supabase.rpc("my_referral_code"),
        supabase
          .from("referrals")
          .select("id", { count: "exact", head: true })
          .eq("referrer_id", user.id),
      ]);
      if (!active) return;
      if (typeof rpcCode === "string") setCode(rpcCode);
      if (typeof n === "number") setCount(n);
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  if (!user) return null;

  const link = code ? referralLink(code) : "";

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(referralShareMessage(code));
      setCopied(true);
      toast.success("Referral message and link copied.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy — select the link and copy it manually.");
    }
  };

  const share = async () => {
    if (!code) return;
    const payload = {
      title: "Join me on CampusVerify",
      text: referralShareText(),
      url: link,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        /* dismissed — fall back to copy */
      }
    }
    await copy();
  };

  return (
    <div className={`rounded-3xl border border-foreground/15 bg-card p-6 text-left shadow-paper ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
        Invite &amp; earn
      </p>
      <h2 className="mt-2 font-serif text-3xl leading-[1.05]">
        Bring someone in — earn more credits.
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Every verified member you refer makes responses easier to find for everyone.
        Credits land in your wallet automatically once their account is registered.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <p className="font-serif text-3xl text-primary">+{REFERRAL_REWARD_STUDENT}</p>
          <p className="mt-0.5 text-xs font-semibold">credits per student account</p>
          <p className="text-[11px] text-muted-foreground">registered with an academic email</p>
        </div>
        <div className="rounded-2xl border border-foreground/15 bg-background/60 p-4">
          <p className="font-serif text-3xl text-primary">+{REFERRAL_REWARD_GENERAL}</p>
          <p className="mt-0.5 text-xs font-semibold">credits per general account</p>
          <p className="text-[11px] text-muted-foreground">researchers and everyone else</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-foreground/25 bg-background/60 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Your referral link
        </p>
        <p className="mt-1 break-all font-mono text-xs text-foreground">
          {link || "Preparing your link…"}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button onClick={share} disabled={!code} size="lg" className="rounded-full bg-primary sm:flex-1">
          <Share2 className="mr-2 h-4 w-4" /> Share referral link
        </Button>
        <Button onClick={copy} disabled={!code} variant="outline" size="lg" className="rounded-full sm:flex-1">
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copied" : "Copy link & message"}
        </Button>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        {count === null
          ? "Rewards are counted once per referred account."
          : `${count} account${count === 1 ? "" : "s"} referred so far · rewarded once per account.`}
      </p>
    </div>
  );
}
