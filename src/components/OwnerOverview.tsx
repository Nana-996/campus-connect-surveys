import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CreditCard, FileText, Flag, Handshake, Inbox, Ticket, UserPlus, Users } from "lucide-react";
import { getOwnerOverview } from "@/lib/admin-overview.functions";
import { SurveyCompletionPanel } from "@/components/SurveyCompletionPanel";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function OwnerOverview({ onGo }: { onGo: (s: string) => void }) {
  const fetchOverview = useServerFn(getOwnerOverview);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "owner-overview"], queryFn: () => fetchOverview() });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading today's summary…</p>;
  if (error || !data) return <p className="text-sm text-destructive">Couldn't load today's summary.</p>;

  const g = data.glance;
  const glance = [
    { label: "New sign-ups", icon: UserPlus, ...g.signups },
    { label: "Surveys created", icon: FileText, ...g.surveys },
    { label: "Responses", icon: Users, ...g.responses },
    { label: "Paid purchases", icon: CreditCard, ...g.payments },
  ];
  const a = data.attention;
  const attention = [
    { n: a.openFlags, text: "open flags to review", go: "flags", icon: Flag },
    { n: a.newLeads, text: "new study enquiries not yet answered", go: "leads", icon: Inbox },
    { n: a.stuckPayments, text: "payments still pending after an hour (checkout abandoned or failed)", go: "payments", icon: CreditCard },
    { n: a.flaggedUsers, text: "flagged accounts", go: "users", icon: AlertTriangle },
  ].filter((x) => x.n > 0);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-serif text-2xl">Today at a glance</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {glance.map((x) => (
            <div key={x.label} className="rounded-2xl border border-foreground/15 bg-card p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><x.icon className="h-3.5 w-3.5" />{x.label}</p>
              <p className="mt-1 font-serif text-4xl text-primary">{x.today}</p>
              <p className="text-[11px] text-muted-foreground">Last 7 days: {x.weekAvg}/day on average</p>
            </div>
          ))}
        </div>
      </section>

      <SurveyCompletionPanel />

      <section className="rounded-2xl border border-foreground/15 bg-card p-4">
        <h2 className="font-serif text-2xl">Needs attention</h2>
        {attention.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing waiting on you right now.</p>
        ) : (
          <ul className="mt-2 divide-y divide-foreground/10">
            {attention.map((x) => (
              <li key={x.text}>
                <button type="button" onClick={() => onGo(x.go)} className="flex w-full items-center gap-3 py-2 text-left text-sm hover:text-primary">
                  <x.icon className="h-4 w-4 text-destructive" />
                  <span><strong>{x.n}</strong> {x.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => onGo("promos")} className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-left">
          <Ticket className="h-5 w-5 text-primary" />
          <span><span className="block font-medium">Promo codes</span><span className="text-xs text-muted-foreground">Create codes for bonus credits or a % off purchases.</span></span>
        </button>
        <Link to="/admin-partners" className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <Handshake className="h-5 w-5 text-primary" />
          <span><span className="block font-medium">Partner referrals</span><span className="text-xs text-muted-foreground">Add influencers/groups, get their links and track paying referrals.</span></span>
        </Link>
      </section>

      <section className="rounded-2xl border border-foreground/15 bg-card p-4">
        <h2 className="font-serif text-2xl">Recent activity</h2>
        {data.activity.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No activity yet.</p> : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {data.activity.map((x, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-x-3 border-b border-foreground/10 pb-1.5">
                <span>{x.kind === "payment" ? "💳 " : x.kind === "survey" ? "📝 " : "👋 "}{x.text}</span>
                <span className="text-xs text-muted-foreground">{fmt(x.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function OwnerPayments() {
  const fetchOverview = useServerFn(getOwnerOverview);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "owner-overview"], queryFn: () => fetchOverview() });
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading payments…</p>;
  const rows = data.payments.filter((p) => filter === "all" || (filter === "paid" ? p.paid : !p.paid));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-serif text-3xl">Payments</h2>
          <p className="text-xs text-muted-foreground">Latest 50 checkout attempts. "Pending" usually means the buyer closed checkout or the payment failed.</p>
        </div>
        <div className="flex gap-1">
          {(["all", "paid", "unpaid"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs capitalize ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-foreground/20"}`}>
              {f === "unpaid" ? "Not paid" : f}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No payments here.</p> : (
        <div className="overflow-x-auto rounded-2xl border border-foreground/15 bg-card">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">Pack</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-foreground/10">
                  <td className="p-3 text-xs">{fmt(p.createdAt)}</td>
                  <td className="p-3">{p.who}</td>
                  <td className="p-3">{p.bundle} · {p.credits} credits</td>
                  <td className="p-3">GHS {p.amountGhs.toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${p.paid ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
