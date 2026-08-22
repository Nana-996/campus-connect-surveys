// Single source of truth for survey analytics used by the Analysis page,
// the Report Studio and every export (PDF + data package).
// Pure functions, no DOM, no server access.

import { analyzeSentiment, classifyResponse, topWords, type Sentiment } from "@/lib/text-analysis";

export const SUPPRESS_THRESHOLD = 5;

export type QuestionLike = {
  id: string;
  type: "text" | "choice" | "rating" | string;
  text: string;
  options?: string[];
  required?: boolean;
};

export type ResponseLike = {
  id: string;
  respondent_id: string;
  answers: Record<string, string> | null;
  created_at: string;
  duration_ms?: number | null;
};

export type ProfileLike = {
  id: string;
  department?: string | null;
  year?: string | null;
  country?: string | null;
  age_range?: string | null;
  university_name?: string | null;
};

export type SurveyLike = {
  id: string;
  title: string;
  description?: string | null;
  questions: QuestionLike[];
  created_at: string;
  expires_at?: string | null;
  response_count?: number;
  response_goal?: number | null;
  tier?: string | null;
  visibility?: string | null;
  university_domain?: string | null;
  target_department?: string | null;
  target_year?: string | null;
  target_country?: string | null;
  target_age_range?: string | null;
  target_interests?: string[] | null;
  target_universities?: string[] | null;
  required_criteria?: string[] | null;
  allow_general_respondents?: boolean | null;
  is_active?: boolean | null;
};

export type OptionStat = {
  label: string;
  count: number;
  pctAnswered: number; // % of those who answered this question
  pctAll: number; // % of all respondents in the current cut
};

export type RatingStats = {
  n: number;
  mean: number;
  median: number;
  sd: number;
  min: number;
  max: number;
};

export type TextStats = {
  verbatims: Array<{ ref: string; text: string; at: string; sentiment: "positive" | "neutral" | "negative" }>;
  themes: Array<{ word: string; count: number; pct: number }>;
  sentiment: Sentiment;
  averageWords: number;
};

export type QuestionStats = {
  question: QuestionLike;
  index: number; // 1-based
  variable: string; // q1, q2 ... stable CSV/SPSS variable name
  answered: number;
  skipped: number;
  responseRate: number; // % of the current cut who answered
  options: OptionStat[];
  rating: RatingStats | null;
  text: TextStats | null;
};

export type DemographicGroup = {
  key: string;
  label: string;
  rows: Array<{ label: string; count: number; pct: number }>;
};

export type SurveyStats = {
  n: number; // responses in the current cut
  totalResponses: number; // before filters
  questionCount: number;
  completionRate: number; // % of answer slots filled
  fullyCompleted: number; // responses that answered every question
  medianDurationMs: number | null;
  meanDurationMs: number | null;
  firstResponseAt: string | null;
  lastResponseAt: string | null;
  goalProgress: number | null; // % of response_goal reached
  timeline: Array<{ date: string; count: number }>;
  demographics: DemographicGroup[];
  questions: QuestionStats[];
};

/* ----------------------------- helpers ----------------------------- */

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

export const answerOf = (r: ResponseLike, qid: string) => String(r.answers?.[qid] ?? "").trim();

export function optionLabels(q: QuestionLike): string[] {
  if (q.type === "rating") return ["1", "2", "3", "4", "5"];
  return q.options ?? [];
}

