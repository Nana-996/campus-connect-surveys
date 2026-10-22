import { describe, expect, it } from "vitest";
import { canCreateAccountAfterCheck, canSubmitAfterCheck, type SurveyEligibility } from "./survey-eligibility";

describe("before-submit eligibility", () => {
  it("does not submit a provisional email match", () => {
    expect(canSubmitAfterCheck({ status: "needs_verification", reasons: [] }, false)).toBe(false);
  });
  it("allows an eligible verified account to submit", () => {
    expect(canSubmitAfterCheck({ status: "eligible", reasons: [] }, true)).toBe(true);
  });
  it("keeps signup available to mismatched visitors without allowing their response", () => {
    const result: SurveyEligibility = { status: "mismatch", reasons: ["Different campus"] };
    expect(canCreateAccountAfterCheck(result, false)).toBe(true);
    expect(canSubmitAfterCheck(result, true)).toBe(false);
  });
  it("never offers submission or signup for unavailable surveys", () => {
    const result: SurveyEligibility = { status: "unavailable", reasons: [] };
    expect(canCreateAccountAfterCheck(result, false)).toBe(false);
    expect(canSubmitAfterCheck(result, true)).toBe(false);
  });
});