import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Coins, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
});

function Profile() {
  const { profile, user, refreshProfile } = useAuth();
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("survey_responses")
        .select("id, created_at, survey:surveys(title)")
        .eq("respondent_id", user!.id)
        .order("created_at", { ascending: false });
      setResponses(data ?? []);
    })();
  }, [user]);

  const buyCredits = async () => {
    // Placeholder: add 10 credits and show a notice.
    if (!profile) return;
    await supabase.from("profiles").update({ credits: profile.credits + 10 }).eq("id", user!.id);
    await refreshProfile();
    toast.success("Added 10 credits (placeholder — payments coming soon)");
  };

  if (!profile) return null;

  return (
    <div>
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{profile.full_name || "Student"}</h1>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
              <ShieldCheck className="h-3 w-3" /> Verified student
            </p>
          </div>
          <div className="rounded-full bg-secondary px-3 py-1.5 text-sm font-bold text-primary inline-flex items-center gap-1">
            <Coins className="h-4 w-4" /> {profile.credits}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">University</dt>
            <dd className="font-medium">{profile.university_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email domain</dt>
            <dd className="font-medium">{profile.university_domain}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Department</dt>
            <dd className="font-medium">{profile.department || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Year</dt>
            <dd className="font-medium">{profile.year || "—"}</dd>
          </div>
        </dl>
        <Button onClick={buyCredits} className="mt-4 w-full" variant="outline">
          <Coins className="mr-1 h-4 w-4" /> Buy credits
        </Button>
      </div>

      <h2 className="mt-6 text-lg font-semibold">Response history</h2>
      {responses.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">You haven't answered any surveys yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {responses.map((r) => (
            <li key={r.id} className="rounded-lg border bg-card p-3 text-sm">
              <p className="font-medium">{r.survey?.title ?? "Survey"}</p>
              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
