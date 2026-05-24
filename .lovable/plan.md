# Survey Insights & Reports

Add an Analyze area to each survey the creator owns, turning raw responses into research-quality outputs. Free tier covers basic analytics for every creator; premium gates advanced reporting, branded PDF exports, subgroup comparison, and shareable dashboards.

## Scope

### Route
- New nested route: `/_authenticated/survey/$id/analyze` (creator-only). Add an "Analyze" button on `my-surveys` and on the existing `survey.$id` page when the viewer is the creator.

### Analyze page layout
Sidebar (sticky) + main canvas:

```
┌──────────────┬──────────────────────────────┐
│ Views        │ Header: title, n=, filters    │
│ • Overview   │                               │
│ • Questions  │ [Active filter chips]         │
│ • Compare ★  │                               │
│ • Cross-tab ★│ <selected view renders here>  │
│ • Raw data   │                               │
│ • Saved      │                               │
│              │                               │
│ Filters      │                               │
│ Dept / Year  │                               │
│ Country / Age│                               │
│ Date range   │                               │
└──────────────┴──────────────────────────────┘
```

★ = premium-gated.

### Views
1. **Overview (free)** — total responses, completion rate, avg duration, response-over-time sparkline, top 3 questions preview.
2. **Questions (free)** — per-question chart (bar / pie / horizontal bar auto-selected by question type), counts + percentages, "show/hide" toggles per question.
3. **Subgroup compare (premium)** — pick a question + a demographic (dept / year / country / age). Side-by-side bars per group.
4. **Cross-tab (premium)** — pick Question A × Question B, render matrix table with row %.
5. **Raw data (free CSV, premium XLSX + filtered exports)** — table of responses with answers; export buttons.
6. **Saved views (premium)** — name + persist a filter+selection combo; reload later.

### Exports
- CSV of raw responses (free).
- PDF report (premium, branded with university + CampusVerify footer) — overview + selected charts rendered via `jspdf` + `html2canvas` snapshot of chart container.
- Shareable live dashboard (premium) — public read-only token URL `/r/$token` showing overview + questions view; no raw data, no PII.

### Safeguards (apply to ALL views)
- Always show `n = X` in header and per subgroup.
- Suppress any subgroup / cross-tab cell with `count < 5` — render as "—" with tooltip "Hidden to protect privacy (n<5)".
- Active filters shown as removable chips.
- Never expose `respondent_id` or any join back to profiles in any view or export.

### Premium gating
Two checks:
- Creator's most recent survey of this id has `tier in ('boosted','pro')` → full premium on that survey, OR
- Creator has `paid_credits >= 5` (treated as premium subscription proxy for now).

Locked features show a small Lock badge + "Upgrade to Boosted/Pro" CTA linking to `/buy`.

## Database

New migration adds:

- `survey_report_views` table: `id, survey_id, creator_id, name, config jsonb, created_at, updated_at`. RLS: creator only.
- `survey_share_tokens` table: `id, survey_id, creator_id, token text unique, expires_at, created_at, revoked bool`. RLS: creator manages own; `token` lookups go through a SECURITY DEFINER RPC `public.get_shared_dashboard(token text)` that returns only safe aggregated JSON (no raw responses).
- RPC `public.survey_aggregate(survey_id uuid, filters jsonb)` (SECURITY DEFINER) — computes per-question counts/percentages server-side honoring filters and the n<5 suppression rule. Authorizes: caller must be creator OR call must come via `get_shared_dashboard` flow (token validates internally).

## Server functions (`src/lib/reports.functions.ts`)

All protected with `requireSupabaseAuth`, all verify `creator_id = auth.uid()`:
- `getSurveyAggregate({ surveyId, filters })` → counts per question, totals, demographics breakdown, with n<5 suppression.
- `getCrossTab({ surveyId, qa, qb, filters })` — premium.
- `getCompareBreakdown({ surveyId, questionId, dimension, filters })` — premium.
- `exportResponsesCsv({ surveyId, filters })` → returns CSV string.
- `saveReportView({ surveyId, name, config })` / `listReportViews` / `deleteReportView` — premium.
- `createShareToken({ surveyId, expiresInDays })` / `revokeShareToken` / `listShareTokens` — premium.

Public server route `src/routes/r/$token.tsx` renders shared dashboard via `get_shared_dashboard` RPC (no auth required, read-only safe aggregates only).

## Frontend files

- `src/routes/_authenticated/survey.$id.analyze.tsx` — main page, sidebar + view switcher.
- `src/components/analyze/OverviewView.tsx`
- `src/components/analyze/QuestionsView.tsx`
- `src/components/analyze/CompareView.tsx` (premium)
- `src/components/analyze/CrossTabView.tsx` (premium)
- `src/components/analyze/RawDataView.tsx`
- `src/components/analyze/SavedViews.tsx` (premium)
- `src/components/analyze/FiltersPanel.tsx`
- `src/components/analyze/PremiumLock.tsx`
- `src/components/analyze/ExportMenu.tsx` (CSV free, PDF + XLSX premium)
- `src/routes/r.$token.tsx` — public dashboard

Use existing `recharts` (already in `chart.tsx`) for charts. Add `jspdf` + `html2canvas` + `xlsx` via `bun add` for premium exports.

## Design

Academic, presentation-ready: serif headings (Instrument Serif via existing font stack), generous spacing, neutral palette using existing tokens, muted chart colors, clear n= labels, dotted divider between sections. Print stylesheet for the dashboard so creators can also browser-print.

## Out of scope (call out, do not build)
- AI-generated written summaries.
- Sentiment analysis / NLP on free-text answers.
- Email-scheduled reports.
- Custom logo upload for branded PDFs (uses university_name text only).
