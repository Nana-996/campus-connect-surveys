# Redesigning the report export and the Analysis page

## What I found in the current code

There are **two separate exporters**, and they disagree:

- **Analysis page → "Export results" dialog** (`SurveyExportDialog` → `src/lib/report/pdf.ts`) draws charts as real vector graphics into the PDF. This one is structurally sound.
- **Report Studio** (`survey.$id.report.tsx`) builds the PDF by screenshotting the on-screen pages with `html2canvas-pro` after a fixed 300 ms wait. This is where missing/blank graphs come from: the wait is a guess, animated chart libraries frequently have not painted yet, and any element using an unsupported colour function makes the capture fail silently. It also produces fuzzy raster pages.

Other confirmed problems:

- **Loading is hand-rolled.** Both pages use `useEffect` + `useState` with no retry, no error screen and no distinction between "still loading", "no access", "load failed" and "zero responses". If the fetch throws, the page shows *"Survey not found or you don't have access"* plus a toast that disappears — which matches "responses sometimes do not load".
- **The owner's chart choices are ignored in the export.** `survey_visualizations.chart_type` is saved per question and used on screen, but the PDF re-decides: rating → columns, ≤6 options → donut, otherwise bars. So the export does not match the app.
- **Branding is a placeholder.** The cover draws a rounded square with the letter "C" instead of the real `logo-mark.png`, and there is no researcher, institution or confidentiality block.
- **Layout bugs.** In the horizontal-bar branch, the chart is drawn *before* the page-space check, so a chart near the bottom can be cut in half. Long option labels are truncated with no legend fallback. Bars and columns show counts but never percentages.
- **Cross-tabs are arbitrary** — the report pairs question 1×2, 2×3, 3×4… rather than what the owner chose on screen.
- **A legacy CSV exporter still lives in the Analysis page** (quotes every cell, no BOM, `Q: <full question text>` headers) alongside the good `src/lib/report/csv.ts`.

---

## 1. What the exported report contains

Single A4 PDF, cream/green CampusVerify identity, in this order:

1. **Cover** — real CampusVerify logo mark, report title, survey title/subtitle, prepared-by (researcher name), institution where known, fieldwork period, response count, generation date, and an edition label (Full / Summary).
2. **Confidentiality & privacy notice** — on the cover foot: pseudonymous respondents, no names or emails, small-cell suppression under 5, and "intended for the named recipient".
3. **Table of contents** with page numbers (full edition only).
4. **Executive summary** — 5–8 auto-drafted findings the owner can edit before export.
5. **Methodology & survey information** — survey ID, status, who could respond, targeting, required vs preferred criteria, launch/close dates, response goal vs achieved, completion rate, median/mean time, filters applied to this cut, and a responses-over-time chart.
6. **Respondent profile** — institution, department, year, country, age range as table + chart, each with counts and % of sample. Conditional: skipped entirely when no demographic field has data.
7. **Question-by-question results** — per question: number, wording, type, required/optional, n answered / skipped / response rate, the chart, and a frequency table (answer, count, % of answered, % of all). Rating questions add mean/median/SD/min/max. Text questions get themes, sentiment and a capped set of verbatims.
8. **Cross-tabulations** — only the pairs the owner selected on screen, with row/column totals and <5 suppression. Conditional.
9. **Key findings & interpretation** — owner-written commentary per question, carried over from Report Studio.
10. **Appendix** — full questionnaire wording and the variable map matching the CSV codebook, plus a line stating that raw responses are available as a separate data package. Conditional.
11. **Suggested citation.**

Every page carries a running header (survey title) and footer (CampusVerify · page X of Y · generated date).

## 2. What is deliberately excluded

- Raw per-respondent answer tables (they belong in the CSV/ZIP, not a 200-page PDF).
- Pseudonymous respondent IDs next to answers.
- Screenshots of app chrome: filter bars, tabs, buttons, share links, saved-view controls.
- Credits, tiers, boosts, pricing and any CampusVerify billing language.
- Unbounded verbatim dumps — capped per question with a pointer to the data package.
- Empty sections: a question with zero answers gets one line, not a chart; a missing demographic field is omitted rather than shown as an empty table.
- Decorative gradients, emoji and marketing copy.

## 3. Charts: selection and reliable rendering

- **All report charts stay vector-drawn into jsPDF** (`src/lib/report/charts.ts`). No `html2canvas` anywhere in the export path — that removes the render race and blank charts entirely, and works even if the tab is in the background.
- **The export honours the owner's saved chart type** from `survey_visualizations`, falling back to a sane default: rating → column chart; ≤6 options → donut with legend; 7–15 → horizontal bars; >15 → bars for the top 12 plus an explicit "+N further answers (see table)" line; text → no chart.
- **Labels and legends fixed**: every bar/column/slice shows count *and* % of answered; long labels wrap to two lines instead of being cut with "…"; donut legends show label, count and %; axis baselines and a "n = X answered" caption on every chart.
- **Guards**: a question with 0 answers renders a "no answers" note, never an empty axis; all-zero data renders the table only; the drawing helpers return their measured height and the layout reserves space *before* drawing, so no chart is ever split across a page break.
- Report Studio keeps `html2canvas` only for its on-screen themed preview export, or is retired in favour of the shared vector engine (my recommendation, see section 8).

## 4. Loading and normalizing response data

