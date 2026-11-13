import { describe, it, expect } from "vitest";
import { matchesSurveyAudience } from "./push-config";
const s = { visibility: "campus", university_domain: "ug.edu.gh", target_universities: [] as string[], creator_id: "c" };
describe("survey alert audience", () => {
  it("campus survey alerts same-campus people only", () => {
    expect(matchesSurveyAudience(s, { id: "a", user_type: "student", university_domain: "ug.edu.gh" })).toBe(true);
    expect(matchesSurveyAudience(s, { id: "b", user_type: "student", university_domain: "knust.edu.gh" })).toBe(false);
  });
  it("never alerts the creator or for private surveys", () => {
    expect(matchesSurveyAudience(s, { id: "c", user_type: "student", university_domain: "ug.edu.gh" })).toBe(false);
    expect(matchesSurveyAudience({ ...s, visibility: "private" }, { id: "a", user_type: "student", university_domain: "ug.edu.gh" })).toBe(false);
  });
  it("everyone survey alerts General accounts too", () => {
    expect(matchesSurveyAudience({ ...s, visibility: "everyone" }, { id: "g", user_type: "general", university_domain: "gmail.com" })).toBe(true);
  });
});
