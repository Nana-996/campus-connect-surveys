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
    cost: 1,
    paidRequired: false,
    responseGoal: 50,
    features: ["Open to whole campus", "Up to 50 responses", "Live for 14 days"],
  },
  targeted: {
    label: "Targeted",
    tagline: "Reach a specific cohort",
    cost: 3,
    paidRequired: true,
    responseGoal: 200,
    features: ["Department + year + interest targeting", "Up to 200 responses", "Priority queue", "Live for 30 days"],
  },
  boosted: {
    label: "Boosted",
    tagline: "Pinned on the feed",
    cost: 10,
    paidRequired: true,
    responseGoal: 500,
    features: ["Pinned 72h on feed", "Cohort highlight badge", "Up to 500 responses", "Priority queue"],
  },
  pro: {
    label: "Pro",
    tagline: "Serious research mode",
    cost: 20,
    paidRequired: true,
    responseGoal: 2000,
    features: ["Top placement for 7 days", "Up to 2,000 responses", "Instant publish", "Analytics & CSV export"],
  },
};

export type UserType = "student" | "general";

// General users pay 1.5× student price (rounded to nearest GHS).
export const GENERAL_PRICE_MULTIPLIER = 1.5;

const STUDENT_PACKS = [
  { id: "starter" as const, credits: 20, price: 20, currency: "GHS", label: "Starter" },
  { id: "researcher" as const, credits: 50, price: 35, currency: "GHS", label: "Researcher", badge: "Most popular" },
  { id: "lab" as const, credits: 200, price: 100, currency: "GHS", label: "Lab", badge: "Best value" },
];

export function packsFor(userType: UserType | undefined) {
  const mult = userType === "general" ? GENERAL_PRICE_MULTIPLIER : 1;
  return STUDENT_PACKS.map((p) => ({ ...p, price: Math.round(p.price * mult) }));
}

export const PACKS = STUDENT_PACKS;


export const DAILY_EARN_CAP = 3;
export const WEEKLY_EARN_CAP = 20;
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