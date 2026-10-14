import type { PartnerPayout } from "@/lib/partners.functions";

export function PartnerPayoutHistory({ payouts }: { payouts: PartnerPayout[] }) {
  return <div>
    <h3 className="text-sm font-semibold">Payout history</h3>
    {payouts.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No payouts recorded.</p> :
      <ul className="mt-2 divide-y text-sm">{payouts.map((p) => <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
        <span>Milestone {p.milestone} · {p.target_paying} paying customers{p.reward_note && <span className="block text-muted-foreground">{p.reward_note}</span>}</span>
        <span className="text-muted-foreground">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "Date not recorded"}{p.legacy && " · Historical record"}</span>
      </li>)}</ul>}
  </div>;
}