// Refuse partial exports rather than silently reporting a capped result set.
export async function collectCheckedPages<T>(
  expected: number,
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = 500,
): Promise<T[]> {
  const rows: T[] = [];
  while (rows.length < expected) {
    const page = await fetchPage(rows.length, Math.min(rows.length + pageSize, expected) - 1);
    if (!page.length || rows.length + page.length > expected) {
      throw new Error("Results changed or could not be loaded completely. Please reload before exporting.");
    }
    rows.push(...page);
  }
  return rows;
}