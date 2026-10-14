import { describe, expect, it } from "vitest";
import { collectCheckedPages } from "./checked-pages";

describe("complete survey response loading", () => {
  it("collects all 2,501 responses even when a provider caps each page", async () => {
    const rows = Array.from({ length: 2501 }, (_, i) => i);
    const result = await collectCheckedPages(rows.length, async (from, to) => rows.slice(from, Math.min(to + 1, from + 300)));
    expect(result).toEqual(rows);
  });
  it("rejects incomplete data instead of exporting it", async () => {
    await expect(collectCheckedPages(1001, async (from) => from === 0 ? Array(500).fill(0) : [])).rejects.toThrow("completely");
  });
  it("handles a survey with no responses", async () => {
    expect(await collectCheckedPages(0, async () => { throw new Error("must not fetch"); })).toEqual([]);
  });
});