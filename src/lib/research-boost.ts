export type BoostTierId = "starter" | "standard" | "advanced" | "campus";

export type BoostTier = {
  id: BoostTierId;
  label: string;
  tagline: string;
  responses: number;
  priceGhs: number; // cedis
  badge?: string;
};

export const BOOST_TIERS: BoostTier[] = [
  { id: "starter", label: "Starter", tagline: "Pilot study", responses: 50, priceGhs: 10 },
  { id: "standard", label: "Standard", tagline: "Course project", responses: 100, priceGhs: 20, badge: "Most popular" },
  { id: "advanced", label: "Advanced", tagline: "Dissertation sample", responses: 200, priceGhs: 35 },
  { id: "campus", label: "Campus-wide", tagline: "Serious research", responses: 500, priceGhs: 50, badge: "Best value" },
];

export function getBoostTier(id: string): BoostTier | undefined {
  return BOOST_TIERS.find((t) => t.id === id);
}

/** Boosts run for 30 days and are non-refundable. */
export const BOOST_DAYS = 30;
