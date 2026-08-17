import { VISIBILITIES, VISIBILITY_META, type Visibility } from "@/lib/visibility";

/**
 * Four-way "who can participate" selector. Deliberately explicit: each option
 * spells out the exact audience so creators never have to guess.
 */
export function VisibilityPicker({
  value,
  onChange,
  disabled,
  note,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
  disabled?: Visibility[];
  note?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Who can participate
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {VISIBILITIES.map((v) => {
          const meta = VISIBILITY_META[v];
          const Icon = meta.icon;
          const active = value === v;
          const off = disabled?.includes(v);
          return (
            <button
              key={v}
              type="button"
              disabled={off}
              onClick={() => onChange(v)}
              className={`rounded-2xl border-2 p-3 text-left transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-foreground/15 bg-card hover:border-foreground/40"
              } ${off ? "cursor-not-allowed opacity-40" : ""}`}
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                <Icon className="h-4 w-4" /> {meta.label}
              </span>
              <span className="mt-1 block text-[11px] font-semibold opacity-90">{meta.who}</span>
              <span className="mt-1 block text-[11px] opacity-70">{meta.detail}</span>
            </button>
          );
        })}
      </div>
      {note && <p className="mt-2 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}
