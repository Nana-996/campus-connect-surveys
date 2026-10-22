import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

type UniversityHit = { name: string; domain: string; country: string };

type Props = {
  id?: string;
  value: string;
  onChange: (name: string, domain?: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
};

/**
 * Search-as-you-type university picker backed by the curated global
 * `universities` directory. The typed text is still allowed (the email domain
 * always decides the real school server-side), but picking a suggestion locks
 * in the official name and shows the student which email domain to use.
 */
export function UniversityCombobox({ id, value, onChange, readOnly, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<UniversityHit[]>([]);
  const [picked, setPicked] = useState<UniversityHit | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced directory search. Clears the pick when the user edits the text.
  useEffect(() => {
    if (readOnly) return;
    if (picked && value !== picked.name) {
      setPicked(null);
    } else if (picked) {
      // Value still matches the pick — don't re-search and re-open the list.
      setHits([]);
      setOpen(false);
      return;
    }
    const q = value.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("search_universities", { q });
      setLoading(false);
      if (error) {
        setHits([]);
        return;
      }
      const rows = (data ?? []) as UniversityHit[];
      setHits(rows);
      setOpen(rows.length > 0);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, readOnly]);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const choose = (hit: UniversityHit) => {
    setPicked(hit);
    onChange(hit.name, hit.domain);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          required
          value={value}
          readOnly={readOnly}
          placeholder={placeholder ?? "Start typing your university…"}
          maxLength={120}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          className={className}
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-list` : undefined}
          aria-autocomplete="list"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </div>

      {open && !readOnly && (
        <ul
          id={id ? `${id}-list` : undefined}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-foreground/15 bg-card shadow-lg"
        >
          {hits.map((h) => (
            <li key={h.domain}>
              <button
                type="button"
                role="option"
                aria-selected={picked?.domain === h.domain}
                onClick={() => choose(h)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition hover:bg-primary/5"
              >
                <span className="mt-0.5 w-4 shrink-0">
                  {picked?.domain === h.domain && <Check className="h-4 w-4 text-primary" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{h.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    @{h.domain} · {h.country}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {picked && !readOnly && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Use your <span className="font-semibold text-foreground">@{picked.domain}</span> email so you're grouped with {picked.name}.
        </p>
      )}
      {!picked && !readOnly && value.trim().length >= 2 && !loading && hits.length === 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Not listed? Keep your entry — your university email domain decides your school group.
        </p>
      )}
    </div>
  );
}
