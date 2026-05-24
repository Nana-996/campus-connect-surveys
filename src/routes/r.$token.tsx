import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

type SharedQ =
  | { id: string; type: "choice" | "rating"; text: string; counts: { label: string; count: number }[] }
  | { id: string; type: "text"; text: string; answered: number };

type Shared = {
  title: string;
  description: string;
  total_responses: number;
  created_at: string;
  expires_at: string;
  questions: SharedQ[];
};

export const Route = createFileRoute("/r/$token")({
  component: SharedDashboard,
  head: () => ({
    meta: [
      { title: "Shared survey dashboard · CampusVerify" },
      { name: "description", content: "Read-only live dashboard of an aggregated survey on CampusVerify." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function SharedDashboard() {
  const { token } = Route.useParams();
  const [data, setData] = useState<Shared | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: d, error: err } = await supabase.rpc("get_shared_dashboard" as any, { _token: token });
      if (!active) return;
      if (err) { setError(err.message); setLoading(false); return; }
      if (!d) { setError("This dashboard link is invalid, expired, or revoked."); setLoading(false); return; }
      setData(d as unknown as Shared);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [token]);

  if (loading) return <div className="mx-auto max-w-4xl p-10 text-sm text-muted-foreground">Loading dashboard…</div>;
  if (error) return (
    <div className="mx-auto max-w-2xl p-10 text-center">
      <p className="font-serif text-3xl">Dashboard unavailable</p>
      <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold underline">Back to CampusVerify</Link>
    </div>
  );
  if (!data) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <Link to="/" className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground">
        ← CampusVerify
      </Link>
      <div className="mt-4 rounded-3xl border border-foreground/15 bg-card p-7 shadow-paper">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Shared dashboard · read-only</p>
        <h1 className="mt-2 font-serif text-4xl leading-[0.95] sm:text-5xl">{data.title}</h1>
        {data.description && <p className="mt-3 max-w-2xl text-base text-muted-foreground">{data.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
          <span className="rounded-full bg-foreground px-3 py-1 text-background">n = {data.total_responses}</span>
          <span className="rounded-full border border-foreground/20 px-3 py-1 text-muted-foreground">
            Published {new Date(data.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {data.questions.map((q, qi) => (
          <div key={q.id} className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Q{qi + 1} · {q.type}</p>
            <p className="mt-1 font-serif text-xl leading-tight">{q.text}</p>
            {q.type === "text" ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {q.answered} respondents answered. Free-text answers are not shared on public dashboards.
              </p>
            ) : (
              <>
                <div className="mt-3 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={q.counts} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-muted-foreground">Groups with fewer than 5 responses are hidden for privacy.</p>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        Live aggregated data · powered by CampusVerify · respondent identities are never shared.
      </p>
    </div>
  );
}
