import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyPartnerDashboard } from "@/lib/partners.functions";
import { PartnerProgress, StatGrid } from "@/components/PartnerProgress";
import { siteUrl } from "@/lib/site";
import { ActivityList, FunnelInsights, ShareKit } from "@/components/PartnerExtras";
import { PartnerPayoutHistory } from "@/components/PartnerPayoutHistory";

export const Route = createFileRoute("/_authenticated/partner")({
  component: PartnerPortal,
  head: () => ({
    meta: [
      { title: "Partner dashboard — CampusVerify" },
      { name: "description", content: "Track your CampusVerify partner referrals." },
      { property: "og:title", content: "Partner dashboard — CampusVerify" },
      { property: "og:description", content: "Your referral progress and manual payout history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function PartnerPortal() {
  const fetch = useServerFn(getMyPartnerDashboard);
  const { data, isLoading, error } = useQuery({ queryKey: ["my-partner"], queryFn: () => fetch() });

  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="p-8 text-sm text-destructive">Could not load your partner dashboard.</p>;
  if (!data?.length)
    return (
      <div className="mx-auto max-w-xl p-8">
        <h1 className="font-serif text-3xl">Partner dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account isn't linked to a partnership. Sign in with the email you shared with CampusVerify, or contact founder@campus-verify.live.
        </p>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <h1 className="font-serif text-4xl">Partner <em className="text-primary">dashboard.</em></h1>
      {data.map((p) => {
        const link = siteUrl(`/p/${p.slug}`);
        return (
          <section key={p.id} className="space-y-5 rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">{p.name}</h2>
                {p.reward_note && <p className="text-sm text-muted-foreground">Agreed reward: {p.reward_note} for every {p.target_paying} paying customers</p>}
              </div>
              {!p.is_active && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Paused</span>}
            </div>
            <PartnerProgress stats={p.stats} target={p.target_paying} paid={p.milestones_paid} />
            <p className="text-xs text-muted-foreground">Milestones paid so far: {p.milestones_paid}{p.last_paid_at ? ` · last payout ${new Date(p.last_paid_at).toLocaleDateString()}` : ""}</p>
            <StatGrid stats={p.stats} clicks={p.clicks} />
            <FunnelInsights stats={p.stats} clicks={p.clicks} target={p.target_paying} paid={p.milestones_paid} />
            <ShareKit link={link} />
            <div>
              <h3 className="mb-1 text-sm font-semibold">Recent activity</h3>
              <ActivityList activity={p.stats.activity} />
              <p className="mt-1 text-xs text-muted-foreground">For privacy you see activity, not names or contact details.</p>
            </div>
            <PartnerPayoutHistory payouts={p.payouts} />
            <details className="rounded-lg bg-muted/50 p-3 text-sm">
              <summary className="cursor-pointer font-medium">How counting works</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>A sign-up counts when someone creates an account after opening your link.</li>
                <li>A paying customer counts once, the first time they buy anything — repeat purchases add to revenue only.</li>
                <li>When you reach the milestone, CampusVerify pays you manually and the next milestone starts.</li>
                <li>Questions? Email founder@campus-verify.live.</li>
              </ul>
            </details>
          </section>
        );
      })}
    </div>
  );
}
