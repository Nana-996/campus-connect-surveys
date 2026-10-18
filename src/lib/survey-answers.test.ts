import { describe, expect, it } from "vitest";
import { answerText, validMultiAnswer } from "./survey-answers";
import { computeQuestionStats, computeCrossTab, type ResponseLike } from "./report/stats";
import { aggregateQuestion } from "./webmcp/analysis";

const question = { id: "q1", type: "multi_choice", text: "Which services do you use?", options: ["Library", "Lab", "Transport"] };
const rows: ResponseLike[] = [
  { id: "1", respondent_id: "r1", created_at: "2026-10-18", answers: { q1: ["Library", "Lab"], q2: "Yes" } },
  { id: "2", respondent_id: "r2", created_at: "2026-10-18", answers: { q1: ["Lab"], q2: "No" } },
  { id: "3", respondent_id: "r3", created_at: "2026-10-18", answers: { q1: [] } },
];

describe("multiple-selection survey questions", () => {
  it("accepts two selected options rather than requiring a single answer", () => {
    expect(validMultiAnswer(["Library", "Lab"], question.options)).toBe(true);
  });
  it("rejects empty required answers while accepting empty optional answers", () => {
    expect(validMultiAnswer([], question.options)).toBe(false);
    expect(validMultiAnswer([], question.options, false)).toBe(true);
  });
  it("rejects undeclared or duplicate selections", () => {
    expect(validMultiAnswer(["Other"], question.options)).toBe(false);
    expect(validMultiAnswer(["Lab", "Lab"], question.options)).toBe(false);
  });
  it("counts respondents per option and excludes empty arrays", () => {
    const result = computeQuestionStats(question, 1, rows);
    expect(result.answered).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.options.map((o) => [o.count, o.pctAnswered])).toEqual([[1, 50], [2, 100], [0, 0]]);
  });
  it("counts both selections in cross-tabulations", () => {
    const result = computeCrossTab(question, { id: "q2", type: "choice", text: "Continue?", options: ["Yes", "No"] }, rows);
    expect(result.cells).toEqual([[1, 0], [1, 1], [0, 0]]);
  });
  it("formats both selections in exports without splitting commas inside labels", () => {
    expect(answerText(["Library, main", "Lab"])).toBe("Library, main; Lab");
  });
  it("preserves existing single-choice response counts", () => {
    expect(computeQuestionStats({ id: "q2", type: "choice", text: "Continue?", options: ["Yes", "No"] }, 2, rows).options.map((o) => o.count)).toEqual([1, 1]);
  });
  it("reports multiple selections correctly through workspace aggregates", () => {
    const result = aggregateQuestion(question, rows.map((r) => ({ ...r, answers: r.answers ?? {} })));
    expect(result.n).toBe(2);
    expect(result.distribution?.map((o) => [o.count, o.pct])).toEqual([[2, 100], [1, 50]]);
  });
});