import type { LucideIcon } from "lucide-react";

export type SectionItem = {
  value: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

/**
 * Horizontally scrollable pill navigation used by the admin + faculty consoles.
 * Purely presentational — the parent owns the active value.
 */
export function SectionNav({
  items,
  value,
  onChange,
  className = "",
}: {
  items: SectionItem[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={`-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 ${className}`}>
      <div
        role="tablist"
        aria-label="Sections"
        className="inline-flex min-w-full gap-1 rounded-2xl border border-foreground/15 bg-card p-1"
      >
        {items.map((it) => {
          const active = it.value === value;
          const Icon = it.icon;
          return (
            <button
              key={it.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onChange(it.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{it.label}</span>
              {typeof it.badge === "number" && it.badge > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                    active ? "bg-primary-foreground/20" : "bg-secondary text-foreground"
                  }`}
                >
                  {it.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
