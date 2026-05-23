import { useState, type KeyboardEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { INTEREST_TAGS, tagLabel } from "@/lib/interests";
import { normalizeInterestTag } from "@/lib/interests.functions";

export type InterestEntry = { raw: string; tag: string };

type Props = {
  value: InterestEntry[];
  onChange: (next: InterestEntry[]) => void;
  placeholder?: string;
  max?: number;
};

export function InterestTagInput({ value, onChange, placeholder, max = 8 }: Props) {
  const normalize = useServerFn(normalizeInterestTag);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const raw = draft.trim();
    if (!raw || value.length >= max) return;
    if (value.some((v) => v.raw.toLowerCase() === raw.toLowerCase())) {
      setDraft("");
      return;
    }
    setBusy(true);
    try {
      const res = await normalize({ data: { raw } });
      onChange([...value, { raw, tag: res.tag }]);
      setDraft("");
    } catch {
      onChange([...value, { raw, tag: "other" }]);
      setDraft("");
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const overrideTag = (idx: number, newTag: string) => {
    const next = value.slice();
    next[idx] = { ...next[idx], tag: newTag };
    onChange(next);
  };

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="rounded-xl border border-foreground/25 bg-card p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((v, i) => {
          const aiMapped = v.raw.toLowerCase().replace(/\s+/g, "_") !== v.tag;
          return (
            <span key={`${v.raw}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-secondary/60 pl-2 pr-1 py-0.5 text-xs">
              <span className="font-semibold">{v.raw}</span>
              {aiMapped && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="inline-flex items-center gap-0.5 rounded-full bg-background/60 px-1.5 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground">
                      <Sparkles className="h-2.5 w-2.5" /> {tagLabel(v.tag)}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-60 overflow-y-auto">
                    {INTEREST_TAGS.map((t) => (
                      <DropdownMenuItem key={t.id} onClick={() => overrideTag(i, t.id)}>
                        {t.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <button type="button" onClick={() => remove(i)} aria-label="Remove" className="rounded-full p-0.5 hover:bg-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <div className="flex flex-1 items-center gap-1 min-w-[120px]">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => draft && add()}
            placeholder={value.length >= max ? `Up to ${max} tags` : placeholder ?? "Type an interest and press Enter"}
            disabled={busy || value.length >= max}
            className="h-7 border-0 bg-transparent px-1 text-sm focus-visible:ring-0"
          />
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
        Type anything — we'll match it to a category. Tap the <Sparkles className="inline h-2.5 w-2.5" /> chip to change the match.
      </p>
    </div>
  );
}
