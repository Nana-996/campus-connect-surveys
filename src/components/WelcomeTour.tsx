import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, ArrowRight, ArrowLeft, CircleCheck, Coins, Search } from "lucide-react";
import { DAILY_EARN_CAP, WEEKLY_EARN_CAP, EARNED_EXPIRY_DAYS } from "@/lib/credits";

type Props = {
  userId: string;
  isGeneral: boolean;
  credits?: number | null;
  replayToken?: number;
};

export function WelcomeTour({ userId, isGeneral, credits, replayToken = 0 }: Props) {
  const key = `cv-welcome-tour-done:${userId}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (replayToken > 0) {
      setStep(0);
      setOpen(true);
      return;
    }
    try {
      if (!localStorage.getItem(key)) setOpen(true);
    } catch {
      // The tour remains available even when storage is unavailable.
    }
  }, [key, replayToken]);

  if (!open) return null;

  const close = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Closing the tour is safe even when storage is unavailable.
    }
    setOpen(false);
  };

  const steps = [
    {
      title: "Welcome to CampusVerify",
      body: `Credits are how the platform stays fair: you answer surveys to earn them and spend them to publish your own.${typeof credits === "number" ? ` You have ${credits} credit${credits === 1 ? "" : "s"} right now.` : ""} Your sign-up credits never expire.`,
      Icon: CircleCheck,
    },
    {
      title: "Earn by answering",
      body: `Each survey you answer here earns credits, up to ${DAILY_EARN_CAP} a day and ${WEEKLY_EARN_CAP} a week. Earned credits last ${EARNED_EXPIRY_DAYS} days, so use them for your next survey.`,
      Icon: Coins,
    },
    {
      title: "Find the right survey",
      body: isGeneral
        ? "Use the filters to narrow surveys by country, age range, or interests. Open a survey only after checking who it is for."
        : "Use the filters to find surveys for your department and year. Open a survey only after checking who it is for.",
      Icon: Search,
    },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;
  const StepIcon = s.Icon;

  return (
    <div
      role="dialog"
      aria-label="Welcome tour"
      aria-live="polite"
      className="relative mb-6 overflow-hidden rounded-2xl border border-primary/30 bg-card p-4 shadow-paper sm:p-5"
    >
      <button
        onClick={close}
        aria-label="Close tour"
        className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-7">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <StepIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Quick tour · {step + 1} of {steps.length}
            </p>
            <div
              className="flex items-center gap-1"
              aria-label={`Step ${step + 1} of ${steps.length}`}
            >
              {steps.map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${index === step ? "w-5 bg-primary" : "w-1.5 bg-foreground/20"}`}
                />
              ))}
            </div>
          </div>
          <h2 className="mt-1 font-serif text-xl sm:text-2xl">{s.title}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{s.body}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 pl-0 sm:pl-[52px]">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-foreground/20 px-3 text-sm font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}
        {last ? (
          <button
            onClick={close}
            className="h-9 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Start answering
          </button>
        ) : (
          <button
            onClick={() => setStep(step + 1)}
            className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Next <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
        <Link
          to="/guide"
          onClick={close}
          className="ml-auto text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Open full guide
        </Link>
      </div>
    </div>
  );
}
