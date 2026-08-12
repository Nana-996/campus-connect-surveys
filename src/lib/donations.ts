// Client-safe donation constants and helpers.

export type DonationFrequency = "one_time" | "monthly";

export const DONATION_PRESETS_GHS = [5, 25, 50, 250] as const;

export const MIN_DONATION_GHS = 1;
export const MAX_DONATION_GHS = 100000;

export const PRESET_BLURBS: Record<number, string> = {
  5: "Covers verification for a handful of new student accounts.",
  25: "Keeps a departmental survey live for a full week.",
  50: "Funds response incentives for 50 verified students.",
  250: "Sponsors an entire faculty research cycle.",
};

export function formatGhs(amount: number): string {
  return `GHS ${amount.toLocaleString("en-GH", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function isValidDonationAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount >= MIN_DONATION_GHS && amount <= MAX_DONATION_GHS;
}
