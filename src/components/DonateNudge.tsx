import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "cv_donate_nudge_snoozed_until";
const SNOOZE_DAYS = 30;

function snoozed() {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(KEY);
    return !!raw && Date.now() < Number(raw);
  } catch {
    return false;
  }
}

/**
 * Quiet, dismissible reminder that CampusVerify is community funded.
 * Dismissing hides it everywhere for 30 days.
 */
export function DonateNudge({
  variant = "inline",
  className = "",
}: {
  variant?: "inline" | "card";
  className?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!snoozed());
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  if (variant === "card") {
    return (
      <div className={`relative rounded-3xl border border-border bg-card p-6 text-center shadow-paper ${className}`}>
        <button
          onClick={dismiss}
          aria-label="Dismiss donation reminder"
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground/60 transition hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="absolute top-3 left-3 h-3 w-3 border-t border-l border-highlight/40" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Community funded
        </p>
        <h3 className="mt-2 font-serif text-xl italic leading-tight text-primary">
          Keep CampusVerify free and ad-free
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          A small contribution covers hosting and keeps campus research open to everyone. Only if you can.
        </p>
        <Link to="/donate" className="mt-4 inline-block">
          <Button variant="outline" size="sm" className="rounded-full">
            <Heart className="mr-2 h-3.5 w-3.5" />
            Support CampusVerify
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/60 px-4 py-3 text-left ${className}`}
    >
      <p className="text-xs leading-relaxed text-muted-foreground">
        CampusVerify is ad-free and community funded.{" "}
        <Link to="/donate" className="font-semibold text-primary underline-offset-2 hover:underline">
          Chip in if it helps you
        </Link>
        .
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss donation reminder"
        className="shrink-0 rounded-full p-1 text-muted-foreground/60 transition hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
