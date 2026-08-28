// WebMCP Challenge — added after competition start.
// Not part of pre-existing CampusVerify functionality.
//
// Aggregation helpers over the owner-scoped, pseudonymised payload returned by
// the existing `getOwnerSurveyResults` server function. Only aggregates leave
// these helpers; individual respondents are never described.

import { MIN_CELL, sanitizeText, untrusted } from "./untrusted";

export type OwnerQuestion = { id: string; type: string; text: string; options?: string[] };
export type OwnerResponse = { respondent_id: string; answers: Record<string, unknown>; created_at: string };
export type OwnerProfile = {
  id: string;
  department?: string | null;
  year?: string | null;
  country?: string | null;
  age_range?: string | null;
};

export type Dimension = "department" | "year" | "country" | "age_range";

export function questionsOf(survey: { questions?: unknown }): OwnerQuestion[] {
  const raw = Array.isArray(survey.questions) ? survey.questions : [];
  return raw
    .filter((q): q is Record<string, unknown> => !!q && typeof q === "object")
    .map((q) => ({
      id: String(q.id ?? ""),
      type: String(q.type ?? "text"),
      text: sanitizeText(q.text, 300),
      options: Array.isArray(q.options) ? q.options.map((o) => sanitizeText(o, 120)) : undefined,
    }))
    .filter((q) => q.id);
}

function answerValue(answers: Record<string, unknown>, qid: string): unknown {
  return answers?.[qid];
}

/** Aggregate distribution for one question over a set of responses. */
export function aggregateQuestion(question: OwnerQuestion, rows: OwnerResponse[]) {
  const values = rows.map((r) => answerValue(r.answers, question.id)).filter((v) => v !== undefined && v !== null && v !== "");
  const n = values.length;

  if (question.type === "rating") {
    const nums = values.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    const sorted = [...nums].sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
    return {
      question_id: question.id,
      question_text: untrusted(question.text, 300),
      type: question.type,
      n,
      mean: mean === null ? null : Number(mean.toFixed(2)),
      median,
    };
  }

  if (question.type === "choice") {
    const counts = new Map<string, number>();
    for (const v of values) {
      const key = sanitizeText(String(v), 120);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const distribution = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([option, count]) => ({
        option: untrusted(option, 120),
        count,
        pct: n ? Number(((count / n) * 100).toFixed(1)) : 0,
      }));
    return { question_id: question.id, question_text: untrusted(question.text, 300), type: question.type, n, distribution };
  }

  // Free text: never return verbatims through WebMCP — counts only.
  const lengths = values.map((v) => String(v).trim().length);
  return {
    question_id: question.id,
    question_text: untrusted(question.text, 300),
    type: "text",
    n,
    answered_pct: rows.length ? Number(((n / rows.length) * 100).toFixed(1)) : 0,
    avg_length_chars: lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0,
    note: "Verbatim free-text answers are not exposed through WebMCP. Open the survey's analysis page to read them.",
  };
}

export function subgroupCompare(input: {
  questions: OwnerQuestion[];
  rows: OwnerResponse[];
  profiles: OwnerProfile[];
  dimension: Dimension;
  groups?: string[];
  questionIds?: string[];
}) {
  const { questions, rows, profiles, dimension } = input;
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const buckets = new Map<string, OwnerResponse[]>();
  for (const r of rows) {
    const value = sanitizeText((profileMap.get(r.respondent_id)?.[dimension] as string) ?? "", 60) || "Unknown";
    if (input.groups?.length && !input.groups.some((g) => g.toLowerCase() === value.toLowerCase())) continue;
    const list = buckets.get(value) ?? [];
    list.push(r);
    buckets.set(value, list);
  }

  const selected = input.questionIds?.length ? questions.filter((q) => input.questionIds!.includes(q.id)) : questions;

  const groups = Array.from(buckets.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([group, groupRows]) => {
      if (groupRows.length < MIN_CELL) {
        return { group, n: groupRows.length, suppressed: true as const, questions: [] };
      }
      return {
        group,
        n: groupRows.length,
        questions: selected.map((q) => aggregateQuestion(q, groupRows)),
      };
    });

  return {
    dimension,
    total_responses: rows.length,
    min_group_size_for_detail: MIN_CELL,
    groups,
  };
}
