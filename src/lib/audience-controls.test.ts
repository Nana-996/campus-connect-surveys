import { describe, expect, it } from "vitest";
import { canShowUniversityTargeting } from "./audience-controls";

describe("university targeting controls", () => {
  it("does not offer university targeting to student accounts", () => {
    expect(canShowUniversityTargeting(false)).toBe(false);
  });
  it("retains university targeting for General/Researcher accounts", () => {
    expect(canShowUniversityTargeting(true)).toBe(true);
  });
});