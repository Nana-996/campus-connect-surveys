export type CreditBundle = {
  id: "free" | "mini" | "starter" | "plus" | "pro";
  label: string;
  tagline: string;
  credits: number;
  usdAmount: number; // dollars; 0 = free
  ghsAmount?: number; // Fixed-GHS packs bypass currency conversion.
  badge?: string;
  features?: string[];
};

export const CREDIT_BUNDLES: CreditBundle[] = [
  {
    id: "free",
    label: "Free",
    tagline: "Included at sign-up",
    credits: 5,
    usdAmount: 0,
    features: ["10 for students", "5 for General/Researcher accounts", "50 for partner-school students", "Never expire"],
  },
  {
    id: "mini",
    label: "Mini",
    tagline: "Start small",
    credits: 10,
    usdAmount: 0,
    ghsAmount: 10,
    features: ["Never expire", "10 credits to publish", "Fixed price in Ghana Cedis"],
  },
  {
    id: "starter",
    label: "Starter",
    tagline: "Get going",
    credits: 50,
    usdAmount: 5,
    features: ["Never expire", "Instant top-up", "$0.10 per credit"],
  },
  {
    id: "plus",
    label: "Plus",
    tagline: "Most popular",
    credits: 120,
    usdAmount: 10,
    badge: "Most popular",
    features: ["Never expire", "Instant top-up", "$0.083 per credit"],
  },
  {
    id: "pro",
    label: "Pro",
    tagline: "Best value",
    credits: 300,
    usdAmount: 20,
    badge: "Best value",
    features: ["Never expire", "Instant top-up", "$0.067 per credit"],
  },
];

/** Paid bundles only (excludes the free tier). */
export const PAID_BUNDLES = CREDIT_BUNDLES.filter((b) => b.usdAmount > 0 || (b.ghsAmount ?? 0) > 0);

/** Server-owned pricing; existing USD packs retain their exchange-rate adjustment. */
export function bundleAmountGhs(bundle: CreditBundle, factor: number, rate: number): number {
  if (bundle.ghsAmount !== undefined) return Math.round(bundle.ghsAmount * factor * 100) / 100;
  if (!Number.isFinite(rate) || rate <= 5 || rate >= 100) {
    throw new Error("Pricing is temporarily unavailable — please try again shortly.");
  }
  return Math.round(bundle.usdAmount * factor * rate * 1.05 * 100) / 100;
}

export function getBundleByBundleId(id: string): CreditBundle | undefined {
  return CREDIT_BUNDLES.find((b) => b.id === id);
}
