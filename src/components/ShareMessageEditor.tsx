import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Share2, Copy, Check, Pencil, RotateCcw } from "lucide-react";
import {
  shareData,
  shareMessage,
  defaultIntro,
  purposeLines,
  loadShareIntro,
  saveShareIntro,
} from "@/lib/share-message";

type Props = {
  surveyId: string;
  title?: string | null;
  description?: string | null;
  questionCount?: number | null;
  url: string;
  compact?: boolean;
  className?: string;
};

/**
 * Preview of the message that travels with a shared survey link, with an
 * optional editor for the intro. The purpose lines are always appended.
 */
export function ShareMessageEditor({
  surveyId, title, description, questionCount, url, compact = false, className = "",
}: Props) {
  const [custom, setCustom] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { setCustom(loadShareIntro(surveyId)); }, [surveyId]);

  const input = { title, description, questionCount, url, custom };
  const fullMessage = shareMessage(input);

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share(shareData(input));
        return;
      }
    } catch { /* cancelled — fall through to copy */ }
    try {
      await navigator.clipboard.writeText(fullMessage);
      setCopied(true);
      toast.success("Message + link copied! Paste it anywhere.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy. Long-press the text to copy manually.");
      setCopied(true);
    }
  };

  const startEditing = () => {
    setDraft(custom || defaultIntro({ title, description }));
    setEditing(true);
  };

  const save = () => {
    const v = draft.trim();
    setCustom(v);
    saveShareIntro(surveyId, v);
    setEditing(false);
    toast.success(v ? "Share message saved." : "Back to the default message.");
  };

  const reset = () => {
    setCustom("");
    saveShareIntro(surveyId, "");
    setDraft("");
    setEditing(false);
    toast.success("Default message restored.");
  };

  const text = compact ? "text-[11px]" : "text-xs";

  return (
    <div className={`rounded-2xl border border-foreground/15 bg-background/60 p-3 ${className}`}>
      {editing ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Your explainer</p>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            maxLength={600}
            placeholder="Say what the survey is about and why it matters…"
            className="mt-2 rounded-xl text-xs"
          />
          <p className="mt-2 whitespace-pre-line text-[10px] leading-relaxed text-muted-foreground">
            Always added below your text:{"\n"}{purposeLines(questionCount)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" onClick={save}>
              <Check className="mr-1 h-3.5 w-3.5" /> Save
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing(false)}>Cancel</Button>
            {custom && (
              <Button size="sm" variant="outline" className="rounded-full" onClick={reset}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Use default
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <p className={`whitespace-pre-line leading-relaxed text-muted-foreground ${text}`}>{fullMessage}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" className="rounded-full bg-primary" onClick={handleShare}>
              {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Share2 className="mr-1 h-3.5 w-3.5" />}
              {copied ? "Copied" : "Share"}
            </Button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-foreground/20"
            >
              <Copy className="h-3 w-3" /> Copy message
            </button>
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-foreground/20"
            >
              <Pencil className="h-3 w-3" /> {custom ? "Edit message" : "Customize message"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
