import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listPartners, savePartner, markPartnerPaid, type Partner } from "@/lib/partners.functions";
import { PartnerProgress, StatGrid, cycleProgress } from "@/components/PartnerProgress";
import { siteUrl } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin-partners")({
  component: AdminPartners,
  head: () => ({
    meta: [
      { title: "Partners — CampusVerify admin" },
      { name: "description", content: "Private partner referral tracking." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const empty = { name: "", slug: "", partner_email: "", contact: "", target_paying: 50, reward_note: "", is_active: true };

function AdminPartners() {
  const qc = useQueryClient();
  const list = useServerFn(listPartners);
  const save = useServerFn(savePartner);
  const pay = useServerFn(markPartnerPaid);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-partners"], queryFn: () => list() });
  const [form, setForm] = useState<typeof empty & { id?: string }>(empty);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ data: { ...form, target_paying: Number(form.target_paying) } });
      toast.success(form.id ? "Partner updated" : "Partner added");
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const edit = (p: Partner) =>
    setForm({ id: p.id, name: p.name, slug: p.slug, partner_email: p.partner_email, contact: p.contact ?? "", target_paying: p.target_paying, reward_note: p.reward_note ?? "", is_active: p.is_active });

  const markPaid = async (id: string) => {
    if (!confirm("Confirm you have paid this partner for the current milestone?")) return;
    try {
      await pay({ data: { id } });
      toast.success("Payout recorded");
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground"><ArrowLeft className="mr-1 h-4 w-4" /> Admin</Link>
      <div>
        <h1 className="font-serif text-4xl">Partner <em className="text-primary">referrals.</em></h1>
        <p className="mt-1 text-sm text-muted-foreground">Influencers and research groups. Partners sign in with their listed email and open /partner to see their own progress.</p>
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">{form.id ? "Edit partner" : "Add partner"}</h2>
        <div><Label>Name</Label><Input required value={form.name} onChange={set("name")} /></div>
        <div><Label>Link name (campus-verify.live/p/…)</Label><Input required value={form.slug} onChange={set("slug")} placeholder="pulse" /></div>
        <div><Label>Partner's login email</Label><Input required type="email" value={form.partner_email} onChange={set("partner_email")} /></div>
        <div><Label>WhatsApp / phone (optional)</Label><Input value={form.contact} onChange={set("contact")} /></div>
        <div><Label>Paying customers per milestone</Label><Input required type="number" min={1} value={form.target_paying} onChange={set("target_paying")} /></div>
        <div><Label>Agreed reward</Label><Input value={form.reward_note} onChange={set("reward_note")} placeholder="GHS 500 per milestone" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy}>{form.id ? "Save changes" : "Add partner"}</Button>
          {form.id && <Button type="button" variant="ghost" onClick={() => setForm(empty)}>Cancel</Button>}
        </div>
      </form>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {data?.length === 0 && <p className="text-sm text-muted-foreground">No partners yet.</p>}
      <div className="space-y-4">
        {data?.map((p) => {
          const due = cycleProgress(p.stats.paying, p.target_paying, p.milestones_paid).reached;
          return (
            <section key={p.id} className="space-y-3 rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{p.name} {!p.is_active && <span className="text-xs text-muted-foreground">(inactive)</span>}</h3>
                  <p className="break-all text-xs text-muted-foreground">{siteUrl(`/p/${p.slug}`)} · {p.partner_email}{p.contact ? ` · ${p.contact}` : ""}</p>
                  {p.reward_note && <p className="text-xs">Reward: {p.reward_note}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => edit(p)}>Edit</Button>
                  <Button size="sm" disabled={!due} onClick={() => markPaid(p.id)}>Mark milestone paid</Button>
                </div>
              </div>
              <PartnerProgress stats={p.stats} target={p.target_paying} paid={p.milestones_paid} />
              <p className="text-xs text-muted-foreground">Milestones paid: {p.milestones_paid}{p.last_paid_at ? ` · last ${new Date(p.last_paid_at).toLocaleDateString()}` : ""}</p>
              <StatGrid stats={p.stats} clicks={p.clicks} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
