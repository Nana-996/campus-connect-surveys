# Research-grade Analysis & Export for Survey Owners

## What I inspected

- `src/routes/_authenticated/survey.$id.analyze.tsx` (1370 lines) — the Analysis page: overview, questions, subgroup compare, cross-tab, raw data, saved views, share links, plus `exportCSV`, `exportPDF`, `exportQuestionPDF`, `exportQuestionCSV`.
- `src/routes/_authenticated/survey.$id.report.tsx` — the separate "Report Studio" (themed page-by-page PDF via html2canvas screenshots).
- `src/lib/survey-owner.functions.ts` — the server function that supplies survey, pseudonymised responses, profiles, visualizations, saved views, share tokens.
- `src/lib/text-analysis.ts`, and the `surveys` / `survey_responses` / `profiles` schema.

## What is currently weak

**PDF export**
- It is a plain Helvetica text dump: no cover page, no section structure, no tables, no page numbers, no CampusVerify identity.
- Charts are screenshots of live DOM cards via `html2canvas-pro`, forced by `setView("questions")` and a 400 ms `setTimeout`. This races (charts often capture blank or half-rendered), pulls in screen chrome and screen colours, and produces fuzzy raster images that print badly.
- Percentages are computed against the sum of counts, not against the number who answered the question, so "% of respondents" is wrong when a question is optional or skipped.
- Open-text answers are dumped in full with no counts, no themes, no truncation — a 500-response text question makes an unusable 60-page PDF.
- No methodology/metadata: no field period, no visibility/targeting description, no completion rate, no median duration, no filter provenance, no privacy statement, no citation line.
- Rating questions get no mean/median/SD/distribution table.
- No cross-tab or subgroup output at all in the export, although both exist on screen.

**CSV export**
- One wide file only. Every cell is wrapped in quotes including empty ones, no `\r\n` line endings and no BOM, so Excel mangles non-ASCII (Ghanaian names, accented text) and treats blanks inconsistently.
- Column headers are the raw question text prefixed with `Q: ` — long, duplicated when two questions share text, and unusable as variable names in SPSS/R/Stata.
- No respondent identifier column, no duration, no per-question "answered/skipped" distinction, no codebook, no long/tidy format, no summary tables.

**Product framing**
- The export language assumes students/campus ("university name", "Anonymous #"), while CampusVerify serves researchers and general users on campus-specific, students-only, and open surveys.
- Two competing exporters (Analysis page vs Report Studio) with different output; owners don't know which to use.

## What I'll build

### 1. A shared analytics + export module (`src/lib/report/`)

- `stats.ts` — one source of truth for per-question results: n answered, n skipped, response rate, option counts with % of answered and % of all, rating mean/median/SD/min/max, top-N text themes and sentiment, plus survey-level completion rate, median duration, responses-over-time, and demographic composition.
- `charts.ts` — vector chart drawing directly into jsPDF (bars, stacked bars, donut, sparkline) using the CampusVerify palette. No html2canvas, no DOM race, sharp at print resolution, works even when the user is on a different tab.
- `pdf.ts` — the report document (see below).
- `csv.ts` — the data package (see below).
- The Analysis page and Report Studio both consume this module, so the two stay consistent. Report Studio keeps its themes and page layout; its numbers come from `stats.ts`.

### 2. Research report PDF

Cream/green CampusVerify identity, A4, page numbers, running footer.

1. **Cover** — logo mark, title, description, field period, n, owner-facing "prepared by", generated timestamp.
2. **Methodology & metadata** — survey ID, visibility mode (campus-specific / all students / everyone / private) in plain words, targeting criteria, response goal vs achieved, completion rate, median completion time, any filters applied to this cut, and the privacy statement (pseudonymous IDs, small-cell suppression under 5).
3. **Sample profile** — table + chart of respondents by institution, department, year, country, age range, with counts and percentages.
4. **Executive summary** — auto-generated key findings: top answer per closed question, notable rating averages, strongest subgroup differences.
5. **Question-by-question** — for each question: numbered heading, question type, n answered / n skipped / response rate, a results table (option, count, % of answered, % of all), the matching chart, rating statistics where applicable, and for text questions a themes table plus a capped sample of verbatims with a "see the data package for all N verbatims" note.
6. **Subgroup comparison & cross-tabs** — the on-screen comparisons rendered as proper tables with row/column totals, honouring the existing <5 suppression rule.
7. **Appendix** — full question wording list and variable-name map matching the CSV codebook.

Owners get "Full report", "Summary only" (no verbatims/appendix), and the existing per-question export.

### 3. Research data package (ZIP)

One button producing a dated ZIP containing:

- `responses_wide.csv` — one row per response, stable variable names (`q1`, `q2`…), pseudonymous respondent ID, submitted timestamp, duration, demographic columns. UTF-8 BOM, CRLF, RFC-4180 quoting only where needed, blanks left blank.
- `responses_long.csv` — tidy format (respondent_id, question_id, variable, question_text, answer) for R/Python/Stata.
- `codebook.csv` — variable name, question number, full question text, type, required/optional, allowed values, n answered, n missing. This is what makes the wide file usable in analysis software.
- `summary_tables.csv` — every question's frequency/percentage table stacked, ready to paste into a paper.
- `crosstabs.csv` — the cross-tabs currently only visible on screen.
- `README.txt` — survey metadata, field period, filter provenance, privacy/suppression note, and a suggested citation line.

Individual CSVs remain downloadable for owners who want one file.

### 4. Analysis page UX

Replace the two loose buttons with a single **Export** menu: Research report (PDF), Summary report (PDF), Data package (ZIP), Responses only (CSV). A short preflight dialog lets the owner include/exclude verbatims, cross-tabs and the sample profile, and confirms whether the current filters apply to the export. Progress and error states via the existing sonner toasts.

## Scope guarantees

- No schema changes, no changes to RLS, credits, targeting, visibility, responses or permissions. Exports read exactly the data `getOwnerSurveyResults` already returns.
- Pseudonymisation and the <5 small-cell suppression rule are preserved everywhere, including in the new ZIP.
- Wording is neutral for students, researchers and general respondents — "respondents" and "institution", not "students" and "university" only.
- Existing green/cream visual identity and Report Studio themes preserved; no unrelated redesign.

## Technical notes

- Add one dependency, `fflate` (small, pure-JS, browser-safe) for ZIP creation. `jspdf` stays; `html2canvas-pro` stays for Report Studio's page capture but is no longer used for chart rendering in the Analysis export.
- All export code is client-side and dynamically imported, so the initial bundle is unaffected.
- `src/lib/report/*` are plain modules (no server functions), safe for the client graph.
