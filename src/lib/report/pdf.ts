// Research-grade PDF report for CampusVerify survey owners.
// Cream/green identity, vector charts, proper tables, methodology and appendix.

import {
  computeCrossTab,
  formatDuration,
  keyFindings,
  SUPPRESS_THRESHOLD,
  suppress,
  type CrossTab,
  type QuestionStats,
  type SurveyLike,
  type SurveyStats,
} from "./stats";
import {
  drawColumns,
  drawDonut,
  drawHorizontalBars,
  drawTimeline,
  fill,
  ink,
  INK,
  MUTED,
  PAPER,
  REPORT_PALETTE,
  RULE,
  stroke,
} from "./charts";

export type ReportOptions = {
  mode: "full" | "summary";
  includeSampleProfile: boolean;
  includeVerbatims: boolean;
  verbatimLimit: number;
  includeCrossTabs: boolean;
  includeAppendix: boolean;
  filtersLabel: string | null;
  preparedBy?: string | null;
};

export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  mode: "full",
  includeSampleProfile: true,
  includeVerbatims: true,
  verbatimLimit: 40,
  includeCrossTabs: true,
  includeAppendix: true,
  filtersLabel: null,
};

const VISIBILITY_TEXT: Record<string, string> = {
  campus: "Campus-specific — only members of the selected institution could see and answer it",
  students: "All students — any verified student on CampusVerify could see and answer it",
  everyone: "Everyone — any CampusVerify member (students, researchers and other users) could answer it",
  private: "Private / invite-only — restricted to explicitly invited people",
};

export function visibilitySentence(survey: SurveyLike) {
  return VISIBILITY_TEXT[String(survey.visibility ?? "everyone")] ?? VISIBILITY_TEXT.everyone;
}

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

export function safeFileName(title: string) {
  return (title || "survey").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "survey";
}

/* ------------------------------ layout core ------------------------------ */

class Layout {
  doc: any;
  W: number;
  H: number;
  margin = 48;
  y: number;
  page = 1;
  title: string;

  constructor(doc: any, title: string) {
    this.doc = doc;
    this.W = doc.internal.pageSize.getWidth();
    this.H = doc.internal.pageSize.getHeight();
    this.y = this.margin;
    this.title = title;
  }

  get contentW() {
    return this.W - this.margin * 2;
  }

  newPage() {
    // Never emit an empty sheet: if nothing has been drawn on the current
    // page yet, reuse it instead of adding a blank one.
    if (this.y <= this.margin && this.doc.getNumberOfPages() > 1) return;
    this.doc.addPage();
    this.page += 1;
    this.paintPage();
    this.y = this.margin;
  }

  paintPage() {
    fill(this.doc, PAPER);
    this.doc.rect(0, 0, this.W, this.H, "F");
  }

  space(h: number) {
    if (this.y + h > this.H - this.margin - 24) this.newPage();
  }

  gap(h: number) {
    this.y += h;
  }

  text(txt: string, opts: { size?: number; bold?: boolean; color?: string; leading?: number } = {}) {
    const size = opts.size ?? 9.5;
    const leading = opts.leading ?? size + 4;
    this.doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    ink(this.doc, opts.color ?? INK);
    const lines = this.doc.splitTextToSize(txt, this.contentW);
    for (const ln of lines) {
      this.space(leading);
      this.doc.text(ln, this.margin, this.y + size * 0.8);
      this.y += leading;
    }
  }

