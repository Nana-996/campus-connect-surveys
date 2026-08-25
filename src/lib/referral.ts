// Referral rewards: the referrer earns credits when a new account they
// referred registers. CampusVerify serves students and general/research
// members, so both account types are worth rewarding.
import { siteUrl } from "@/lib/site";

export const REFERRAL_REWARD_STUDENT = 5;
export const REFERRAL_REWARD_GENERAL = 3;

const STORAGE_KEY = "cv:referral-code";

const normalize = (code: string) => code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

export const referralLink = (code: string) => siteUrl(`/signup?ref=${normalize(code)}`);

/** Pulls ?ref= out of the current URL and remembers it until the user registers. */
export function captureReferralFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("ref") ?? params.get("referral");
    if (!raw) return;
    const code = normalize(raw);
    if (code) window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* storage unavailable */
  }
}

export function storedReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v ? normalize(v) : null;
  } catch {
    return null;
  }
}

export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function referralShareText(): string {
  return [
    "I'm using CampusVerify to get real responses for research — verified students and general research members answering each other's surveys.",
    `Join with my link and we both get moving faster: I earn ${REFERRAL_REWARD_STUDENT} credits when a student joins and ${REFERRAL_REWARD_GENERAL} when a general/research member joins, and you start with free credits to run your own survey.`,
  ].join("\n\n");
}

export function referralShareMessage(code: string): string {
  return `${referralShareText()}\n\n${referralLink(code)}`;
}
