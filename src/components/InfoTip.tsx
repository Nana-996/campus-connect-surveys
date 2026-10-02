import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Small "i" button that reveals explanatory copy on tap/click.
 * Keeps forms clean by moving helper text out of the layout.
 */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-foreground/25 text-[10px] text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs leading-relaxed text-muted-foreground" align="start">
        {children}
      </PopoverContent>
    </Popover>
  );
}