  eyebrow(txt: string) {
    this.space(18);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.5);
    ink(this.doc, MUTED);
    this.doc.text(txt.toUpperCase(), this.margin, this.y + 6);
    this.y += 14;
  }

  sectionTitle(txt: string) {
    this.space(34);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(15);
    ink(this.doc, REPORT_PALETTE[0]);
    this.doc.text(txt, this.margin, this.y + 12);
    this.y += 20;
    stroke(this.doc, REPORT_PALETTE[0]);
    this.doc.setLineWidth(1);
    this.doc.line(this.margin, this.y, this.margin + 46, this.y);
    this.y += 12;
  }

  rule() {
    this.space(10);
    stroke(this.doc, RULE);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.y, this.W - this.margin, this.y);
    this.y += 10;
  }

  keyValues(pairs: Array<[string, string]>) {
    const colW = this.contentW / 2 - 10;
    pairs.forEach(([k, v], i) => {
      const col = i % 2;
      if (col === 0) this.space(30);
      const x = this.margin + col * (colW + 20);
      const yStart = this.y;
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(7);
      ink(this.doc, MUTED);
      this.doc.text(k.toUpperCase(), x, yStart + 6);
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(9);
      ink(this.doc, INK);
      const lines = this.doc.splitTextToSize(v || "—", colW);
      lines.slice(0, 3).forEach((ln: string, li: number) => this.doc.text(ln, x, yStart + 18 + li * 11));
      if (col === 1 || i === pairs.length - 1) {
        const used = 18 + Math.min(3, this.doc.splitTextToSize(v || "—", colW).length) * 11;
        this.y = yStart + Math.max(30, used) + 4;
      }
    });
  }

  table(head: string[], rows: string[][], opts: { widths?: number[]; align?: Array<"left" | "right"> } = {}) {
    const widths = opts.widths ?? head.map(() => this.contentW / head.length);
    const align = opts.align ?? head.map(() => "left" as const);
    const rowH = 15;

    const drawHead = () => {
      this.space(rowH + 4);
      fill(this.doc, "#e8efe4");
      this.doc.rect(this.margin, this.y, this.contentW, rowH, "F");
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(7.5);
      ink(this.doc, REPORT_PALETTE[0]);
      let x = this.margin + 6;
      head.forEach((h, i) => {
        const right = align[i] === "right";
        this.doc.text(h.toUpperCase(), right ? x + widths[i] - 12 : x, this.y + 10, right ? { align: "right" } : undefined);
        x += widths[i];
      });
      this.y += rowH;
    };

    drawHead();
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8.5);
    rows.forEach((row, ri) => {
      if (this.y + rowH > this.H - this.margin - 24) {
        this.newPage();
        drawHead();
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(8.5);
      }
      if (ri % 2 === 1) {
        fill(this.doc, "#f3eee4");
        this.doc.rect(this.margin, this.y, this.contentW, rowH, "F");
      }
      let x = this.margin + 6;
      row.forEach((cell, ci) => {
        ink(this.doc, ci === 0 ? INK : MUTED);
        const right = align[ci] === "right";
        const maxW = widths[ci] - 12;
        let t = String(cell ?? "");
        while (t.length > 1 && this.doc.getTextWidth(t) > maxW) t = t.slice(0, -1);
        if (t.length < String(cell ?? "").length) t = `${t.slice(0, -1)}…`;
        this.doc.text(t, right ? x + widths[ci] - 12 : x, this.y + 10, right ? { align: "right" } : undefined);
        x += widths[ci];
      });
      stroke(this.doc, RULE);
      this.doc.setLineWidth(0.3);
      this.doc.line(this.margin, this.y + rowH, this.W - this.margin, this.y + rowH);
      this.y += rowH;
    });
    this.y += 8;
  }

  stampFooters() {
    const total = this.doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p);
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7);
      ink(this.doc, MUTED);
      this.doc.text(`CampusVerify · ${this.title}`, this.margin, this.H - 24);
      this.doc.text(`Page ${p} of ${total}`, this.W - this.margin, this.H - 24, { align: "right" });
    }
  }
}

/* ------------------------------- sections ------------------------------- */

