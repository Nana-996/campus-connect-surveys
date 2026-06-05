## Goal
Let survey owners switch between multiple chart types when analyzing responses to each question.

## Where
`src/routes/_authenticated/survey.$id.analyze.tsx` — the owner-only analyze page.

## Changes

### 1. Per-question chart-type switcher (Questions view)
For each choice/rating question card in `QuestionsView`, add a small icon toolbar in the header (next to Show/Hide) letting the owner pick:
- **Horizontal bar** (current default)
- **Vertical bar (column)**
- **Pie**
- **Donut**
- **Line**
- **Area**

Local `useState<Record<questionId, ChartType>>` tracks per-question selection. A new `<QuestionChart data type />` component renders the chosen recharts chart using the existing `PALETTE` + design tokens (`var(--primary)`, `var(--border)`). Pie/Donut use `PALETTE` slice colors with a legend; bar/line/area keep the current single-color theme.

### 2. Overview top-3 cards
Add the same compact icon toggle on each of the three preview cards in `OverviewView` so owners can flip individual previews between bar / pie / donut / line.

### 3. Timeline chart (Responses over time)
Add a toggle above the "Responses over time" chart to switch between **Area** (current), **Line**, and **Bar**.

### 4. Subgroup compare view
Add a toggle for **Grouped bars** (current), **Stacked bars**, and **Line** so owners can compare subgroups in the most readable form.

## UI pattern
Reusable inline component:
```
<ChartTypeToggle value={type} onChange={setType} options={["bar","column","pie","donut","line","area"]} />
```
Rendered as a row of small ghost icon buttons (lucide icons: `BarChart3`, `BarChartHorizontal`, `PieChart`, `CircleDashed`, `LineChart`, `AreaChart`). Active button uses `bg-foreground text-background`, others `hover:bg-accent`. All styling uses existing semantic tokens — no raw colors.

## Out of scope
- PDF export remains text-only (no chart screenshots).
- Cross-tab and Raw data views unchanged (tabular by nature).
- No DB / schema changes; selection is purely client-side and not persisted.

## Files touched
- `src/routes/_authenticated/survey.$id.analyze.tsx` (only)
