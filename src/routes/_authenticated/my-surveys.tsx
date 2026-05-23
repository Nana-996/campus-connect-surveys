import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Users, Eye, ArrowUpRight } from "lucide-react";

type Survey = {
  id: string;
  title: string;
  description: string;
  response_count: number;
  is_active: boolean;
  created_at: string;
  questions: any[];
};

export const Route = createFileRoute("/_authenticated/my-surveys")({
  component: MySurveys,
});

function MySurveys() {
  const { user, isPreviewMode } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (isPreviewMode) {
      setSurveys([]);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) console.warn("My surveys request failed.", error);
      setSurveys((data as unknown as Survey[]) ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user, isPreviewMode]);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Your archive</p>
          <h1 className="mt-1 font-serif text-5xl leading-[0.95]">My <em className="text-primary">surveys.</em></h1>
        </div>
        <Link to="/create">
          <Button className="rounded-full bg-primary px-5"><ArrowUpRight className="mr-1 h-4 w-4" />New</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : surveys.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-foreground/30 bg-card p-10 text-center shadow-paper">
          <p className="font-serif text-3xl">Nothing published yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Your first survey is one credit away.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {surveys.map((s, i) => (
            <div key={s.id} className={`rounded-3xl border border-foreground/15 p-5 shadow-paper ${i % 2 === 0 ? "bg-card" : "bg-accent text-accent-foreground"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
                    №{String(i + 1).padStart(2, "0")} · {new Date(s.created_at).toLocaleDateString()}
                  </p>
                  <h3 className="mt-2 font-serif text-3xl leading-tight">{s.title}</h3>
                  <p className="mt-1 text-xs opacity-70">{s.questions?.length ?? 0} questions</p>
                </div>
                <div className="rounded-full bg-background/50 px-3 py-1 text-xs font-bold inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {s.response_count}
                </div>
              </div>
              <div className="mt-4">
                <Link to="/survey/$id" params={{ id: s.id }}>
                  <Button size="sm" variant="outline" className="rounded-full border-foreground/30 bg-background/40">
                    <Eye className="mr-1 h-3.5 w-3.5" /> View & export
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