function cover(L: Layout, survey: SurveyLike, stats: SurveyStats, options: ReportOptions) {
  const { doc } = L;
  fill(doc, REPORT_PALETTE[0]);
  doc.rect(0, 0, L.W, 190, "F");

  fill(doc, "#b8c47a");
  doc.roundedRect(L.margin, 44, 34, 34, 10, 10, "F");
  ink(doc, REPORT_PALETTE[0]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("C", L.margin + 12, 68);

  ink(doc, "#e8efe4");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CAMPUSVERIFY · SURVEY RESEARCH REPORT", L.margin + 46, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(options.mode === "summary" ? "Summary edition" : "Full edition", L.margin + 46, 72);

  ink(doc, "#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  const titleLines = doc.splitTextToSize(survey.title, L.contentW).slice(0, 3);
  titleLines.forEach((ln: string, i: number) => doc.text(ln, L.margin, 118 + i * 26));

  L.y = 210;
  if (survey.description) L.text(survey.description, { size: 10, color: MUTED });
  L.gap(6);

  const cards: Array<[string, string]> = [
    ["Responses analysed", String(stats.n)],
    ["Questions", String(stats.questionCount)],
    ["Completion", `${stats.completionRate}%`],
    ["Median time", formatDuration(stats.medianDurationMs)],
  ];
  const cw = (L.contentW - 24) / 4;
  cards.forEach(([k, v], i) => {
    const x = L.margin + i * (cw + 8);
    fill(L.doc, "#ffffff");
    stroke(L.doc, RULE);
    L.doc.setLineWidth(0.5);
    L.doc.roundedRect(x, L.y, cw, 54, 8, 8, "FD");
    ink(L.doc, MUTED);
    L.doc.setFont("helvetica", "bold");
    L.doc.setFontSize(6.5);
    L.doc.text(k.toUpperCase(), x + 10, L.y + 17);
    ink(L.doc, REPORT_PALETTE[0]);
    L.doc.setFontSize(17);
    L.doc.text(v, x + 10, L.y + 40);
  });
  L.y += 70;

  L.text(
    `Fieldwork ${fmtDate(stats.firstResponseAt)} – ${fmtDate(stats.lastResponseAt)} · generated ${fmtDateTime(new Date().toISOString())}`,
    { size: 8, color: MUTED },
  );
  if (options.preparedBy) L.text(`Prepared by ${options.preparedBy}`, { size: 8, color: MUTED });
  if (options.filtersLabel) L.text(`Filtered cut: ${options.filtersLabel}`, { size: 8, color: MUTED });
}

function methodology(L: Layout, survey: SurveyLike, stats: SurveyStats, options: ReportOptions) {
  L.newPage();
  L.sectionTitle("Methodology & metadata");

  const targeting: string[] = [];
  if (survey.target_department) targeting.push(`Department: ${survey.target_department}`);
  if (survey.target_year) targeting.push(`Year: ${survey.target_year}`);
  if (survey.target_country) targeting.push(`Country: ${survey.target_country}`);
  if (survey.target_age_range) targeting.push(`Age: ${survey.target_age_range}`);
  if (survey.target_interests?.length) targeting.push(`Interests: ${survey.target_interests.join(", ")}`);
  if (survey.target_universities?.length) targeting.push(`Institutions: ${survey.target_universities.join(", ")}`);

  L.keyValues([
    ["Survey ID", survey.id],
    ["Status", survey.is_active === false ? "Closed" : "Open"],
    ["Who could respond", visibilitySentence(survey)],
    ["Required criteria", survey.required_criteria?.length ? survey.required_criteria.join(", ") : "None — criteria were preferences, not filters"],
    ["Targeting", targeting.length ? targeting.join(" · ") : "No demographic targeting applied"],
    ["Publishing tier", survey.tier ? String(survey.tier) : "—"],
    ["Launched", fmtDateTime(survey.created_at)],
    ["Closes", survey.expires_at ? fmtDateTime(survey.expires_at) : "—"],
    ["Responses analysed", `${stats.n}${stats.n !== stats.totalResponses ? ` of ${stats.totalResponses} collected (filtered cut)` : ""}`],
    ["Response goal", survey.response_goal ? `${survey.response_goal} target · ${stats.goalProgress}% reached` : "Not set"],
    ["Fully completed", `${stats.fullyCompleted} of ${stats.n} answered every question`],
    ["Completion rate", `${stats.completionRate}% of all answer slots filled`],
    ["Median / mean time", `${formatDuration(stats.medianDurationMs)} / ${formatDuration(stats.meanDurationMs)}`],
    ["Filters applied", options.filtersLabel ?? "None — all responses included"],
  ]);

  L.rule();
  L.eyebrow("Privacy & data handling");
  L.text(
    "Respondents are pseudonymous. CampusVerify replaces every real account ID with a stable per-survey token before results leave the server, so answers cannot be traced back to an individual account. Names and email addresses are never included in an export.",
    { size: 9, color: MUTED },
  );
  L.text(
    `Small-cell suppression: any cross-tabulated cell containing fewer than ${SUPPRESS_THRESHOLD} respondents is reported as "—" to prevent re-identification within small subgroups.`,
    { size: 9, color: MUTED },
  );

  if (stats.timeline.length > 0) {
    L.gap(6);
    L.eyebrow("Responses over time");
    L.space(96);
    drawTimeline(L.doc, { x: L.margin, y: L.y, w: L.contentW, h: 90, data: stats.timeline });
    L.y += 96;
  }
}

function sampleProfile(L: Layout, stats: SurveyStats) {
  if (stats.demographics.length === 0) return;
  L.newPage();
  L.sectionTitle("Sample profile");
  L.text(
    "Composition of the respondents included in this report. Categories reflect the profile information respondents chose to provide; 'Unspecified' means the field was left blank.",
    { size: 9, color: MUTED },
  );
  L.gap(4);

  stats.demographics.forEach((group) => {
    L.eyebrow(group.label);
    const rows = group.rows.slice(0, 12);
    L.table(
      ["Category", "Respondents", "% of sample"],
      rows.map((r) => [r.label, String(r.count), `${r.pct}%`]),
      { widths: [L.contentW * 0.56, L.contentW * 0.22, L.contentW * 0.22], align: ["left", "right", "right"] },
    );
    if (group.rows.length > rows.length) {
      L.text(`+ ${group.rows.length - rows.length} further categories — see the data package.`, { size: 8, color: MUTED });
    }
  });
}

function executiveSummary(L: Layout, stats: SurveyStats) {
  const findings = keyFindings(stats, 8);
  if (findings.length === 0) return;
  L.newPage();
  L.sectionTitle("Executive summary");
  L.text(
    `Based on ${stats.n} response${stats.n === 1 ? "" : "s"} across ${stats.questionCount} question${stats.questionCount === 1 ? "" : "s"}.`,
    { size: 9, color: MUTED },
  );
  L.gap(4);
  findings.forEach((f) => {
    L.space(16);
    fill(L.doc, REPORT_PALETTE[2]);
    L.doc.circle(L.margin + 3, L.y + 5, 2.2, "F");
    const before = L.margin;
    L.margin += 14;
    L.text(f, { size: 9.5 });
    L.margin = before;
    L.gap(2);
  });
}

function questionSection(L: Layout, qs: QuestionStats, options: ReportOptions) {
  L.space(90);
  L.gap(4);

  L.doc.setFont("helvetica", "bold");
  L.doc.setFontSize(11.5);
  ink(L.doc, INK);
  const heading = L.doc.splitTextToSize(`Q${qs.index}. ${qs.question.text}`, L.contentW);
  heading.forEach((ln: string) => {
    L.space(16);
    L.doc.text(ln, L.margin, L.y + 10);
    L.y += 15;
  });

  const typeLabel = qs.question.type === "text" ? "Open text" : qs.question.type === "rating" ? "Rating (1–5)" : "Single choice";
  L.text(
    `${typeLabel} · ${qs.question.required ? "Required" : "Optional"} · variable ${qs.variable} · ${qs.answered} answered, ${qs.skipped} skipped (${qs.responseRate}% response rate)`,
    { size: 8, color: MUTED },
  );
  L.gap(4);

  if (qs.answered === 0) {
    L.text("No answers were submitted for this question.", { size: 9, color: MUTED });
    L.rule();
    return;
  }

  if (qs.question.type === "text" && qs.text) {
    const t = qs.text;
    L.table(
      ["Sentiment", "Share", "Responses"],
      [
        ["Positive", `${t.sentiment.positive}%`, String(Math.round((t.sentiment.positive / 100) * t.sentiment.total))],
        ["Neutral", `${t.sentiment.neutral}%`, String(Math.round((t.sentiment.neutral / 100) * t.sentiment.total))],
        ["Negative", `${t.sentiment.negative}%`, String(Math.round((t.sentiment.negative / 100) * t.sentiment.total))],
      ],
      { widths: [L.contentW * 0.5, L.contentW * 0.25, L.contentW * 0.25], align: ["left", "right", "right"] },
    );
    if (t.themes.length) {
      L.eyebrow("Recurring themes");
      L.table(
        ["Term", "Mentions", "% of written answers"],
        t.themes.slice(0, 8).map((th) => [th.word, String(th.count), `${th.pct}%`]),
        { widths: [L.contentW * 0.5, L.contentW * 0.25, L.contentW * 0.25], align: ["left", "right", "right"] },
      );
    }
    L.text(`Average length: ${t.averageWords} words per answer.`, { size: 8, color: MUTED });

    if (options.includeVerbatims) {
      const shown = t.verbatims.slice(0, options.verbatimLimit);
      L.eyebrow(`Verbatim responses (${shown.length} of ${t.verbatims.length})`);
      shown.forEach((v) => {
        L.space(20);
        L.doc.setFont("helvetica", "bold");
        L.doc.setFontSize(7);
        ink(L.doc, MUTED);
        L.doc.text(v.ref, L.margin, L.y + 8);
        const before = L.margin;
        L.margin += 34;
        L.text(v.text, { size: 8.5 });
        L.margin = before;
        L.gap(2);
      });
      if (t.verbatims.length > shown.length) {
        L.text(`+ ${t.verbatims.length - shown.length} further verbatim responses — all of them are in the data package (responses_long.csv).`, {
          size: 8,
          color: MUTED,
        });
      }
    } else {
      L.text(`All ${t.verbatims.length} verbatim responses are available in the data package (responses_long.csv).`, { size: 8, color: MUTED });
    }
    L.rule();
    return;
  }

  // Closed questions: chart + frequency table
  const data = qs.options.map((o) => ({ label: o.label, count: o.count }));
  if (qs.question.type === "rating") {
    L.space(126);
    drawColumns(L.doc, { x: L.margin, y: L.y, w: L.contentW, h: 120, data });
    L.y += 126;
    if (qs.rating) {
      L.table(
        ["Mean", "Median", "Std. dev.", "Min", "Max", "n"],
        [[qs.rating.mean.toFixed(2), qs.rating.median.toFixed(2), qs.rating.sd.toFixed(2), String(qs.rating.min), String(qs.rating.max), String(qs.rating.n)]],
        { widths: Array(6).fill(L.contentW / 6), align: ["right", "right", "right", "right", "right", "right"] },
      );
    }
  } else if (data.length <= 6) {
    const size = 110;
    L.space(size + 16);
    drawDonut(L.doc, { x: L.margin, y: L.y, size, data, legendWidth: L.contentW - size - 20 });
    L.y += Math.max(size, data.length * 13 + 10) + 12;
  } else {
    const h = drawHorizontalBars(L.doc, { x: L.margin, y: L.y + 4, w: L.contentW, data: data.slice(0, 12) });
    L.space(h + 12);
    L.y += h + 12;
  }

  L.table(
    ["Answer", "Count", "% of answered", "% of all respondents"],
    qs.options.map((o) => [o.label, String(o.count), `${o.pctAnswered}%`, `${o.pctAll}%`]),
    {
      widths: [L.contentW * 0.4, L.contentW * 0.16, L.contentW * 0.22, L.contentW * 0.22],
      align: ["left", "right", "right", "right"],
    },
  );
  L.rule();
}

function crossTabSection(L: Layout, tabs: CrossTab[]) {
  if (tabs.length === 0) return;
  L.newPage();
  L.sectionTitle("Cross-tabulations");
  L.text(
    `Each table shows how answers to one question break down by another. Cells with fewer than ${SUPPRESS_THRESHOLD} respondents are suppressed and shown as "—".`,
    { size: 9, color: MUTED },
  );
  tabs.forEach((ct) => {
    L.gap(6);
    L.eyebrow(`Q: ${ct.rowQuestion.text}  ×  ${ct.colQuestion.text}`);
    const head = ["", ...ct.colLabels, "Total"];
    const widths = head.map((_, i) => (i === 0 ? L.contentW * 0.28 : (L.contentW * 0.72) / (head.length - 1)));
    const rows = ct.rowLabels.map((rl, ri) => [
      rl,
      ...ct.cells[ri].map((c) => (suppress(c) === null ? "—" : String(c))),
      String(ct.rowTotals[ri]),
    ]);
    rows.push(["Total", ...ct.colTotals.map((c) => String(c)), String(ct.total)]);
    L.table(head, rows, { widths, align: head.map((_, i) => (i === 0 ? "left" : "right")) });
  });
}

function appendix(L: Layout, stats: SurveyStats) {
  L.newPage();
  L.sectionTitle("Appendix · questionnaire and variables");
  L.text(
    "Full question wording with the variable names used in the accompanying data package, so tables in this report can be reproduced from the raw file.",
    { size: 9, color: MUTED },
  );
  L.table(
    ["Variable", "Q#", "Question wording", "Type", "n"],
    stats.questions.map((q) => [
      q.variable,
      `Q${q.index}`,
      q.question.text,
      q.question.type === "text" ? "text" : q.question.type === "rating" ? "rating 1-5" : "choice",
      String(q.answered),
    ]),
    {
      widths: [L.contentW * 0.12, L.contentW * 0.08, L.contentW * 0.54, L.contentW * 0.16, L.contentW * 0.1],
      align: ["left", "left", "left", "left", "right"],
    },
  );
}

/* -------------------------------- entry -------------------------------- */

export async function buildResearchReport(args: {
  survey: SurveyLike;
  stats: SurveyStats;
  rows: any[];
  options: ReportOptions;
}): Promise<Blob> {
  const { survey, stats, rows, options } = args;
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });

  const L = new Layout(doc, survey.title);
  L.paintPage();

  cover(L, survey, stats, options);
  methodology(L, survey, stats, options);
  if (options.includeSampleProfile) sampleProfile(L, stats);
  executiveSummary(L, stats);

  L.newPage();
  L.sectionTitle("Results question by question");
  stats.questions.forEach((qs) => questionSection(L, qs, options));

  if (options.includeCrossTabs && options.mode === "full") {
    const closed = stats.questions.filter((q) => q.question.type !== "text" && q.answered > 0).map((q) => q.question);
    const tabs: CrossTab[] = [];
    for (let i = 0; i < closed.length - 1 && tabs.length < 6; i++) {
      tabs.push(computeCrossTab(closed[i], closed[i + 1], rows));
    }
    crossTabSection(L, tabs);
  }

  if (options.includeAppendix) appendix(L, stats);

  L.newPage();
  L.sectionTitle("Suggested citation");
  L.text(
    `${options.preparedBy ? `${options.preparedBy}. ` : ""}${survey.title}. Survey data collected via CampusVerify, ${fmtDate(stats.firstResponseAt)}–${fmtDate(stats.lastResponseAt)}, n = ${stats.n}. Report generated ${fmtDate(new Date().toISOString())}.`,
    { size: 9.5 },
  );
  L.gap(6);
  L.text(
    "CampusVerify connects researchers and respondents across campuses and beyond. Raw data, codebook and summary tables for this study are available from the survey owner as a downloadable data package.",
    { size: 8.5, color: MUTED },
  );

  L.stampFooters();
  return doc.output("blob");
}
