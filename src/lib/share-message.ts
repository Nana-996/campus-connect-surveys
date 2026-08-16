// Builds a ready-to-send message that travels with a shared survey link so the
// sharer never has to explain what the link is. Owners can replace the intro
// with their own words — the purpose lines always stay attached.

type ShareInput = {
  title?: string | null;
  description?: string | null;
  questionCount?: number | null;
  url: string;
  /** Optional owner-written intro replacing the default first lines. */
  custom?: string | null;
};

const clean = (s?: string | null) => (s ?? "").replace(/\s+/g, " ").trim();

const truncate = (s: string, max: number) =>
  s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;

/** Estimated minutes to complete, from the question count. */
export function estimateMinutes(questionCount?: number | null): number {
  const q = Math.max(1, questionCount ?? 5);
  return Math.max(1, Math.round(q / 5));
}

/** Short one-liner used as the title for the native share sheet. */
export function shareTitle(title?: string | null): string {
  const t = clean(title);
  return t ? `Survey: ${truncate(t, 70)}` : "A quick verified survey on CampusVerify";
}

/** The default, auto-written intro — editable by the survey owner. */
export function defaultIntro(input: Pick<ShareInput, "title" | "description">): string {
  const title = clean(input.title);
  const desc = clean(input.description);
  const lines: string[] = [];
  lines.push(
    title
      ? `I'm collecting responses for my research survey, "${truncate(title, 90)}".`
      : "I'm collecting responses for a research survey.",
  );
  if (desc) lines.push(truncate(desc, 200));
  return lines.join("\n\n");
}

/** The fixed purpose lines that always travel with the link. */
export function purposeLines(questionCount?: number | null): string {
  const mins = estimateMinutes(questionCount);
  const qs = questionCount ?? 0;
  return [
    `${qs > 0 ? `${qs} questions · ` : ""}about ${mins} minute${mins === 1 ? "" : "s"}. Responses are anonymous and only verified students can answer, so the data stays clean.`,
    "Answering also earns you credits to run your own survey on CampusVerify.",
  ].join("\n\n");
}

/** The body text — explains what the link is, why it matters, how long it takes. */
export function shareText(input: Omit<ShareInput, "url">): string {
  const intro = clean(input.custom) ? (input.custom as string).trim() : defaultIntro(input);
  return `${intro}\n\n${purposeLines(input.questionCount)}`;
}

/** Full message including the link — used for clipboard copy. */
export function shareMessage(input: ShareInput): string {
  return `${shareText(input)}\n\n${input.url}`;
}

export function shareData(input: ShareInput) {
  return {
    title: shareTitle(input.title),
    text: shareText(input),
    url: input.url,
  };
}

/** Where a survey's custom intro is kept on this device. */
export const shareIntroKey = (surveyId: string) => `cv:share-intro:${surveyId}`;

export function loadShareIntro(surveyId: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(shareIntroKey(surveyId)) ?? "";
  } catch {
    return "";
  }
}

export function saveShareIntro(surveyId: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    const v = value.trim();
    if (v) window.localStorage.setItem(shareIntroKey(surveyId), v);
    else window.localStorage.removeItem(shareIntroKey(surveyId));
  } catch { /* storage unavailable */ }
}
