import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Users, Filter } from "lucide-react";

type Survey = {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  target_department: string | null;
  target_year: string | null;
  response_count: number;
  questions: any[];
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/feed")({
  component: Feed,
});

function Feed() {
  const { user, profile } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("surveys")
        .select("*")
        .eq("is_active", true)
        .neq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      setSurveys((data as Survey[]) ?? []);
      const { data: resps } = await supabase
        .from("survey_responses")
        .select("survey_id")
        .eq("respondent_id", user!.id);
      setAnswered(new Set((resps ?? []).map((r: any) => r.survey_id)));
      setLoading(false);
    })();
  }, [user]);

  const visible = surveys.filter((s) => {
    if (s.target_department && profile?.department && s.target_department.toLowerCase() !== profile.department.toLowerCase()) return false;
    if (s.target_year && profile?.year && s.target_year.toLowerCase() !== profile.year.toLowerCase()) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Campus feed</h1>
        <p className="text-sm text-muted-foreground">
          Surveys from students at <span className="font-semibold text-foreground">{profile?.university_name}</span>
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading surveys...</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No surveys for you right now.</p>
          <Link to="/create" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            Be the first to publish one →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => (
            <Link
              key={s.id}
              to="/survey/$id"
              params={{ id: s.id }}
              className="block rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-foreground">{s.title}</h3>
                {answered.has(s.id) && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">Done</span>
                )}
              </div>
              {s.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{s.response_count} responses</span>
                <span>•</span>
                <span>{s.questions?.length ?? 0} questions</span>
                {(s.target_department || s.target_year) && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Filter className="h-3 w-3" />
                    {[s.target_department, s.target_year].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
