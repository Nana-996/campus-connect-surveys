import { describe, expect, it } from "vitest";
import { completionPercent, hasSurveyAnswer, surveyAttemptToken } from "./survey-funnel";

describe("survey completion rules", () => {
  it("starts only when a respondent has answered, not on viewing empty questions", () => {
    expect(hasSurveyAnswer({ text: "  ", options: [] })).toBe(false);
    expect(hasSurveyAnswer({ text: "My answer" })).toBe(true);
    expect(hasSurveyAnswer({ options: ["Yes", "No"] })).toBe(true);
  });
  it("keeps the same attempt through reload and email confirmation", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const token = "00000000-0000-4000-8000-000000000001";
    expect(surveyAttemptToken(storage, "survey-one", () => token)).toBe(token);
    expect(surveyAttemptToken(storage, "survey-one", () => "unexpected-new-token")).toBe(token);
    expect(surveyAttemptToken(storage, "survey-two", () => "00000000-0000-4000-8000-000000000002")).not.toBe(token);
  });
  it("uses starts as the denominator for overall completion", () => {
    expect(completionPercent(25, 100)).toBe(25);
  });
  it("uses only signup arrivals as the denominator for signup completion", () => {
    expect(completionPercent(15, 20)).toBe(75);
    expect(completionPercent(0, 0)).toBeNull();
  });
});