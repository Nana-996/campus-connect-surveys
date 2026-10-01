import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { DAILY_EARN_CAP, WEEKLY_EARN_CAP, EARNED_EXPIRY_DAYS } from "@/lib/credits";

type Props = { userId: string; isGeneral: boolean; credits?: number | null };

export function WelcomeTour({ userId, isGeneral, credits }: Props) {
  const key = `cv-welcome-tour-done:${userId}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(key)) setOpen(true);
    } catch {}
  }, [key]);

  if (!open) return null;

  const close = () => {
    try { localStorage.setItem(key, "1"); } catch {}
    setOpen(false);
  };

  const steps = [
    {
      title: "Welcome to CampusVerify",
      body: `Credits are how the platform stays fair: you answer surveys to earn them and spend them to publish your own.${typeof credits === "number" ? ` You have ${credits} credit${credits === 1 ? "" : "s"} right now.` : ""} Your sign-up credits never expire.`,
    },
    {
      title: "Earn by answering",
      body: `Each survey you answer here earns credits, up to ${DAILY_EARN_CAP} a day and ${WEEKLY_EARN_CAP} a week. Earned credits last ${EARNED_EXPIRY_DAYS} days, so use them for your next survey.`,
    },
    {
      title: "Spend to publish",
      body: isGeneral
        ? "Publishing a survey costs credits depending on how many responses and how much reach you want. You can also buy credits at any time."
        : "Publishing a survey costs credits depending on how many responses and how much reach you want. Students pay the base price, and you can buy more credits at any time.",
    },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <div role="dialog" aria-label="Welcome tour" className="relative mb-6 rounded-3xl border border-primary/30 bg-card p-5 shadow-paper">
      <button onClick={close} aria-label="Close tour" className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Quick tour · {step + 1} of {steps.length}
      </p>
      <h2 className="mt-1 font-serif text-2xl">{s.title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{s.body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 rounded-full border border-foreground/20 px-4 py-1.5 text-sm font-semibold">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}
        {last ? (
          <button onClick={close} className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
            Start answering
          </button>
        ) : (
          <button onClick={() => setStep(step + 1)} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
            Next <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
        <Link to="/guide" onClick={close} className="ml-auto text-sm text-muted-foreground underline hover:text-foreground">
          Read the full guide
        </Link>
      </div>
    </div>
  );
}
