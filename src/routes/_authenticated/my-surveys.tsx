import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Eye, ArrowUpRight, BarChart3, Share2, Copy, Check, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Survey | null>(null);
  const [deleting, setDeleting] = useState(false);

  const shareUrl = (id: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/survey/${id}` : `/survey/${id}`;

  const handleShare = async (id: string) => {
    const url = shareUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      setSharedId(id);
      toast.success("Link copied! Share it to get responses");
      setTimeout(() => setSharedId((curr) => (curr === id ? null : curr)), 2500);
    } catch {
      toast.error("Couldn't copy. Long-press the link to copy manually.");
      setSharedId(id);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("surveys").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) {
      toast.error(error.message || "Failed to delete survey.");
      return;
    }
    setSurveys((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    toast.success("Survey deleted.");
  };

  useEffect(() => {
    if (!user) return;
    

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
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/survey/$id" params={{ id: s.id }}>
                  <Button size="sm" variant="outline" className="rounded-full border-foreground/30 bg-background/40">
                    <Eye className="mr-1 h-3.5 w-3.5" /> View
                  </Button>
                </Link>
                <Link to="/survey/$id/analyze" params={{ id: s.id }}>
                  <Button size="sm" className="rounded-full bg-primary">
                    <BarChart3 className="mr-1 h-3.5 w-3.5" /> Analyze
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleShare(s.id)}
                  className="rounded-full border-foreground/30 bg-background/40"
                >
                  {sharedId === s.id ? <Check className="mr-1 h-3.5 w-3.5" /> : <Share2 className="mr-1 h-3.5 w-3.5" />}
                  {sharedId === s.id ? "Copied" : "Share"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteTarget(s)}
                  className="rounded-full border-destructive/40 bg-background/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              </div>
              {sharedId === s.id && (
                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-foreground/15 bg-background/60 px-3 py-2">
                  <code className="flex-1 truncate text-[11px] opacity-80">{shareUrl(s.id)}</code>
                  <button
                    type="button"
                    onClick={() => handleShare(s.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-foreground/20"
                    aria-label="Copy link"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete survey?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.title}</strong> and all its responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
