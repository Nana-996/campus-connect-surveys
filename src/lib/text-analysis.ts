// Lightweight, dependency-free text analysis used by the report builder.
// Keyword-based sentiment + word frequency. No external APIs.

const POSITIVE_WORDS = new Set([
  "good",
  "great",
  "excellent",
  "amazing",
  "awesome",
  "love",
  "loved",
  "loving",
  "like",
  "liked",
  "best",
  "better",
  "helpful",
  "useful",
  "fantastic",
  "wonderful",
  "happy",
  "satisfied",
  "enjoy",
  "enjoyed",
  "enjoyable",
  "fun",
  "friendly",
  "clear",
  "easy",
  "smooth",
  "fast",
  "efficient",
  "perfect",
  "nice",
  "positive",
  "pleased",
  "recommend",
  "recommended",
  "impressive",
  "brilliant",
  "outstanding",
  "supportive",
  "engaging",
  "interesting",
  "informative",
  "knowledgeable",
  "kind",
  "professional",
  "rich",
  "valuable",
  "improved",
  "improving",
  "strong",
  "comfortable",
  "convenient",
]);

const NEGATIVE_WORDS = new Set([
  "bad",
  "worse",
  "worst",
  "poor",
  "terrible",
  "awful",
  "hate",
  "hated",
  "dislike",
  "disliked",
  "boring",
  "confusing",
  "confused",
  "difficult",
  "hard",
  "slow",
  "useless",
  "unhelpful",
  "frustrating",
  "frustrated",
  "annoying",
  "annoyed",
  "disappointing",
  "disappointed",
  "broken",
  "buggy",
  "lacking",
  "unclear",
  "rude",
  "unprofessional",
  "weak",
  "uncomfortable",
  "inconvenient",
  "expensive",
  "stressful",
  "stress",
  "tired",
  "exhausting",
  "unfair",
  "biased",
  "noisy",
  "dirty",
  "crowded",
  "outdated",
  "limited",
  "missing",
  "problem",
  "problems",
  "issue",
  "issues",
  "fail",
  "failed",
  "failure",
  "complaint",
  "complaints",
]);

const NEGATIONS = new Set([
  "not",
  "no",
  "never",
  "n't",
  "cannot",
  "cant",
  "can't",
  "won't",
  "wont",
  "don't",
  "dont",
  "didn't",
  "didnt",
]);

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "else",
  "for",
  "of",
  "on",
  "in",
  "at",
  "to",
  "from",
  "by",
  "with",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "am",
  "do",
  "does",
  "did",
  "doing",
  "have",
  "has",
  "had",
  "having",
  "i",
  "me",
  "my",
  "mine",
  "we",
  "us",
  "our",
  "ours",
  "you",
  "your",
  "yours",
  "he",
  "him",
  "his",
  "she",
  "her",
  "hers",
  "it",
  "its",
  "they",
  "them",
  "their",
  "theirs",
  "this",
  "that",
  "these",
  "those",
  "there",
  "here",
  "what",
  "which",
  "who",
  "whom",
  "how",
  "when",
  "where",
  "why",
  "so",
  "than",
  "too",
  "very",
  "just",
  "also",
  "much",
  "many",
  "more",
  "most",
  "some",
  "any",
  "all",
  "each",
  "every",
  "no",
  "not",
  "nor",
  "only",
  "own",
  "same",
  "such",
  "can",
  "cant",
  "cannot",
  "could",
  "should",
  "would",
  "will",
  "shall",
  "may",
  "might",
  "must",
  "because",
  "while",
  "about",
  "into",
  "through",
  "over",
  "under",
  "again",
  "further",
  "up",
  "down",
  "out",
  "off",
  "yes",
  "yeah",
  "ok",
  "okay",
  "really",
  "quite",
  "still",
  "even",
  "ever",
  "never",
  "like",
  "got",
  "get",
  "getting",
  "one",
  "two",
  "things",
  "thing",
  "stuff",
  "etc",
  "im",
  "ive",
  "its",
  "dont",
  "didnt",
  "wasnt",
  "arent",
  "isnt",
  "wont",
  "theyre",
  "youre",
  "weve",
  "theyve",
]);

export type Sentiment = {
  positive: number; // percent 0-100
  neutral: number;
  negative: number;
  total: number; // # of analyzed responses
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function classifyResponse(text: string): "positive" | "negative" | "neutral" {
  const tokens = tokenize(text);
  let score = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = i > 0 ? tokens[i - 1] : "";
    const flip = NEGATIONS.has(prev) ? -1 : 1;
    if (POSITIVE_WORDS.has(t)) score += 1 * flip;
    else if (NEGATIVE_WORDS.has(t)) score -= 1 * flip;
  }
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

export function analyzeSentiment(responses: string[]): Sentiment {
  const clean = responses.map((r) => r.trim()).filter((r) => r.length > 0);
  if (clean.length === 0) return { positive: 0, neutral: 0, negative: 0, total: 0 };
  let pos = 0,
    neg = 0,
    neu = 0;
  for (const r of clean) {
    const c = classifyResponse(r);
    if (c === "positive") pos++;
    else if (c === "negative") neg++;
    else neu++;
  }
  const total = clean.length;
  return {
    positive: Math.round((pos / total) * 1000) / 10,
    neutral: Math.round((neu / total) * 1000) / 10,
    negative: Math.round((neg / total) * 1000) / 10,
    total,
  };
}

export function topWords(responses: string[], n = 5): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of responses) {
    for (const t of tokenize(r)) {
      if (t.length < 3) continue;
      if (STOP_WORDS.has(t)) continue;
      if (/^\d+$/.test(t)) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

export function suggestInterpretation(responses: string[]): string {
  const s = analyzeSentiment(responses);
  const words = topWords(responses, 5);
  if (s.total === 0) return "No open-ended responses were submitted for this question.";
  const dominant =
    s.positive >= s.negative && s.positive >= s.neutral
      ? "positive"
      : s.negative >= s.positive && s.negative >= s.neutral
        ? "negative"
        : "neutral";
  const wordList =
    words.length > 0 ? words.map((w) => `"${w.word}"`).join(", ") : "no recurring terms";
  return (
    `Across ${s.total} open-ended response${s.total === 1 ? "" : "s"}, sentiment skewed ${dominant} ` +
    `(${s.positive}% positive, ${s.neutral}% neutral, ${s.negative}% negative). ` +
    `The most frequently mentioned terms were ${wordList}, suggesting these themes are top of mind for respondents.`
  );
}
