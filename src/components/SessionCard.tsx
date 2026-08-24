import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import {
  getLastLogin,
  getTimeRemaining,
  getRemember,
  setSessionDays,
  REMEMBER_DAYS,
  SHORT_DAYS,
} from "@/lib/session-activity";

function formatRemaining(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = mins % 60;
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ${hours} hr${hours === 1 ? "" : "s"}`;
  if (hours > 0) return `${hours} hr${hours === 1 ? "" : "s"} ${minutes} min`;
  return `${minutes} min`;
}

export function SessionCard() {
  const [lastLogin, setLastLogin] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    const sync = () => {
      setLastLogin(getLastLogin());
      setRemaining(getTimeRemaining());
      setRemember(getRemember());
    };
    sync();
    const id = window.setInterval(sync, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const toggle = (next: boolean) => {
    setSessionDays(next);
    setRemember(next);
    setRemaining(getTimeRemaining());
  };

  return (
    <div className="mt-6 rounded-3xl border border-foreground/15 bg-card p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Sign-in session
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Last login</p>
          <p className="mt-1 font-serif text-2xl leading-tight">
            {lastLogin
              ? new Date(lastLogin).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "This session"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Time before you must sign in again
          </p>
          <p className="mt-1 font-serif text-2xl leading-tight">
            {remaining === null ? "—" : remaining === 0 ? "Sign-in required" : formatRemaining(remaining)}
          </p>
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-foreground/15 bg-secondary p-3">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
        />
        <span className="text-sm">
          <span className="font-semibold">Remember me on this device</span>
          <span className="block text-xs text-muted-foreground">
            {remember
              ? `Stays signed in for ${REMEMBER_DAYS} days of inactivity.`
              : `Signs out after ${SHORT_DAYS} day of inactivity.`}{" "}
            The countdown resets each time you use the app.
          </span>
        </span>
      </label>
    </div>
  );
}
