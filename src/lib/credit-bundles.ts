export type CreditBundle = {
  id: "free" | "starter" | "plus" | "pro";
  label: string;
  tagline: string;
  credits: number;
  usdAmount: number; // dollars; 0 = free
  badge?: string;
  features?: string[];
};

export const CREDIT_BUNDLES: CreditBundle[] = [
  {
    id: "free",
    label: "Free",
    tagline: "Included at sign-up",
    credits: 10,
    usdAmount: 0,
    features: ["10 for students", "5 for General/Researcher accounts", "50 for partner-school students", "Never expire"],
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
export const PAID_BUNDLES = CREDIT_BUNDLES.filter((b) => b.usdAmount > 0);

export function getBundleByBundleId(id: string): CreditBundle | undefined {
  return CREDIT_BUNDLES.find((b) => b.id === id);
}
