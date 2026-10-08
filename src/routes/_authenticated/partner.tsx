import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getMyPartnerDashboard } from "@/lib/partners.functions";
import { PartnerProgress, StatGrid } from "@/components/PartnerProgress";
import { siteUrl } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/partner")({
  component: PartnerPortal,
  head: () => ({
    meta: [
      { title: "Partner dashboard — CampusVerify" },
      { name: "description", content: "Track your CampusVerify partner referrals." },
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
        const msg = `I use CampusVerify to get verified responses for research studies. Join here: ${link}`;
        const copy = async (t: string) => {
          try { await navigator.clipboard.writeText(t); toast.success("Copied"); } catch { toast.error("Copy failed"); }
        };
        return (
          <section key={p.id} className="space-y-4 rounded-2xl border bg-card p-5">
            <div>
              <h2 className="text-xl font-semibold">{p.name}</h2>
              {p.reward_note && <p className="text-sm text-muted-foreground">Agreed reward: {p.reward_note}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all rounded bg-muted px-2 py-1 text-sm">{link}</code>
              <Button size="sm" variant="outline" onClick={() => copy(link)}>Copy link</Button>
              <Button size="sm" onClick={() => copy(msg)}>Copy message</Button>
            </div>
            <PartnerProgress stats={p.stats} target={p.target_paying} paid={p.milestones_paid} />
            <p className="text-xs text-muted-foreground">Milestones paid so far: {p.milestones_paid}</p>
            <StatGrid stats={p.stats} clicks={p.clicks} />
            <div>
              <h3 className="text-sm font-semibold">Recent activity</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {p.stats.activity.length === 0 && <li className="text-muted-foreground">No activity yet — share your link.</li>}
                {p.stats.activity.map((a, i) => (
                  <li key={i} className="flex justify-between border-b py-1">
                    <span>{a.kind}</span>
                    <span className="text-muted-foreground">{new Date(a.at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
}
