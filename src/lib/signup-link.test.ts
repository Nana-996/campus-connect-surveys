import { describe, expect, it, vi } from "vitest";
import { loadOptionalSignupSchool, signupSearchSchema } from "./signup-link";

describe("optional school sign-up links", () => {
  it.each(["", " ", "Central University", "invalid/path", 42, ["central"], "a".repeat(101)])(
    "ignores an invalid school hint (%j) without rejecting sign-up",
    (school) => {
      expect(signupSearchSchema.parse({ school }).school).toBeUndefined();
    },
  );

  it("preserves a valid school slug", () => {
    expect(signupSearchSchema.parse({ school: " central-university " }).school).toBe("central-university");
  });

  it("does not look up a missing school", async () => {
    const lookup = vi.fn();
    expect(await loadOptionalSignupSchool(undefined, lookup)).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("keeps registration available when the optional lookup fails", async () => {
    expect(await loadOptionalSignupSchool("central-university", async () => {
      throw new Error("Network unavailable");
    })).toBeNull();
  });

  it("returns the database-backed partnership when available", async () => {
    const school = { name: "Central University", domain: "central.edu.gh", slug: "central-university" };
    expect(await loadOptionalSignupSchool(school.slug, async () => school)).toEqual(school);
  });
});