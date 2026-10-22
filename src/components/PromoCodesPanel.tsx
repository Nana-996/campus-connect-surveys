import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Dices, Pencil, Search, Share2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Promo = {
  id: string; code: string; bonus_credits: number; discount_percent: number;
  expires_at: string | null; max_uses: number | null; uses_count: number;
  is_active: boolean; note: string | null; created_at: string;
};
type Redemption = { id: string; code_id: string; kind: string; credits_granted: number; discount_percent: number; created_at: string };
type Status = "active" | "off" | "expired" | "used_up";

const db = supabase as unknown as { from: (t: string) => any };
const SITE = "https://www.campus-verify.live/pricing";

function randomCode(prefix: string, len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[buf[i] % chars.length];
  return `${prefix}${prefix ? "-" : ""}${s}`;
}

function statusOf(p: Promo): Status {
  if (!p.is_active) return "off";
  if (p.expires_at && new Date(p.expires_at) < new Date()) return "expired";
  if (p.max_uses && p.uses_count >= p.max_uses) return "used_up";
  return "active";
}
const STATUS_LABEL: Record<Status, string> = { active: "Working", off: "Switched off", expired: "Expired", used_up: "Used up" };
const STATUS_CLASS: Record<Status, string> = {
  active: "bg-primary/10 text-primary",
  off: "bg-muted text-muted-foreground",
  expired: "bg-destructive/10 text-destructive",
  used_up: "bg-accent text-accent-foreground",
};

function gives(p: Pick<Promo, "bonus_credits" | "discount_percent">) {
  return [p.bonus_credits ? `${p.bonus_credits} free credits` : "", p.discount_percent ? `${p.discount_percent}% off credit packs` : ""]
    .filter(Boolean).join(" + ");
}
function shareText(p: Promo) {
  const exp = p.expires_at ? ` Valid until ${new Date(p.expires_at).toLocaleDateString()}.` : "";
  return `Use promo code ${p.code} on CampusVerify to get ${gives(p)}.${exp} Redeem it on the Pricing page: ${SITE}`;
}
const copy = (t: string, msg = "Copied") => navigator.clipboard?.writeText(t).then(() => toast.success(msg)).catch(() => toast.error("Couldn't copy"));

const PRESETS = [
  { label: "10 free credits", bonus: 10, discount: 0 },
  { label: "25 free credits", bonus: 25, discount: 0 },
  { label: "20% off packs", bonus: 0, discount: 20 },
  { label: "10 credits + 10% off", bonus: 10, discount: 10 },
];

