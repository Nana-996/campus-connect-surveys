import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Mail } from "lucide-react";
import { safeErrorMessage } from "@/lib/safe-error";
import { VisibilityPicker } from "@/components/VisibilityPicker";
import type { Visibility } from "@/lib/visibility";

type Invite = { id: string; email: string };

/** Owner-side control: change who can participate after publishing, and
 *  manage the invite list for private surveys. */
export function VisibilityControl({
  surveyId,
  value,
  onChange,
  className = "",
}: {
  surveyId: string;
  value: Visibility;
  onChange: (v: Visibility) => void;
  className?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (value !== "private") return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("survey_invites")
        .select("id, email")
        .eq("survey_id", surveyId)
        .order("created_at", { ascending: true });
      if (active) setInvites((data as Invite[]) ?? []);
    })();
    return () => { active = false; };
  }, [surveyId, value]);

  const save = async (next: Visibility) => {
    if (next === value) return;
    setSaving(true);
    const { error } = await supabase.from("surveys").update({ visibility: next }).eq("id", surveyId);
    setSaving(false);
    if (error) {
      toast.error(safeErrorMessage(error, "Could not change visibility."));
      return;
    }
    onChange(next);
    toast.success("Visibility updated.");
  };

  const addInvite = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) { toast.error("Enter a valid email address."); return; }
    const { data: userRes } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("survey_invites")
      .insert({ survey_id: surveyId, email: clean, invited_by: userRes.user!.id })
      .select("id, email")
      .single();
    if (error) { toast.error(safeErrorMessage(error, "Could not add invite.")); return; }
    setInvites((p) => [...p, data as Invite]);
    setEmail("");
  };

  const removeInvite = async (id: string) => {
    const { error } = await supabase.from("survey_invites").delete().eq("id", id);
    if (error) { toast.error(safeErrorMessage(error, "Could not remove invite.")); return; }
    setInvites((p) => p.filter((i) => i.id !== id));
  };

  return (
    <div className={`rounded-2xl border border-foreground/15 bg-background/50 p-4 ${className}`}>
      <VisibilityPicker
        value={value}
        onChange={save}
        note={saving ? "Saving…" : "You can change this at any time — responses already collected are kept."}
      />

      {value === "private" && (
        <div className="mt-4 border-t border-foreground/10 pt-3">
          <p className="text-xs font-semibold">Invited people</p>
          <p className="text-[11px] text-muted-foreground">
            Only these email addresses can open and answer this survey.
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              type="email"
              value={email}
              placeholder="name@university.edu"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addInvite(); } }}
            />
            <Button type="button" size="sm" className="rounded-full bg-primary" onClick={addInvite}>
              <Mail className="mr-1 h-3.5 w-3.5" /> Invite
            </Button>
          </div>
          <ul className="mt-2 space-y-1">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-lg bg-card px-3 py-1.5 text-xs">
                <span>{i.email}</span>
                <button type="button" onClick={() => removeInvite(i.id)} aria-label={`Remove ${i.email}`}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </li>
            ))}
            {invites.length === 0 && (
              <li className="text-[11px] text-muted-foreground">No one invited yet.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
