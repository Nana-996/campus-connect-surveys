import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listPartners, savePartner, markPartnerPaid, type Partner } from "@/lib/partners.functions";
import { PartnerProgress, StatGrid, cycleProgress } from "@/components/PartnerProgress";
import { siteUrl } from "@/lib/site";
import { ActivityList, FunnelInsights, copyText } from "@/components/PartnerExtras";
import { PartnerPayoutHistory } from "@/components/PartnerPayoutHistory";

export const Route = createFileRoute("/_authenticated/admin-partners")({
  component: AdminPartners,
  head: () => ({
    meta: [
      { title: "Partners — CampusVerify admin" },
      { name: "description", content: "Private partner referral tracking." },
      { property: "og:title", content: "Partners — CampusVerify admin" },
      { property: "og:description", content: "Private partner referral tracking and manual payouts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-partners"], queryFn: () => list(), retry: false });
  const [form, setForm] = useState<typeof empty & { id?: string }>(empty);
  const [busy, setBusy] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "due" | "active" | "inactive">("all");
  const [sort, setSort] = useState<"newest" | "paying" | "signups" | "recent">("newest");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ data: { ...form, target_paying: Number(form.target_paying) } });
      toast.success(form.id ? "Partner updated" : "Partner added");
      setForm(empty);
      setShowForm(false);
      setSlugTouched(false);
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const edit = (p: Partner) => {
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setForm({ id: p.id, name: p.name, slug: p.slug, partner_email: p.partner_email, contact: p.contact ?? "", target_paying: p.target_paying, reward_note: p.reward_note ?? "", is_active: p.is_active });
  };

  const markPaid = async (id: string, expectedPaid: number) => {
    if (!confirm("Confirm you have paid this partner for the current milestone?")) return;
    setPayingId(id);
    try {
      await pay({ data: { id, expectedPaid } });
      toast.success("Payout recorded");
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPayingId(null);
    }
  };

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Checking access…</p>;
  if (error) return <div className="p-8"><h1 className="font-serif text-3xl">Private administration area.</h1><p className="mt-2 text-sm text-muted-foreground">{/forbidden|owner only/i.test(error.message) ? "Only the CampusVerify app owner can open this page." : "Could not verify access. Please try again."}</p><Button asChild className="mt-4"><Link to="/feed">Go to feed</Link></Button></div>;

  const all = data ?? [];
  const isDue = (p: (typeof all)[number]) => cycleProgress(p.stats.paying, p.target_paying, p.milestones_paid).reached;
  const totals = all.reduce((t, p) => ({ clicks: t.clicks + p.clicks, signups: t.signups + p.stats.signups, paying: t.paying + p.stats.paying, revenue: t.revenue + Number(p.stats.revenue_ghs) }), { clicks: 0, signups: 0, paying: 0, revenue: 0 });
  const dueList = all.filter(isDue);
  const shown = all
    .filter((p) => filter === "all" || (filter === "due" ? isDue(p) : filter === "active" ? p.is_active : !p.is_active))
    .filter((p) => { const s = q.trim().toLowerCase(); return !s || [p.name, p.slug, p.partner_email, p.contact ?? ""].some((v) => v.toLowerCase().includes(s)); })
    .sort((a, b) => sort === "paying" ? b.stats.paying - a.stats.paying : sort === "signups" ? b.stats.signups - a.stats.signups : sort === "recent" ? (b.stats.activity[0]?.at ?? "").localeCompare(a.stats.activity[0]?.at ?? "") : b.created_at.localeCompare(a.created_at));

  const welcome = (p: Partner) => `Hi ${p.name}, welcome to the CampusVerify partner programme!\n\nYour referral link: ${siteUrl(`/p/${p.slug}`)}\n\nTo track your progress, sign up or log in with ${p.partner_email} and open ${siteUrl("/partner")}.\n\nYou'll be paid ${p.reward_note || "the agreed reward"} for every ${p.target_paying} paying customers. Questions: founder@campus-verify.live`;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground"><ArrowLeft className="mr-1 h-4 w-4" /> Admin</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Partner <em className="text-primary">referrals.</em></h1>
          <p className="mt-1 text-sm text-muted-foreground">Influencers and research groups. Partners sign in with their listed email and open /partner to see their own progress.</p>
        </div>
        {!showForm && <Button onClick={() => { setForm(empty); setShowForm(true); }}><Plus className="mr-1 h-4 w-4" />Add partner</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([["Partners", `${all.filter((p) => p.is_active).length} active`], ["Link visits", totals.clicks], ["Sign-ups", totals.signups], ["Paying customers", totals.paying], ["Revenue", `GHS ${totals.revenue.toFixed(2)}`]] as const).map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="font-serif text-2xl">{v}</p></div>
        ))}
      </div>

      {dueList.length > 0 && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
          <p className="font-semibold">Payout due for {dueList.length} partner{dueList.length > 1 ? "s" : ""}</p>
          <p className="text-muted-foreground">{dueList.map((p) => `${p.name}${p.reward_note ? ` (${p.reward_note})` : ""}`).join(", ")}. Pay them, then press "Mark milestone paid".</p>
        </div>
      )}

      {showForm && (
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">{form.id ? "Edit partner" : "Add partner"}</h2>
        <div><Label>Name</Label><Input required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.id || slugTouched ? form.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) })} /></div>
        <div><Label>Link name</Label><Input required pattern="[a-z0-9-]{2,40}" maxLength={40} value={form.slug} onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }); }} placeholder="pulse" />
          <p className="mt-1 break-all text-xs text-muted-foreground">{siteUrl(`/p/${form.slug || "…"}`)}</p></div>
        <div><Label>Partner's login email</Label><Input required type="email" value={form.partner_email} onChange={set("partner_email")} /></div>
        <div><Label>WhatsApp / phone (optional)</Label><Input value={form.contact} onChange={set("contact")} /></div>
        <div><Label>Paying customers per milestone</Label><Input required type="number" min={1} max={100000} disabled={Boolean(form.id && data?.find((p) => p.id === form.id)?.milestones_paid)} value={form.target_paying} onChange={set("target_paying")} /></div>
        <div><Label>Agreed reward</Label><Input value={form.reward_note} onChange={set("reward_note")} placeholder="GHS 500 per milestone" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy}>{form.id ? "Save changes" : "Add partner"}</Button>
          <Button type="button" variant="ghost" onClick={() => { setForm(empty); setShowForm(false); setSlugTouched(false); }}>Cancel</Button>
        </div>
      </form>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, link, email or phone" />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", "due", "active", "inactive"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{{ all: "All", due: "Payout due", active: "Active", inactive: "Inactive" }[f]}</Button>
          ))}
          <select aria-label="Sort partners" className="h-9 rounded-md border bg-background px-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="newest">Newest</option><option value="paying">Most paying</option><option value="signups">Most sign-ups</option><option value="recent">Latest activity</option>
          </select>
        </div>
      </div>

      {all.length === 0 && <p className="text-sm text-muted-foreground">No partners yet — press "Add partner" to create the first one.</p>}
      {all.length > 0 && shown.length === 0 && <p className="text-sm text-muted-foreground">No partners match.</p>}
      <div className="space-y-4">
        {shown.map((p) => {
          const due = isDue(p);
          const link = siteUrl(`/p/${p.slug}`);
          return (
            <section key={p.id} className="space-y-4 rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">{p.name} {!p.is_active && <span className="text-xs text-muted-foreground">(inactive)</span>} {due && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Payout due</span>}</h3>
                  <p className="break-all text-xs text-muted-foreground">{link} · {p.partner_email}{p.contact ? ` · ${p.contact}` : ""}</p>
                  {p.reward_note && <p className="text-xs">Reward: {p.reward_note}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyText(link, "Link copied")}><Copy className="mr-1 h-3.5 w-3.5" />Link</Button>
                  <Button size="sm" variant="outline" onClick={() => copyText(welcome(p), "Welcome message copied")}>Copy welcome message</Button>
                  <Button size="sm" variant="outline" onClick={() => edit(p)}>Edit</Button>
                  <Button size="sm" disabled={!due || payingId !== null} onClick={() => markPaid(p.id, p.milestones_paid)}>Mark milestone paid</Button>
                </div>
              </div>
              <PartnerProgress stats={p.stats} target={p.target_paying} paid={p.milestones_paid} />
              <p className="text-xs text-muted-foreground">Milestones paid: {p.milestones_paid}{p.last_paid_at ? ` · last ${new Date(p.last_paid_at).toLocaleDateString()}` : ""} · added {new Date(p.created_at).toLocaleDateString()}</p>
              <StatGrid stats={p.stats} clicks={p.clicks} />
              <FunnelInsights stats={p.stats} clicks={p.clicks} target={p.target_paying} paid={p.milestones_paid} />
              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-semibold">Recent activity & payout history</summary>
                <div className="mt-3 space-y-4"><ActivityList activity={p.stats.activity} limit={15} /><PartnerPayoutHistory payouts={p.payouts} /></div>
              </details>
            </section>
          );
        })}
      </div>
    </div>
  );
}
