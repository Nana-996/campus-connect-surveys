import { describe, expect, it } from "vitest";
import { sharedSurveySignupMetadata } from "./shared-survey-signup";

describe("shared survey signup", () => {
  it.each(["name@uni.edu", "name@ug.edu.gh"])("requires graduation for %s", (email) => {
    expect(() => sharedSurveySignupMetadata(email, "")).toThrow();
    expect(sharedSurveySignupMetadata(email, "2028-06")).toEqual({
      user_type: "student", full_name: "", university_name: email.split("@")[1], graduation_date: "2028-06-01",
    });
  });
  it("rejects invalid graduation months", () => {
    expect(() => sharedSurveySignupMetadata("name@uni.edu", "2028-13")).toThrow();
  });
  it("does not require or send graduation for general respondents", () => {
    expect(sharedSurveySignupMetadata("name@example.com", "")).toEqual({ user_type: "general", full_name: "" });
  });
});