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
    if (!profile) return;
    await supabase.from("profiles").update({ credits: profile.credits + 10 }).eq("id", user!.id);
    await refreshProfile();
    toast.success("Added 10 credits (placeholder — payments coming soon)");
  };

  if (!profile) return null;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Your card</p>
      <h1 className="mt-1 font-serif text-5xl leading-[0.95]">Hello, <em className="text-primary">{profile.full_name?.split(" ")[0] || "student"}.</em></h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-6">
        {/* Credits hero */}
        <div className="sm:col-span-3 rounded-3xl bg-primary p-7 text-primary-foreground shadow-paper">
          <p className="text-[11px] uppercase tracking-[0.25em] opacity-70">Credit balance</p>
          <p className="mt-2 font-serif text-7xl leading-none">{profile.credits}</p>
          <p className="mt-2 text-xs opacity-80">Earn 1 by answering · spend 2 to publish</p>
          <Button onClick={buyCredits} className="mt-6 rounded-full bg-highlight text-highlight-foreground hover:bg-highlight/90">
            <Coins className="mr-1 h-4 w-4" /> Buy more credits
          </Button>
        </div>

        {/* Verified card */}
        <div className="sm:col-span-3 rounded-3xl border border-foreground/15 bg-card p-7 shadow-paper">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
            <ShieldCheck className="h-3 w-3" /> Verified
          </span>
          <h2 className="mt-3 font-serif text-3xl leading-tight">{profile.university_name}</h2>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <Field label="Email domain" value={profile.university_domain} />
            <Field label="Department" value={profile.department || "—"} />
            <Field label="Year" value={profile.year || "—"} />
            <Field label="Name" value={profile.full_name || "—"} />
          </dl>
        </div>
      </div>

      <h2 className="mt-10 font-serif text-3xl">Response history</h2>
      {responses.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">You haven't answered any surveys yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {responses.map((r, i) => (
            <li key={r.id} className="flex items-center justify-between rounded-2xl border border-foreground/15 bg-card p-4">
              <div>
                <p className="font-serif text-xl leading-tight">{r.survey?.title ?? "Survey"}</p>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <span className="rounded-full bg-highlight px-3 py-1 text-[11px] font-bold uppercase text-highlight-foreground">
                +1 · №{String(i + 1).padStart(2, "0")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
