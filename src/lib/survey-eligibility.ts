export type SurveyEligibility = {
  status: "eligible" | "mismatch" | "needs_verification" | "unavailable";
  reasons: string[];
};

export function canSubmitAfterCheck(result: SurveyEligibility, signedIn: boolean) {
  return signedIn && result.status === "eligible";
}

export function canCreateAccountAfterCheck(result: SurveyEligibility, signedIn: boolean) {
  return !signedIn && result.status !== "unavailable";
}