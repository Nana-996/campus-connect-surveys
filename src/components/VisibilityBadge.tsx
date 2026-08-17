import { visibilityMeta } from "@/lib/visibility";

/** Small "who can answer this" chip shown on every survey card. */
export function VisibilityBadge({
  visibility,
  className = "",
  full = false,
}: {
  visibility?: string | null;
  className?: string;
  full?: boolean;
}) {
  const meta = visibilityMeta(visibility);
  const Icon = meta.icon;
  return (
    <span
      title={meta.who}
      className={`inline-flex items-center gap-1 rounded-full border border-current/20 bg-background/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${className}`}
    >
      <Icon className="h-3 w-3" />
      {full ? meta.label : meta.short}
    </span>
  );
}