export function PromoCodesPanel() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "promo-codes"] });
  const { data, isPending, error: loadError } = useQuery({
    queryKey: ["admin", "promo-codes"],
    queryFn: async () => {
      const [c, r] = await Promise.all([
        db.from("promo_codes").select("*").order("created_at", { ascending: false }),
        db.from("promo_redemptions").select("id, code_id, kind, credits_granted, discount_percent, created_at").order("created_at", { ascending: false }).limit(1000),
      ]);
      if (c.error) throw c.error;
      return { codes: (c.data ?? []) as Promo[], redemptions: (r.data ?? []) as Redemption[] };
    },
  });
  const codes = data?.codes ?? [];
  const redemptions = data?.redemptions ?? [];

  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [code, setCode] = useState("");
  const [prefix, setPrefix] = useState("");
  const [count, setCount] = useState(10);
  const [bonus, setBonus] = useState(10);
  const [discount, setDiscount] = useState(0);
  const [expires, setExpires] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [editing, setEditing] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = codes.filter((c) => statusOf(c) === "active").length;
    const credits = redemptions.reduce((s, r) => s + (r.credits_granted || 0), 0);
    const week = redemptions.filter((r) => Date.now() - new Date(r.created_at).getTime() < 7 * 864e5).length;
    return { active, uses: codes.reduce((s, c) => s + c.uses_count, 0), credits, week };
  }, [codes, redemptions]);

  const lastUsed = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of redemptions) if (!m.has(r.code_id)) m.set(r.code_id, r.created_at);
    return m;
  }, [redemptions]);

  const shown = codes.filter((c) => {
    if (filter !== "all" && statusOf(c) !== filter) return false;
    const s = q.trim().toLowerCase();
    return !s || c.code.toLowerCase().includes(s) || (c.note ?? "").toLowerCase().includes(s);
  });

  const create = async () => {
    if (bonus <= 0 && discount <= 0) return toast.error("Give free credits, a discount, or both.");
    if (bonus > 1000) return toast.error("Free credits can be at most 1000.");
    if (discount > 90) return toast.error("Discount can be at most 90%.");
    const list = mode === "single"
      ? [code.trim().toUpperCase()]
      : Array.from({ length: Math.min(Math.max(count, 1), 500) }, () => randomCode(prefix.trim().toUpperCase()));
    if (list.some((c) => !/^[A-Z0-9_-]{3,32}$/.test(c))) return toast.error("Codes need 3–32 letters, numbers, - or _.");
    if (expires && new Date(`${expires}T23:59:59`) < new Date()) return toast.error("The expiry date is in the past.");
    setBusy(true);
    const { data: created, error } = await db.from("promo_codes").insert(
      list.map((c) => ({
        code: c,
        bonus_credits: bonus,
        discount_percent: discount,
        expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
        max_uses: mode === "bulk" ? 1 : maxUses ? Number(maxUses) : null,
        note: note.trim() || null,
      })),
    ).select();
    setBusy(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "That code already exists — pick another." : error.message);
    if (mode === "bulk") copy(list.join("\n"), `${list.length} codes created and copied`);
    else if (created?.[0]) copy(shareText(created[0] as Promo), "Code created — share message copied");
    setCode("");
    refresh();
  };

  const update = async (id: string, patch: Partial<Promo>) => {
    const { error } = await db.from("promo_codes").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
    return true;
  };

  const remove = async (p: Promo) => {
    if (!confirm(`Delete ${p.code}? It has never been used.`)) return;
    const { error } = await db.from("promo_codes").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl">Promo codes</h2>
        <p className="text-sm text-muted-foreground">
          Give groups, partners or researchers free credits or a discount. People redeem codes on the Pricing or Buy Credits page.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Working codes", stats.active], ["Total uses", stats.uses], ["Uses this week", stats.week], ["Free credits given", stats.credits]].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="font-serif text-2xl">{v}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h3 className="font-medium">Create a code</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={mode === "single" ? "default" : "outline"} onClick={() => setMode("single")}>One shared code</Button>
          <Button size="sm" variant={mode === "bulk" ? "default" : "outline"} onClick={() => setMode("bulk")}>Many one-time codes</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => { setBonus(p.bonus); setDiscount(p.discount); }}
              className={`rounded-full border px-3 py-1 text-xs ${bonus === p.bonus && discount === p.discount ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {mode === "single" ? (
            <label className="text-sm">Code
              <div className="flex gap-2">
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="MEDWEEK26" />
                <Button type="button" variant="outline" size="icon" aria-label="Make a random code" onClick={() => setCode(randomCode("", 8))}><Dices className="h-4 w-4" /></Button>
              </div>
            </label>
          ) : (
            <>
              <label className="text-sm">Start each code with (optional)
                <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="GPSA" />
              </label>
              <label className="text-sm">How many codes
                <Input type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value))} />
              </label>
            </>
          )}
          <label className="text-sm">Free credits
            <Input type="number" min={0} max={1000} value={bonus} onChange={(e) => setBonus(Number(e.target.value))} />
          </label>
          <label className="text-sm">Discount on credit packs (%)
            <Input type="number" min={0} max={90} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </label>
          <label className="text-sm">Last day it works (optional)
            <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </label>
          {mode === "single" && (
            <label className="text-sm">Max number of people (optional)
              <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="No limit" />
            </label>
          )}
          <label className="text-sm sm:col-span-2">Who it's for (private note)
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pharmacy students association" />
          </label>
        </div>
        {(bonus > 0 || discount > 0) && (
          <p className="rounded-md bg-muted/50 p-2 text-xs">
            Each person gets <strong>{gives({ bonus_credits: bonus, discount_percent: discount })}</strong>, once.
            {mode === "bulk" ? ` ${Math.min(Math.max(count, 1), 500)} codes, each usable by one person.` : maxUses ? ` Up to ${maxUses} people.` : " No limit on people."}
          </p>
        )}
        <Button onClick={create} disabled={busy}>{busy ? "Creating…" : "Create and copy"}</Button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code or note" />
          </div>
          <div className="flex flex-wrap gap-1">
            {(["all", "active", "used_up", "expired", "off"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : STATUS_LABEL[f]}
              </Button>
            ))}
          </div>
        </div>

        {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
        {loadError && <p className="text-sm text-destructive">Couldn't load codes. Refresh the page to try again.</p>}
        {!isPending && shown.length === 0 && <p className="text-sm text-muted-foreground">{codes.length ? "No codes match." : "No codes yet — create your first one above."}</p>}

        <ul className="space-y-2">
          {shown.map((p) => {
            const st = statusOf(p);
            const last = lastUsed.get(p.id);
            return (
              <li key={p.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button className="inline-flex items-center gap-1 font-mono text-base font-medium" onClick={() => copy(p.code)}>
                      {p.code} <Copy className="h-3.5 w-3.5" />
                    </button>
                    <div className="text-sm">{gives(p)}</div>
                    {p.note && <div className="text-xs text-muted-foreground">{p.note}</div>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[st]}`}>{STATUS_LABEL[st]}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Used {p.uses_count}{p.max_uses ? ` of ${p.max_uses}` : ""}</span>
                  {p.max_uses && <span className="inline-block h-1.5 w-20 self-center overflow-hidden rounded bg-muted"><span className="block h-full bg-primary" style={{ width: `${Math.min(100, (p.uses_count / p.max_uses) * 100)}%` }} /></span>}
                  <span>Ends {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "never"}</span>
                  <span>Last used {last ? new Date(last).toLocaleDateString() : "never"}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(shareText(p), "Share message copied")}><Share2 className="mr-1 h-3.5 w-3.5" />Copy message</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(editing === p.id ? null : p.id)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => update(p.id, { is_active: !p.is_active })}>{p.is_active ? "Switch off" : "Switch on"}</Button>
                  {p.uses_count === 0 && <Button size="sm" variant="ghost" onClick={() => remove(p)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>}
                </div>
                {editing === p.id && <EditRow p={p} onSave={async (patch) => { if (await update(p.id, patch)) { toast.success("Saved"); setEditing(null); } }} />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function EditRow({ p, onSave }: { p: Promo; onSave: (patch: Partial<Promo>) => void }) {
  const [exp, setExp] = useState(p.expires_at ? p.expires_at.slice(0, 10) : "");
  const [max, setMax] = useState(p.max_uses ? String(p.max_uses) : "");
  const [note, setNote] = useState(p.note ?? "");
  return (
    <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-3">
      <label className="text-xs">Last day it works
        <Input type="date" value={exp} onChange={(e) => setExp(e.target.value)} />
      </label>
      <label className="text-xs">Max number of people
        <Input type="number" min={Math.max(1, p.uses_count)} value={max} onChange={(e) => setMax(e.target.value)} placeholder="No limit" />
      </label>
      <label className="text-xs">Private note
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="sm:col-span-3">
        <Button size="sm" onClick={() => {
          if (max && Number(max) < p.uses_count) return toast.error(`Already used ${p.uses_count} times — the limit can't be lower.`);
          onSave({ expires_at: exp ? new Date(`${exp}T23:59:59`).toISOString() : null, max_uses: max ? Number(max) : null, note: note.trim() || null });
        }}>Save changes</Button>
        <p className="mt-1 text-xs text-muted-foreground">What a code gives can't change after creation — make a new code instead.</p>
      </div>
    </div>
  );
}
