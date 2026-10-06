import type { PartnerStats } from "@/lib/partners.functions";

export function cycleProgress(paying: number, target: number, paid: number) {
  const current = Math.max(0, paying - paid * target);
  return { current, pct: Math.min(100, Math.round((current / target) * 100)), reached: current >= target };
}

export function PartnerProgress({ stats, target, paid }: { stats: PartnerStats; target: number; paid: number }) {
  const c = cycleProgress(stats.paying, target, paid);
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-medium">{c.current} / {target} paying customers</span>
        <span className="text-muted-foreground">{c.pct}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${c.pct}%` }} />
      </div>
      {c.reached && <p className="mt-1 text-xs font-semibold text-primary">Milestone reached — payout due</p>}
    </div>
  );
}

export function StatGrid({ stats, clicks }: { stats: PartnerStats; clicks: number }) {
  const items = [
    ["Link clicks", clicks],
    ["Sign-ups", stats.signups],
    ["Students", stats.students],
    ["Researchers / general", stats.general],
    ["Paying customers", stats.paying],
    ["Revenue (GHS)", Number(stats.revenue_ghs).toFixed(2)],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map(([l, v]) => (
        <div key={l} className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">{l}</p>
          <p className="text-xl font-semibold">{v}</p>
        </div>
      ))}
    </div>
  );
}
