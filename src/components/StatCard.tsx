import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`rounded-2xl border p-4 text-left transition ${
        accent
          ? "border-destructive/40 bg-destructive/5"
          : "border-foreground/15 bg-card"
      } ${onClick ? "hover:border-primary/50 hover:shadow-sm" : ""}`}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon
            className={`h-3.5 w-3.5 ${accent ? "text-destructive" : "text-primary"}`}
          />
        )}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-1 font-serif text-2xl leading-none">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </Tag>
  );
}
