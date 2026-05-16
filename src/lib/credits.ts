export type Tier = "basic" | "targeted" | "boosted" | "pro";

export const TIERS: Record<Tier, {
  label: string;
  tagline: string;
  cost: number;
  paidRequired: boolean;
  responseGoal: number;
  features: string[];
}> = {
  basic: {
    label: "Basic",
    tagline: "Casual pulse check",
    cost: 2,
    paidRequired: false,
    responseGoal: 25,
    features: ["Open to whole campus", "Up to 25 responses", "Standard queue"],
  },
  targeted: {
    label: "Targeted",
    tagline: "Reach a specific cohort",
    cost: 5,
    paidRequired: true,
    responseGoal: 100,
    features: ["Department + year targeting", "Up to 100 responses", "Priority queue"],
  },
  boosted: {
    label: "Boosted",
    tagline: "Pinned on the feed",
    cost: 10,
    paidRequired: true,
    responseGoal: 250,
    features: ["Pinned 48h", "Cohort highlight", "Up to 250 responses"],
  },
  pro: {
    label: "Pro",
    tagline: "Serious research mode",
    cost: 20,
    paidRequired: true,
    responseGoal: 1000,
    features: ["Top placement 7 days", "Up to 1,000 responses", "Instant publish", "Analytics export"],
  },
};

export const PACKS = [
  { id: "starter" as const, credits: 10, price: 20, currency: "GHS", label: "Starter" },
  { id: "researcher" as const, credits: 50, price: 90, currency: "GHS", label: "Researcher", badge: "Most popular" },
  { id: "lab" as const, credits: 200, price: 320, currency: "GHS", label: "Lab", badge: "Best value" },
];

export const DAILY_EARN_CAP = 3;
export const WEEKLY_EARN_CAP = 10;
export const EARNED_EXPIRY_DAYS = 30;

export function canAfford(
  tier: Tier,
  earned: number,
  paid: number,
): { ok: boolean; reason?: string } {
  const t = TIERS[tier];
  if (t.paidRequired) {
    if (paid < t.cost) {
      return { ok: false, reason: `Needs ${t.cost} paid credits — you have ${paid}` };
    }
    return { ok: true };
  }
  if (earned + paid < t.cost) {
    return { ok: false, reason: `Needs ${t.cost} credits — you have ${earned + paid}` };
  }
  return { ok: true };
}
