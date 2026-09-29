// Neutralise spreadsheet formula injection: cells starting with = + - @ tab or CR
// are prefixed with a single quote so Excel/Sheets treat them as plain text.
export function neutralizeFormula(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}
