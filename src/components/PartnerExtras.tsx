import { toast } from "sonner";
import { Copy, MessageCircle, Share2, ShoppingBag, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PartnerStats } from "@/lib/partners.functions";
import { cycleProgress } from "@/components/PartnerProgress";

export const copyText = async (t: string, msg = "Copied") => {
  try { await navigator.clipboard.writeText(t); toast.success(msg); } catch { toast.error("Copy failed"); }
};

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");

export function timeAgo(at: string) {
  const s = (Date.now() - new Date(at).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(at).toLocaleDateString();
}

/** Plain-language funnel: how well the link turns visits into sign-ups and buyers. */
export function FunnelInsights({ stats, clicks, target, paid }: { stats: PartnerStats; clicks: number; target: number; paid: number }) {
  const c = cycleProgress(stats.paying, target, paid);
  const left = Math.max(0, target - c.current);
  const week = stats.activity.filter((a) => Date.now() - new Date(a.at).getTime() < 7 * 864e5);
  const weekJoins = week.filter((a) => a.kind !== "Paid purchase").length;
  const weekPaid = week.filter((a) => a.kind === "Paid purchase").length;
  const last = stats.activity[0]?.at;
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Insight label="Still needed for next payout" value={c.reached ? "Reached" : `${left} paying`} />
      <Insight label="Visits that signed up" value={pct(stats.signups, clicks)} hint={`${stats.signups} of ${clicks} link visits`} />
      <Insight label="Sign-ups who paid" value={pct(stats.paying, stats.signups)} hint={`${stats.paying} of ${stats.signups} sign-ups`} />
      <Insight label="Last 7 days" value={`${weekJoins} joined · ${weekPaid} paid`} />
      <Insight label="Last activity" value={last ? timeAgo(last) : "None yet"} />
      <Insight label="Average spend per buyer" value={stats.paying ? `GHS ${(Number(stats.revenue_ghs) / stats.paying).toFixed(2)}` : "—"} />
    </div>
  );
}

function Insight({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ActivityList({ activity, limit = 30 }: { activity: PartnerStats["activity"]; limit?: number }) {
  if (activity.length === 0) return <p className="text-sm text-muted-foreground">No activity yet — share the link to get started.</p>;
  return (
    <ul className="divide-y text-sm">
      {activity.slice(0, limit).map((a, i) => {
        const paid = a.kind === "Paid purchase";
        const Icon = paid ? ShoppingBag : UserPlus;
        return (
          <li key={i} className="flex items-center justify-between gap-2 py-2">
            <span className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${paid ? "text-primary" : "text-muted-foreground"}`} />
              {paid ? "Someone you referred made a purchase" : a.kind.replace("Researcher/general member", "Researcher / general member")}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(a.at)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function shareMessages(link: string) {
  return [
    { label: "WhatsApp", text: `Need real, verified responses for your survey or research? CampusVerify connects you with verified participants — no bots. Sign up with my link: ${link}` },
    { label: "LinkedIn", text: `If you run surveys or research, CampusVerify is worth a look: verified participants, campus or open audiences, and clean exports. You can join here: ${link}` },
    { label: "Short (X / SMS)", text: `Verified survey responses, no bots → ${link}` },
  ];
}

/** Ready-made messages partners can copy or send straight to WhatsApp. */
export function ShareKit({ link }: { link: string }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-1 text-sm font-semibold"><Share2 className="h-4 w-4" /> Share kit</h3>
      <div className="flex flex-wrap items-center gap-2">
        <code className="break-all rounded bg-muted px-2 py-1 text-sm">{link}</code>
        <Button size="sm" variant="outline" onClick={() => copyText(link, "Link copied")}><Copy className="mr-1 h-3.5 w-3.5" />Copy link</Button>
      </div>
      <ul className="space-y-2">
        {shareMessages(link).map((m) => (
          <li key={m.label} className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
            <p className="mt-1 text-sm">{m.text}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copyText(m.text, "Message copied")}><Copy className="mr-1 h-3.5 w-3.5" />Copy</Button>
              {m.label === "WhatsApp" && (
                <Button size="sm" variant="outline" asChild>
                  <a href={`https://wa.me/?text=${encodeURIComponent(m.text)}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-1 h-3.5 w-3.5" />Send on WhatsApp</a>
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Only people who sign up through this exact link are counted for you.</p>
    </div>
  );
}
