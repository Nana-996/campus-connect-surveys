export type CreditBundle = {
  id: "starter" | "plus" | "pro";
  priceId: string;
  productId: string;
  label: string;
  tagline: string;
  credits: number;
  usdAmount: number; // dollars
  ghsApprox: number; // approx GHS at ~12 GHS/USD
  badge?: string;
};

export const CREDIT_BUNDLES: CreditBundle[] = [
  {
    id: "starter",
    priceId: "credits_starter_onetime",
    productId: "credits_starter",
    label: "Starter",
    tagline: "Try it out",
    credits: 20,
    usdAmount: 1,
    ghsApprox: 12,
  },
  {
    id: "plus",
    priceId: "credits_plus_onetime",
    productId: "credits_plus",
    label: "Plus",
    tagline: "Most popular",
    credits: 60,
    usdAmount: 2.5,
    ghsApprox: 30,
    badge: "Most popular",
  },
  {
    id: "pro",
    priceId: "credits_pro_onetime",
    productId: "credits_pro",
    label: "Pro",
    tagline: "Best value",
    credits: 200,
    usdAmount: 7,
    ghsApprox: 84,
    badge: "Best value",
  },
];

export function getBundleByPriceId(priceId: string): CreditBundle | undefined {
  return CREDIT_BUNDLES.find((b) => b.priceId === priceId);
}
