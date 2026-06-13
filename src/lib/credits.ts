export type Tier = "basic" | "targeted" | "boosted" | "pro";

export const TIERS: Record<Tier, {
  label: string;
  tagline: string;
  cost: number;
  responseGoal: number;
  features: string[];
}> = {
  basic: {
    label: "Basic",
    tagline: "Casual pulse check",
    cost: 1,
    responseGoal: 50,
    features: ["Open to whole campus", "Up to 50 responses", "Live for 14 days"],
  },
  targeted: {
    label: "Targeted",
    tagline: "Reach a specific cohort",
    cost: 3,
    responseGoal: 200,
    features: ["Department + year + interest targeting", "Up to 200 responses", "Priority queue", "Live for 30 days"],
  },
  boosted: {
    label: "Boosted",
    tagline: "Pinned on the feed",
    cost: 8,
    responseGoal: 500,
    features: ["Pinned 72h on feed", "Cohort highlight badge", "Up to 500 responses", "Priority queue"],
  },
  pro: {
    label: "Pro",
    tagline: "Serious research mode",
    cost: 15,
    responseGoal: 2000,
    features: ["Top placement for 7 days", "Up to 2,000 responses", "Instant publish", "Analytics & CSV export"],
  },
};

export type UserType = "student" | "general";

export const DAILY_EARN_CAP = 3;
export const WEEKLY_EARN_CAP = 20;
export const EARNED_EXPIRY_DAYS = 30;

export function canAfford(
  tier: Tier,
  earned: number,
): { ok: boolean; reason?: string; shortReason?: string } {
  const t = TIERS[tier];
  if (earned < t.cost) {
    const need = t.cost - earned;
    return {
      ok: false,
      shortReason: `Need ${need} more credit${need === 1 ? "" : "s"}`,
      reason: `Need ${need} more credit${need === 1 ? "" : "s"} — answer surveys in your feed to earn them.`,
    };
  }
  return { ok: true };
}
