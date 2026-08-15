// Builds a ready-to-send message that travels with a shared survey link so the
// sharer never has to explain what the link is.

type ShareInput = {
  title?: string | null;
  description?: string | null;
  questionCount?: number | null;
  url: string;
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

/** The body text — explains what the link is, why it matters, how long it takes. */
export function shareText(input: Omit<ShareInput, "url">): string {
  const title = clean(input.title);
  const desc = clean(input.description);
  const mins = estimateMinutes(input.questionCount);
  const qs = input.questionCount ?? 0;

  const lines: string[] = [];
  lines.push(
    title
      ? `I'm collecting responses for my research survey, "${truncate(title, 90)}".`
      : "I'm collecting responses for a research survey.",
  );
  if (desc) lines.push(truncate(desc, 200));
  lines.push(
    `${qs > 0 ? `${qs} questions · ` : ""}about ${mins} minute${mins === 1 ? "" : "s"}. Responses are anonymous and only verified students can answer, so the data stays clean.`,
  );
  lines.push("Answering also earns you credits to run your own survey on CampusVerify.");
  return lines.join("\n\n");
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
