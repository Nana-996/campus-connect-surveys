export type SurveyAnswers = Record<string, string | string[]>;

export function selectionsOf(value: unknown): string[] {
  if (Array.isArray(value)) return [...new Set(value.filter((v): v is string => typeof v === "string" && v.trim().length > 0))];
  return typeof value === "string" && value.trim() ? [value] : [];
}

export function answerText(value: unknown): string {
  return Array.isArray(value) ? selectionsOf(value).join("; ") : String(value ?? "").trim();
}

export function answerMatches(value: unknown, option: string): boolean {
  return selectionsOf(value).includes(option);
}

export function validMultiAnswer(value: unknown, options: string[], required = true): boolean {
  if (value == null) return !required;
  return Array.isArray(value) && (!required || value.length > 0)
    && value.every((v) => typeof v === "string" && options.includes(v))
    && new Set(value).size === value.length;
}