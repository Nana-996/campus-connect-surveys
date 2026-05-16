import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Users, Eye } from "lucide-react";

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
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("surveys")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      setSurveys((data as Survey[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My surveys</h1>
        <Link to="/create"><Button size="sm">New survey</Button></Link>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      ) : surveys.length === 0 ? (
        <div className="mt-6 rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">You haven't published any surveys yet.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {surveys.map((s) => (
            <div key={s.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Published {new Date(s.created_at).toLocaleDateString()} · {s.questions?.length ?? 0} questions
                  </p>
                </div>
                <div className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {s.response_count}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link to="/survey/$id" params={{ id: s.id }}>
                  <Button size="sm" variant="outline"><Eye className="mr-1 h-3.5 w-3.5" /> View & export</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
