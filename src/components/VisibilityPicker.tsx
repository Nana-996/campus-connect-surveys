import { VISIBILITIES, VISIBILITY_META, type Visibility } from "@/lib/visibility";
import { Button } from "@/components/ui/button";
import logoLockup from "@/assets/campusverify-logo-lockup.png.asset.json";

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
    <section aria-labelledby="visibility-heading" className="overflow-hidden rounded-lg border border-foreground/15 bg-card shadow-paper">
      <div className="border-b border-foreground/10 bg-background px-6 py-5 sm:px-8">
        <img
          src={logoLockup.url}
          alt="CampusVerify"
          className="mx-auto h-auto w-full max-w-[19rem] mix-blend-multiply"
        />
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {VISIBILITIES.map((v) => {
          const meta = VISIBILITY_META[v];
          const Icon = meta.icon;
          const active = value === v;
          const off = disabled?.includes(v);
          return (
            <Button
              key={v}
              type="button"
              variant="outline"
              disabled={off}
              onClick={() => onChange(v)}
              aria-pressed={active}
              className={`h-auto min-h-40 whitespace-normal rounded-md border-2 p-4 text-left shadow-none transition sm:min-h-48 sm:p-6 ${
                active
                  ? "border-primary bg-primary text-primary-foreground hover:bg-primary/95 hover:text-primary-foreground"
                  : "border-foreground/15 bg-background hover:border-primary/50 hover:bg-secondary/60 hover:text-foreground"
              } ${off ? "cursor-not-allowed opacity-40" : ""}`}
            >
              <span className="flex h-full w-full flex-col items-start">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${active ? "border-primary-foreground/40" : "border-foreground/15 bg-card text-primary"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="mt-auto pt-5 text-[11px] font-bold uppercase leading-tight sm:text-sm">
                  {meta.label}
                </span>
                <span className="mt-2 block text-[10px] font-normal leading-relaxed opacity-75 sm:text-xs">
                  {meta.who}
                </span>
              </span>
            </Button>
          );
        })}
        </div>

        <div className="mt-5 border-t border-foreground/10 pt-5 sm:flex sm:items-start sm:justify-between sm:gap-6">
          <div>
            <h2 id="visibility-heading" className="font-serif text-2xl leading-none sm:text-3xl">
              Choose who can participate.
            </h2>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
              {VISIBILITY_META[value].detail}
            </p>
          </div>
          {note && <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-muted-foreground sm:mt-0 sm:text-right">{note}</p>}
        </div>
      </div>
    </section>
  );
}
