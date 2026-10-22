import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Loader2, CircleAlert } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { canCreateAccountAfterCheck, canSubmitAfterCheck, type SurveyEligibility } from "@/lib/survey-eligibility";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: string;
  userId?: string;
  readyToSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
  onVerify: (email: string) => void;
};

export function SurveyEligibilityModal({ open, onOpenChange, surveyId, userId, readyToSubmit, submitting, onSubmit, onVerify }: Props) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<SurveyEligibility | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async (candidateEmail?: string) => {
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: queryError } = await supabase.rpc("check_survey_eligibility", {
        _survey_id: surveyId,
        _email: candidateEmail ?? null,
      });
      if (queryError) throw queryError;
      const parsed = z.object({ status: z.enum(["eligible", "mismatch", "needs_verification", "unavailable"]), reasons: z.array(z.string()) }).parse(data);
      setResult(parsed);
    } catch {
      setError("We couldn’t check your match. Your answers are still here. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError(null);
    if (userId) void check();
  }, [open, userId, surveyId]);

  const title = result?.status === "eligible" ? "You match this study"
    : result?.status === "mismatch" ? "You don’t match this study"
    : result?.status === "unavailable" ? "This study is unavailable"
    : result ? "Your email passes the initial check" : "Check your match";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
        <DialogHeader>
          <ShieldCheck className="mb-2 h-6 w-6 text-primary" />
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {userId ? "We check your verified account against this study’s required audience before any answers are sent."
              : "Check the email you plan to use. This is an initial check, not proof of identity; your verified account determines whether your response can count."}
          </DialogDescription>
        </DialogHeader>
        {!userId && (
          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            const parsed = z.string().trim().email().safeParse(email);
            if (!parsed.success) { setError("Enter a valid email address."); return; }
            void check(parsed.data);
          }}>
            <Label htmlFor="eligibility-email">Your account email</Label>
            <Input id="eligibility-email" type="email" autoComplete="email" maxLength={255} required value={email}
              onChange={(event) => { setEmail(event.target.value); setResult(null); setError(null); }} />
            <Button type="submit" variant="outline" disabled={checking} className="w-full">Check match</Button>
          </form>
        )}
        {checking && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking your match…</p>}
        {error && <div role="alert" className="space-y-3 text-sm text-destructive"><p>{error}</p>{userId && <Button variant="outline" onClick={() => void check()}>Try again</Button>}</div>}
        {result && (
          <div className="space-y-4" aria-live="polite">
            {result.reasons.length > 0 && <ul className="space-y-2 text-sm">{result.reasons.map((reason) => <li key={reason} className="flex gap-2"><CircleAlert className="h-4 w-4 shrink-0 text-muted-foreground" />{reason}</li>)}</ul>}
            <p className="text-sm text-muted-foreground">
              {result.status === "mismatch" ? "Your answers have not been submitted. You can still join CampusVerify and take part in other studies."
                : result.status === "needs_verification" ? "Create an account or log in, then confirm your match here before submitting. Optional preferences, such as interests, do not disqualify you. Required profile criteria are checked after verification."
                : result.status === "eligible" ? "Optional audience preferences do not disqualify you. Your answers will only be sent when you choose to submit."
                : "Your answers have not been sent."}
            </p>
            {canCreateAccountAfterCheck(result, !!userId) && <Button className="w-full" onClick={() => onVerify(email.trim())}>{result.status === "mismatch" ? "Create account or log in anyway" : "Create account or log in"}</Button>}
            {canSubmitAfterCheck(result, !!userId) && <Button className="w-full" disabled={submitting} onClick={readyToSubmit ? onSubmit : () => onOpenChange(false)}>{submitting ? "Submitting…" : readyToSubmit ? "Submit my answers" : "Continue answering"}</Button>}
            {userId && result.status === "mismatch" && <Button asChild variant="outline" className="w-full"><Link to="/feed">Find other studies</Link></Button>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}