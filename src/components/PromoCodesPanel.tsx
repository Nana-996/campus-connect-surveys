import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Promo = {
  id: string; code: string; bonus_credits: number; discount_percent: number;
  expires_at: string | null; max_uses: number | null; uses_count: number;
  is_active: boolean; note: string | null; created_at: string;
};

const db = supabase as unknown as { from: (t: string) => any };

function randomCode(prefix: string) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const buf = new Uint32Array(10);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 10; i++) s += chars[buf[i] % chars.length];
  return `${prefix}${prefix ? "-" : ""}${s}`;
}

export function PromoCodesPanel() {
  const qc = useQueryClient();
  const { data: codes = [], isPending } = useQuery({
    queryKey: ["admin", "promo-codes"],
    queryFn: async () => {
      const { data, error } = await db.from("promo_codes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Promo[];
    },
  });

  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [code, setCode] = useState("");
  const [prefix, setPrefix] = useState("");
  const [count, setCount] = useState(10);
  const [bonus, setBonus] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [expires, setExpires] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (bonus <= 0 && discount <= 0) return toast.error("Give bonus credits or a discount.");
    const list =
      mode === "single"
        ? [code.trim().toUpperCase()]
        : Array.from({ length: Math.min(Math.max(count, 1), 500) }, () => randomCode(prefix.trim().toUpperCase()));
    if (list.some((c) => !/^[A-Z0-9_-]{3,32}$/.test(c))) return toast.error("Codes need 3–32 letters, numbers, - or _.");
    setBusy(true);
    const { error } = await db.from("promo_codes").insert(
      list.map((c) => ({
        code: c,
        bonus_credits: bonus,
        discount_percent: discount,
        expires_at: expires ? new Date(expires).toISOString() : null,
        max_uses: mode === "bulk" ? 1 : maxUses ? Number(maxUses) : null,
        note: note || null,
      })),
    );
    setBusy(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "That code already exists." : error.message);
    toast.success(`${list.length} code${list.length > 1 ? "s" : ""} created`);
    if (mode === "bulk") {
      await navigator.clipboard?.writeText(list.join("\n")).catch(() => {});
      toast.message("Codes copied to your clipboard");
    }
    setCode("");
    qc.invalidateQueries({ queryKey: ["admin", "promo-codes"] });
  };

  const toggle = async (p: Promo) => {
    const { error } = await db.from("promo_codes").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "promo-codes"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl">Promo codes</h2>
        <p className="text-sm text-muted-foreground">
          Give faculties, student groups or research partners free credits or a discount on credit packs.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex gap-2">
          <Button size="sm" variant={mode === "single" ? "default" : "outline"} onClick={() => setMode("single")}>One code</Button>
          <Button size="sm" variant={mode === "bulk" ? "default" : "outline"} onClick={() => setMode("bulk")}>Bulk (single-use)</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {mode === "single" ? (
            <label className="text-sm">Code
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MEDWEEK26" />
            </label>
          ) : (
            <>
              <label className="text-sm">Prefix (optional)
                <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} placeholder="GPSA" />
              </label>
              <label className="text-sm">How many
                <Input type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value))} />
              </label>
            </>
          )}
          <label className="text-sm">Bonus credits
            <Input type="number" min={0} max={1000} value={bonus} onChange={(e) => setBonus(Number(e.target.value))} />
          </label>
          <label className="text-sm">Discount on credit packs (%)
            <Input type="number" min={0} max={90} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </label>
          <label className="text-sm">Expires (optional)
            <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </label>
          {mode === "single" && (
            <label className="text-sm">Max total uses (optional)
              <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
            </label>
          )}
          <label className="text-sm sm:col-span-2">Note (who it's for)
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pharmacy students association" />
          </label>
        </div>
        <Button onClick={create} disabled={busy}>{busy ? "Creating…" : "Create"}</Button>
        <p className="text-xs text-muted-foreground">Each person can use a code once.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Code</th><th className="p-3">Gives</th><th className="p-3">Used</th><th className="p-3">Expires</th><th className="p-3">Note</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {isPending && <tr><td className="p-3" colSpan={6}>Loading…</td></tr>}
            {!isPending && codes.length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={6}>No codes yet.</td></tr>}
            {codes.map((p) => (
              <tr key={p.id} className={`border-t border-border ${p.is_active ? "" : "opacity-50"}`}>
                <td className="p-3 font-mono">
                  <button className="inline-flex items-center gap-1" onClick={() => navigator.clipboard?.writeText(p.code).then(() => toast.success("Copied"))}>
                    {p.code} <Copy className="h-3 w-3" />
                  </button>
                </td>
                <td className="p-3">
                  {[p.bonus_credits ? `${p.bonus_credits} credits` : "", p.discount_percent ? `${p.discount_percent}% off` : ""].filter(Boolean).join(" + ")}
                </td>
                <td className="p-3">{p.uses_count}{p.max_uses ? ` / ${p.max_uses}` : ""}</td>
                <td className="p-3">{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "Never"}</td>
                <td className="p-3 text-muted-foreground">{p.note}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => toggle(p)}>{p.is_active ? "Switch off" : "Switch on"}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
