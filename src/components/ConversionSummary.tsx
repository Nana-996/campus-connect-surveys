import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getConversionSummary } from "@/lib/conversion.functions";
import { Button } from "@/components/ui/button";

const EVENTS = [
  ["buyer_cta_click", "Buyer button clicks"], ["pricing_view", "Pricing page views"],
  ["upgrade_prompt_view", "Insufficient-credit prompts"], ["lead_submit", "Study and other enquiries"],
  ["checkout_start", "Credit checkout attempts"], ["payment_success", "Successful credit payments"],
  ["boost_start", "Research Boost checkout attempts"], ["boost_success", "Successful Research Boost payments"],
];
export function ConversionSummary() {
  const fetch = useServerFn(getConversionSummary);
  const { data, isPending, error, refetch } = useQuery({ queryKey: ["admin-conversions"], queryFn: () => fetch(), retry: false });
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-2xl">Customer conversion</h2><Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button></div>
    <p className="text-xs text-muted-foreground">Measurements since 14 October 2026. Views and clicks are interactions, not unique people. Checkout attempts begin when a payment request is recorded.</p>
    {isPending ? <p className="text-sm text-muted-foreground">Loading measurements…</p> : error ? <p className="text-sm text-destructive">Could not load measurements.</p> :
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2">Action</th><th className="py-2 text-right">Last 30 days</th><th className="py-2 text-right">Total</th></tr></thead><tbody>{EVENTS.map(([event, label]) => {
        const row = data?.find((r) => r.event === event);
        return <tr key={event} className="border-b"><td className="py-2">{label}</td><td className="text-right tabular-nums">{row?.last_30_days ?? 0}</td><td className="text-right tabular-nums">{row?.total ?? 0}</td></tr>;
      })}</tbody></table></div>}
  </section>;
}