- Move both pages to **TanStack Query** with the existing `getOwnerSurveyResults` server function: keyed by survey id, retried twice, with explicit `isPending` / `isError` / empty states instead of a silent fallback.
- Distinguish four states in the UI: **loading** (skeleton), **not owner / not found** (clear message), **load failed** (error card with a Retry button and the reason), **loaded but zero responses** (empty state explaining the report will be structural only).
- One **normalization step** before analysis and export: coerce `answers` to a string map, trim, drop answers whose question no longer exists, map answers that don't match any declared option into an explicit "Other / legacy answer" row, treat blank/whitespace as skipped, and guard against null `duration_ms` and unparseable timestamps.
- **The export dialog refuses to run on stale or failed data.** It reads the same query result the page renders; if the query is loading, errored, or the row count has changed since the page loaded, the Download button is disabled with an explanation. Zero-response exports produce a valid structural report with an explicit "no responses collected" statement rather than an empty file.
- Every export logs a one-line integrity check (rows in, rows counted per question) and surfaces a warning in the PDF's methodology page if any response was dropped during normalization.

## 5. Cover / header / footer system

A single branded frame applied to every generated PDF:

- **Cover**: green band with the real `logo-mark.png`, "CampusVerify · Survey Research Report", report title, survey subtitle, then a metadata block — prepared by, institution (from the owner's profile / survey university domain, omitted when unknown), fieldwork dates, responses analysed, questions, completion rate, median time, generated timestamp, and the filtered-cut label when filters were applied.
- **Confidentiality line** on the cover and repeated in the methodology section.
- **Running header** from page 2: survey title (left), section name (right), hairline rule.
- **Footer** on every page: "CampusVerify · campus-verify.live", page X of Y, generation date.
- Colours and type come from the existing report palette (deep green #1f4d33, sage, cream paper) — no new brand identity.

## 6. Sections and their conditions

| Section | Included when |
| --- | --- |
| Cover, methodology, question-by-question, footer/citation | Always |
| Table of contents | Full edition, more than ~4 pages |
| Executive summary | At least one question has answers |
| Respondent profile | At least one demographic field has real values |
| Charts per question | Question is choice/rating and has ≥1 answer |
| Verbatims | Text questions exist, owner enabled them |
| Cross-tabulations | Owner selected at least one pair, ≥2 closed questions |
| Interpretation/commentary | Owner wrote any |
| Appendix + variable map | Full edition, owner enabled it |

## 7. Export formats

- **PDF first** — the visual report, in Full and Summary editions.
- **Data exports stay separate**: "Responses only (CSV)" and the ZIP data package (wide + long responses, codebook, summary tables, cross-tabs, README with citation). No raw response tables inside the PDF.
- **XLSX**: not added now. The Excel-safe CSV (UTF-8 BOM, CRLF, RFC-4180 quoting) already opens correctly; XLSX would add a dependency for little gain. Flag it as a later option.
- The legacy CSV exporter in the Analysis page is deleted so there is one CSV implementation.

## 8. Analysis page changes (scoped)

- One **Export** entry point (the existing dialog), with a small preflight: report title, prepared-by, institution, edition, and include/exclude toggles for profile, verbatims, cross-tabs, appendix. It shows exactly how many responses will be included.
- The dialog gains a **"what you see is what you export" guarantee**: it uses the same filtered rows, the same chart types and the same computed stats object the page renders.
- On-screen **cross-tab and subgroup selections are remembered** and passed to the export instead of the report auto-guessing pairs.
- Chart-type pickers on screen persist to `survey_visualizations` (already the case) and now drive the PDF.
- Error/empty/loading states as described in section 4.
- **Report Studio**: keep the page and its commentary/section-ordering, but switch its Export button to the shared vector PDF builder so both routes produce the same document. No visual redesign of unrelated pages.

## 9. Mobile and desktop

- Export dialog becomes a full-height sheet on small screens with stacked options and a sticky Download button.
- Charts on screen keep their responsive containers; PDF output is resolution-independent and identical on phone and desktop because it is generated from data, not from the DOM.
- Large exports run in chunks with a progress toast so mobile Safari does not appear frozen; the blob is downloaded via the existing `downloadBlob` helper which works on iOS.
- Analysis tables get horizontal scroll containers instead of shrinking text.

## 10. Verification plan

Automated (Vitest, on `src/lib/report/*`):

- Totals parity: for a fixture survey, per-question `answered + skipped === n`, option counts sum to `answered`, and the numbers the PDF builder receives are the identical `SurveyStats` object the Analysis page renders.
- Percentages: `% of answered` sums to 100 (±0.1) per closed question; `% of all` uses n, not the answered subset.
- Normalization: blank strings, whitespace, unknown options, null durations and bad timestamps all handled without throwing.
- Suppression: every cross-tab cell with 1–4 respondents renders as "—" in both PDF and CSV.

Fixture matrix — each generates a PDF and is checked for page count, no blank charts and no overlapping text:

1. 0 responses, 2. 1 response, 3. 4 responses (suppression boundary), 4. ~50, 5. ~1,000 with 20 questions, 6. all three question types together, 7. every optional demographic missing, 8. very long question wording and 400-word verbatims, 9. a question with 20 options, 10. filtered cut vs unfiltered.

Manual QA: render each generated PDF to images and inspect for clipped text, split charts, wrong page numbering and missing branding, then compare three question totals per fixture against the on-screen figures.

## Technical notes

- Files touched: `src/lib/report/charts.ts`, `pdf.ts`, `stats.ts`, `csv.ts`; a new `src/lib/report/normalize.ts`; `src/components/SurveyExportDialog.tsx`; `src/routes/_authenticated/survey.$id.analyze.tsx`; `src/routes/_authenticated/survey.$id.report.tsx`; new tests under `src/lib/report/__tests__/`.
- `getOwnerSurveyResults` gains the owner's display name and institution for the cover (no new tables, no schema migration, no RLS change).
- Logo embedded as a base64 asset so the PDF never depends on a network fetch.
- No new dependencies; `html2canvas-pro` is removed from the export path.
