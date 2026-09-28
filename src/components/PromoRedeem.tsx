import { useState } from "react";
import { toast } from "sonner";
import { Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Redeem a promo code for bonus credits. Discount codes are handed back via onDiscount. */
export function PromoRedeem({ onDiscount }: { onDiscount?: (code: string, pct: number) => void }) {
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const redeem = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("redeem_promo_code" as never, { _code: c } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    const res = data as unknown as { credits: number; discount_percent: number; message: string };
    if (res.credits > 0) await refreshProfile();
    if (res.discount_percent > 0 && onDiscount) onDiscount(c, res.discount_percent);
    toast.success(res.message);
    setCode("");
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Ticket className="h-4 w-4 text-primary" /> Have a promo code?
      </div>
      <div className="flex flex-1 gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. CAMPUSLAUNCH"
          maxLength={32}
          onKeyDown={(e) => e.key === "Enter" && redeem()}
        />
        <Button onClick={redeem} disabled={busy || !code.trim()}>
          {busy ? "Checking…" : "Redeem"}
        </Button>
      </div>
    </div>
  );
}
