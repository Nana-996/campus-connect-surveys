import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldAlert, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
});

function Admin() {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [flags, setFlags] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      const ok = !!data;
      setAllowed(ok);
      if (ok) {
        const [{ data: f }, { data: t }] = await Promise.all([
          supabase.from("review_flags").select("*").eq("resolved", false).order("created_at", { ascending: false }),
          supabase.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(50),
        ]);
        setFlags(f ?? []);
        setTxs(t ?? []);
      }
    })();
  }, [user]);

  const resolve = async (id: string) => {
    await supabase.from("review_flags").update({ resolved: true }).eq("id", id);
    setFlags((f) => f.filter((x) => x.id !== id));
    toast.success("Flag cleared");
  };

  if (allowed === null) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!allowed) {
    return (
      <div className="rounded-3xl border border-foreground/15 bg-card p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-3 font-serif text-3xl">Admins only.</p>
        <p className="mt-1 text-sm text-muted-foreground">Your account doesn't have the admin role.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
      <h1 className="mt-1 font-serif text-5xl leading-[0.95]">Review <em className="text-primary">queue.</em></h1>

      {flags.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-foreground/30 bg-card p-10 text-center">
          <p className="font-serif text-2xl">No open flags.</p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {flags.map((f) => (
            <li key={f.id} className="rounded-2xl border border-foreground/15 bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">{f.type}</p>
                  <p className="mt-1 font-mono text-xs">user: {f.user_id}</p>
                  <pre className="mt-2 overflow-x-auto rounded bg-secondary p-2 text-[11px]">{JSON.stringify(f.details, null, 2)}</pre>
                  <p className="mt-1 text-[11px] text-muted-foreground">{new Date(f.created_at).toLocaleString()}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => resolve(f.id)}>
                  <Check className="mr-1 h-3.5 w-3.5" /> Clear
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 font-serif text-3xl">Transactions</h2>
      <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Latest 50 Paystack payments</p>
      {txs.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-foreground/30 bg-card p-6 text-center text-sm text-muted-foreground">
          No transactions yet.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-foreground/15 bg-card">
          <table className="w-full text-xs">
            <thead className="bg-secondary text-left uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Credits</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id} className="border-t border-foreground/10">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono">{t.reference}</td>
                  <td className="px-3 py-2 font-mono">{t.user_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2">{t.currency} {(t.amount_minor / 100).toFixed(2)}</td>
                  <td className="px-3 py-2">{t.credits}</td>
                  <td className={`px-3 py-2 font-semibold uppercase ${
                    t.status === "success" ? "text-primary" :
                    t.status === "failed" || t.status === "abandoned" ? "text-destructive" :
                    "text-muted-foreground"
                  }`}>{t.status}{t.failure_reason ? ` · ${t.failure_reason}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