export function variableName(index: number) {
  return `q${index}`;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function round(v: number, dp = 2) {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

/* --------------------------- question stats --------------------------- */

export function computeQuestionStats(q: QuestionLike, index: number, rows: ResponseLike[]): QuestionStats {
  const n = rows.length;
  const given = rows.filter((r) => answerOf(r, q.id) !== "");
  const answered = given.length;

  const labels = optionLabels(q);
  const options: OptionStat[] = labels.map((label) => {
    const count = given.filter((r) => answerOf(r, q.id) === label).length;
    return { label, count, pctAnswered: pct(count, answered), pctAll: pct(count, n) };
  });

  // Capture any answers that don't match a declared option (legacy / edited surveys).
  if (q.type !== "text") {
    const known = new Set(labels);
    const extras = new Map<string, number>();
    given.forEach((r) => {
      const a = answerOf(r, q.id);
      if (!known.has(a)) extras.set(a, (extras.get(a) ?? 0) + 1);
    });
    extras.forEach((count, label) =>
      options.push({ label, count, pctAnswered: pct(count, answered), pctAll: pct(count, n) }),
    );
  }

  let rating: RatingStats | null = null;
  if (q.type === "rating") {
    const nums = given.map((r) => Number(answerOf(r, q.id))).filter((v) => Number.isFinite(v));
    if (nums.length) {
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
      rating = {
        n: nums.length,
        mean: round(mean),
        median: round(median(nums)),
        sd: round(Math.sqrt(variance)),
        min: Math.min(...nums),
        max: Math.max(...nums),
      };
    }
  }

  let text: TextStats | null = null;
  if (q.type === "text") {
    const raw = given.map((r) => ({ text: answerOf(r, q.id), at: r.created_at }));
    const words = raw.reduce((sum, v) => sum + v.text.split(/\s+/).filter(Boolean).length, 0);
    const themeSource = raw.map((v) => v.text);
    text = {
      verbatims: raw.map((v, i) => ({
        ref: `R${String(i + 1).padStart(3, "0")}`,
        text: v.text,
        at: v.at,
        sentiment: classifyResponse(v.text),
      })),
      themes: topWords(themeSource, 10).map((w) => ({ ...w, pct: pct(w.count, raw.length) })),
      sentiment: analyzeSentiment(themeSource),
      averageWords: raw.length ? Math.round(words / raw.length) : 0,
    };
  }

  return {
    question: q,
    index,
    variable: variableName(index),
    answered,
    skipped: n - answered,
    responseRate: pct(answered, n),
    options,
    rating,
    text,
  };
}

/* ---------------------------- survey stats ---------------------------- */

export function computeSurveyStats(
  survey: SurveyLike,
  rows: ResponseLike[],
  profiles: Record<string, ProfileLike>,
  totalResponses = rows.length,
): SurveyStats {
  const n = rows.length;
  const questions = (survey.questions ?? []).map((q, i) => computeQuestionStats(q, i + 1, rows));

  const slots = n * (survey.questions?.length ?? 0);
  const answeredSlots = questions.reduce((sum, q) => sum + q.answered, 0);
  const fullyCompleted = rows.filter((r) => (survey.questions ?? []).every((q) => answerOf(r, q.id) !== "")).length;

  const durations = rows.map((r) => r.duration_ms ?? 0).filter((d) => d > 0);
  const times = rows.map((r) => new Date(r.created_at).getTime()).filter((t) => Number.isFinite(t)).sort((a, b) => a - b);

  const buckets = new Map<string, number>();
  rows.forEach((r) => {
    const d = new Date(r.created_at).toISOString().slice(0, 10);
    buckets.set(d, (buckets.get(d) ?? 0) + 1);
  });

  const demoGroup = (key: keyof ProfileLike, label: string): DemographicGroup => {
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      const v = (profiles[r.respondent_id]?.[key] as string | null | undefined) ?? "";
      const k = v && v.trim() ? v.trim() : "Unspecified";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    return {
      key: String(key),
      label,
      rows: Array.from(counts.entries())
        .map(([l, count]) => ({ label: l, count, pct: pct(count, n) }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    };
  };

  return {
    n,
    totalResponses,
    questionCount: survey.questions?.length ?? 0,
    completionRate: pct(answeredSlots, slots),
    fullyCompleted,
    medianDurationMs: durations.length ? median(durations) : null,
    meanDurationMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    firstResponseAt: times.length ? new Date(times[0]).toISOString() : null,
    lastResponseAt: times.length ? new Date(times[times.length - 1]).toISOString() : null,
    goalProgress: survey.response_goal ? pct(n, survey.response_goal) : null,
    timeline: Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
    demographics: [
      demoGroup("university_name", "Institution"),
      demoGroup("department", "Department / field"),
      demoGroup("year", "Year / level"),
      demoGroup("country", "Country"),
      demoGroup("age_range", "Age range"),
    ].filter((g) => g.rows.length > 0 && !(g.rows.length === 1 && g.rows[0].label === "Unspecified")),
    questions,
  };
}

/* ------------------------------ cross-tabs ------------------------------ */

export type CrossTab = {
  rowQuestion: QuestionLike;
  colQuestion: QuestionLike;
  rowLabels: string[];
  colLabels: string[];
  cells: number[][]; // raw counts
  rowTotals: number[];
  colTotals: number[];
  total: number;
};

export function computeCrossTab(rowQ: QuestionLike, colQ: QuestionLike, rows: ResponseLike[]): CrossTab {
  const rowLabels = optionLabels(rowQ);
  const colLabels = optionLabels(colQ);
  const cells = rowLabels.map((rl) =>
    colLabels.map((cl) => rows.filter((r) => answerOf(r, rowQ.id) === rl && answerOf(r, colQ.id) === cl).length),
  );
  const rowTotals = cells.map((r) => r.reduce((a, b) => a + b, 0));
  const colTotals = colLabels.map((_, ci) => cells.reduce((sum, r) => sum + r[ci], 0));
  return {
    rowQuestion: rowQ,
    colQuestion: colQ,
    rowLabels,
    colLabels,
    cells,
    rowTotals,
    colTotals,
    total: rowTotals.reduce((a, b) => a + b, 0),
  };
}

/** Small-cell suppression: counts below the threshold are hidden from exports. */
export function suppress(count: number): number | null {
  return count > 0 && count < SUPPRESS_THRESHOLD ? null : count;
}

export const suppressed = (count: number) => (suppress(count) === null ? "—" : String(count));

/* ---------------------------- narrative bits ---------------------------- */

export function keyFindings(stats: SurveyStats, limit = 6): string[] {
  const out: string[] = [];
  for (const q of stats.questions) {
    if (out.length >= limit) break;
    if (q.answered === 0) continue;
    if (q.rating) {
      out.push(`Q${q.index} "${q.question.text}" averaged ${q.rating.mean.toFixed(2)} out of 5 (SD ${q.rating.sd.toFixed(2)}, n = ${q.rating.n}).`);
    } else if (q.question.type === "choice") {
      const top = [...q.options].sort((a, b) => b.count - a.count)[0];
      if (top && top.count > 0) {
        out.push(`Q${q.index} "${q.question.text}" — the most selected answer was "${top.label}" (${top.count} of ${q.answered}, ${top.pctAnswered}%).`);
      }
    } else if (q.text && q.text.sentiment.total > 0) {
      const s = q.text.sentiment;
      const theme = q.text.themes[0]?.word;
      out.push(
        `Q${q.index} "${q.question.text}" drew ${s.total} written response${s.total === 1 ? "" : "s"} (${s.positive}% positive, ${s.negative}% negative)${theme ? `, most often mentioning "${theme}"` : ""}.`,
      );
    }
  }
  return out;
}

export function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
