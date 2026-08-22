// CSV + research data package (ZIP) generation for survey owners.
// RFC 4180 quoting, UTF-8 BOM and CRLF so Excel opens accented text correctly.

import {
  answerOf,
  computeCrossTab,
  optionLabels,
  SUPPRESS_THRESHOLD,
  suppress,
  type ProfileLike,
  type ResponseLike,
  type SurveyLike,
  type SurveyStats,
} from "./stats";
import { visibilitySentence } from "./pdf";

const BOM = "\uFEFF";

function cell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (s === "") return "";
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Array<Array<unknown>>): string {
  return BOM + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(csv: string, filename: string) {
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

type PackageArgs = {
  survey: SurveyLike;
  stats: SurveyStats;
  rows: ResponseLike[];
  profiles: Record<string, ProfileLike>;
  filtersLabel: string | null;
};

const DEMO_COLUMNS: Array<[keyof ProfileLike, string]> = [
  ["university_name", "institution"],
  ["department", "department"],
  ["year", "year_level"],
  ["country", "country"],
  ["age_range", "age_range"],
];

/** One row per response, stable variable names — the analysis-ready file. */
export function responsesWideCsv({ survey, stats, rows, profiles }: PackageArgs): string {
  const header = [
    "respondent_id",
    "submitted_at",
    "duration_seconds",
    ...DEMO_COLUMNS.map(([, name]) => name),
    ...stats.questions.map((q) => q.variable),
  ];
  const body = rows.map((r) => {
    const p = profiles[r.respondent_id];
    return [
      r.respondent_id,
      r.created_at,
      r.duration_ms ? Math.round(r.duration_ms / 1000) : "",
      ...DEMO_COLUMNS.map(([key]) => (p?.[key] as string | null | undefined) ?? ""),
      ...survey.questions.map((q) => answerOf(r, q.id)),
    ];
  });
  return toCsv([header, ...body]);
}

/** Tidy/long format for R, Python, Stata. */
export function responsesLongCsv({ survey, stats, rows }: PackageArgs): string {
  const header = ["respondent_id", "submitted_at", "variable", "question_number", "question_id", "question_text", "question_type", "answer"];
  const body: Array<Array<unknown>> = [];
  rows.forEach((r) => {
    stats.questions.forEach((qs) => {
      const q = qs.question;
      body.push([r.respondent_id, r.created_at, qs.variable, `Q${qs.index}`, q.id, q.text, q.type, answerOf(r, q.id)]);
    });
  });
  void survey;
  return toCsv([header, ...body]);
}

/** The codebook that makes the wide file usable in analysis software. */
export function codebookCsv({ stats }: PackageArgs): string {
  const header = ["variable", "question_number", "question_id", "question_text", "type", "required", "allowed_values", "n_answered", "n_missing", "response_rate_pct"];
  const body = stats.questions.map((qs) => [
    qs.variable,
    `Q${qs.index}`,
    qs.question.id,
    qs.question.text,
    qs.question.type,
    qs.question.required ? "yes" : "no",
    optionLabels(qs.question).join(" | "),
    qs.answered,
    qs.skipped,
    qs.responseRate,
  ]);
  const demo = DEMO_COLUMNS.map(([, name]) => [name, "", "", `Respondent ${name.replace("_", " ")}`, "demographic", "no", "", stats.n, 0, 100]);
  return toCsv([header, ...body, ...demo]);
}

/** Every frequency table, stacked and ready to paste into a paper. */
export function summaryTablesCsv({ stats }: PackageArgs): string {
  const rows: Array<Array<unknown>> = [
    ["question_number", "variable", "question_text", "metric", "label", "count", "pct_of_answered", "pct_of_all"],
  ];
  stats.questions.forEach((qs) => {
    const base = [`Q${qs.index}`, qs.variable, qs.question.text];
    rows.push([...base, "answered", "", qs.answered, "", qs.responseRate]);
    rows.push([...base, "skipped", "", qs.skipped, "", ""]);
    qs.options.forEach((o) => rows.push([...base, "frequency", o.label, o.count, o.pctAnswered, o.pctAll]));
    if (qs.rating) {
      rows.push([...base, "mean", "", qs.rating.mean, "", ""]);
      rows.push([...base, "median", "", qs.rating.median, "", ""]);
      rows.push([...base, "sd", "", qs.rating.sd, "", ""]);
    }
    if (qs.text) {
      rows.push([...base, "sentiment", "positive", "", qs.text.sentiment.positive, ""]);
      rows.push([...base, "sentiment", "neutral", "", qs.text.sentiment.neutral, ""]);
      rows.push([...base, "sentiment", "negative", "", qs.text.sentiment.negative, ""]);
      qs.text.themes.forEach((t) => rows.push([...base, "theme", t.word, t.count, t.pct, ""]));
    }
  });
  return toCsv(rows);
}

/** Sample composition, exported so owners can report who actually answered. */
export function sampleProfileCsv({ stats }: PackageArgs): string {
  const rows: Array<Array<unknown>> = [["dimension", "category", "count", "pct_of_sample"]];
  stats.demographics.forEach((g) => g.rows.forEach((r) => rows.push([g.label, r.label, r.count, r.pct])));
  return toCsv(rows);
}

export function crossTabsCsv({ stats, rows }: PackageArgs): string {
  const closed = stats.questions.filter((q) => q.question.type !== "text" && q.answered > 0).map((q) => q.question);
  const out: Array<Array<unknown>> = [["row_question", "column_question", "row_answer", "column_answer", "count"]];
  for (let i = 0; i < closed.length - 1; i++) {
    const ct = computeCrossTab(closed[i], closed[i + 1], rows);
    ct.rowLabels.forEach((rl, ri) =>
      ct.colLabels.forEach((cl, ci) => {
        const v = suppress(ct.cells[ri][ci]);
        out.push([ct.rowQuestion.text, ct.colQuestion.text, rl, cl, v === null ? "suppressed" : v]);
      }),
    );
  }
  return toCsv(out);
}

export function verbatimsCsv({ stats }: PackageArgs): string {
  const rows: Array<Array<unknown>> = [["question_number", "variable", "question_text", "ref", "submitted_at", "sentiment", "answer"]];
  stats.questions
    .filter((q) => q.text)
    .forEach((qs) => qs.text!.verbatims.forEach((v) => rows.push([`Q${qs.index}`, qs.variable, qs.question.text, v.ref, v.at, v.sentiment, v.text])));
  return toCsv(rows);
}

export function readmeText({ survey, stats, filtersLabel }: PackageArgs): string {
  const generated = new Date().toISOString();
  return [
    `CampusVerify research data package`,
    `==================================`,
    ``,
    `Study:            ${survey.title}`,
    survey.description ? `Description:      ${survey.description}` : ``,
    `Survey ID:        ${survey.id}`,
    `Who could answer: ${visibilitySentence(survey)}`,
    `Fieldwork:        ${stats.firstResponseAt ?? "—"} to ${stats.lastResponseAt ?? "—"}`,
    `Responses:        ${stats.n}${stats.n !== stats.totalResponses ? ` (filtered cut of ${stats.totalResponses} collected)` : ""}`,
    `Questions:        ${stats.questionCount}`,
    `Completion rate:  ${stats.completionRate}% of answer slots filled`,
    `Filters applied:  ${filtersLabel ?? "none — all responses included"}`,
    `Generated:        ${generated}`,
    ``,
    `Files`,
    `-----`,
    `responses_wide.csv    One row per response. Use the codebook to map q1, q2 ... to questions.`,
    `responses_long.csv    Tidy format (one row per respondent x question) for R / Python / Stata.`,
    `codebook.csv          Variable names, full question wording, types, allowed values, missingness.`,
    `summary_tables.csv    Frequencies, percentages, rating statistics and text themes per question.`,
    `sample_profile.csv    Composition of the respondents (institution, department, year, country, age).`,
    `crosstabs.csv         Pairwise cross-tabulations of the closed questions.`,
    `verbatims.csv         Every open-text answer with a reference code and sentiment label.`,
    ``,
    `Privacy`,
    `-------`,
    `respondent_id is a pseudonymous token that is stable within this survey only. It cannot be`,
    `linked back to a CampusVerify account, and no names or email addresses are included.`,
    `Cross-tab cells with fewer than ${SUPPRESS_THRESHOLD} respondents are reported as "suppressed".`,
    ``,
    `Suggested citation`,
    `------------------`,
    `${survey.title}. Survey data collected via CampusVerify, n = ${stats.n}, ${generated.slice(0, 10)}.`,
    ``,
  ]
    .filter((l) => l !== ``)
    .join("\n");
}

export async function buildDataPackage(args: PackageArgs): Promise<Blob> {
  const { zipSync, strToU8 } = await import("fflate");
  const files: Record<string, Uint8Array> = {
    "responses_wide.csv": strToU8(responsesWideCsv(args)),
    "responses_long.csv": strToU8(responsesLongCsv(args)),
    "codebook.csv": strToU8(codebookCsv(args)),
    "summary_tables.csv": strToU8(summaryTablesCsv(args)),
    "sample_profile.csv": strToU8(sampleProfileCsv(args)),
    "crosstabs.csv": strToU8(crossTabsCsv(args)),
    "verbatims.csv": strToU8(verbatimsCsv(args)),
    "README.txt": strToU8(readmeText(args)),
  };
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped as unknown as BlobPart], { type: "application/zip" });
}
