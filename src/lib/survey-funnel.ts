import type { SurveyAnswers } from "./survey-answers";

export function hasSurveyAnswer(answers: SurveyAnswers): boolean {
  return Object.values(answers).some((value) => Array.isArray(value) ? value.length > 0 : String(value ?? "").trim().length > 0);
}

export function surveyAttemptToken(storage: Pick<Storage, "getItem" | "setItem">, surveyId: string, generate: () => string): string {
  const key = `cv:survey-attempt:${surveyId}`;
  const previous = storage.getItem(key);
  if (previous && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(previous)) return previous;
  const token = generate();
  storage.setItem(key, token);
  return token;
}

export function completionPercent(completed: number, started: number): number | null {
  return started > 0 ? Math.round((completed / started) * 1000) / 10 : null;
}

export type SurveyFunnelCounts = { started: number; signup: number; submitted: number; signup_submitted: number };
export type SurveyFunnelSummary = SurveyFunnelCounts & {
  tracking_since: string | null;
  surveys: Array<SurveyFunnelCounts & { survey_id: string; title: string }>;
};