import { describe, expect, it } from "vitest";
import { authDestination } from "./auth-destination";

describe("survey authentication destination", () => {
  it("preserves the shared survey path", () => {
    expect(authDestination("/survey/b97bca32-0989-436c-9ddf-991eb7a76e65")).toBe("/survey/b97bca32-0989-436c-9ddf-991eb7a76e65");
  });
  it("rejects external redirect destinations", () => {
    for (const path of ["https://example.com", "//example.com", "/\\example.com", "/\n/example.com"]) {
      expect(authDestination(path)).toBeNull();
    }
  });
});