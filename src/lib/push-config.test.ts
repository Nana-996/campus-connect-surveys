import { describe, it, expect } from "vitest";
import { matchesSurveyAudience } from "./push-config";
const s = { visibility: "campus", university_domain: "ug.edu.gh", target_universities: [] as string[], creator_id: "c" };
describe("survey alert audience", () => {
  it("campus survey alerts same-campus people only", () => {
    expect(matchesSurveyAudience(s, { id: "a", user_type: "student", university_domain: "ug.edu.gh" })).toBe(true);
    expect(matchesSurveyAudience(s, { id: "b", user_type: "student", university_domain: "knust.edu.gh" })).toBe(false);
  });
  it("alerts a selected campus instead of requiring the creator's campus", () => {
    expect(matchesSurveyAudience({ ...s, target_universities: ["knust.edu.gh"] },
      { id: "b", user_type: "student", university_domain: "knust.edu.gh" })).toBe(true);
  });
  it("does not alert the creator's campus when only another campus is selected", () => {
    expect(matchesSurveyAudience({ ...s, target_universities: ["knust.edu.gh"] },
      { id: "a", user_type: "student", university_domain: "ug.edu.gh" })).toBe(false);
  });
  it("alerts each selected campus", () => {
    expect(matchesSurveyAudience({ ...s, target_universities: ["knust.edu.gh", "ucc.edu.gh"] },
      { id: "d", user_type: "student", university_domain: "ucc.edu.gh" })).toBe(true);
  });
  it("does not alert an unselected campus", () => {
    expect(matchesSurveyAudience({ ...s, target_universities: ["knust.edu.gh"] },
      { id: "d", user_type: "student", university_domain: "ucc.edu.gh" })).toBe(false);
  });
  it("does not treat a missing campus as a selected campus", () => {
    expect(matchesSurveyAudience({ ...s, target_universities: ["knust.edu.gh"] },
      { id: "d", user_type: "student", university_domain: null })).toBe(false);
  });
  it("never alerts the creator or for private surveys", () => {
    expect(matchesSurveyAudience(s, { id: "c", user_type: "student", university_domain: "ug.edu.gh" })).toBe(false);
    expect(matchesSurveyAudience({ ...s, visibility: "private" }, { id: "a", user_type: "student", university_domain: "ug.edu.gh" })).toBe(false);
  });
  it("everyone survey alerts General accounts too", () => {
    expect(matchesSurveyAudience({ ...s, visibility: "everyone" }, { id: "g", user_type: "general", university_domain: "gmail.com" })).toBe(true);
  });
});
