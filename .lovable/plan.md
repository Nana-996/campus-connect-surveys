# Upgrade the super-admin analytics page

## Goal
Turn the current basic statistics page into a balanced decision dashboard: clear headline performance first, detailed trends and operational lists below, with accurate full-platform figures and CSV export.

## What will change

### 1. Trustworthy reporting controls
- Add 7-day, 30-day, 90-day, and all-time presets.
- Show the selected period and compare key figures with the immediately preceding equivalent period.
- Replace analytics derived from the newest 200 users with dedicated full-database aggregation, so totals and trends stay accurate as CampusVerify grows.
- Keep the page read-only and restricted to the app owner.

### 2. Clear summary and explanations
- Lead with a compact executive summary covering people, active users, surveys, responses, response rate, and completed targets.
- Add plain descriptions and comparison indicators so each number explains what it measures.
- Separate platform health alerts from general performance instead of mixing them into the same undifferentiated card grid.

### 3. Four useful analytics views
Use a simple section switcher so the page remains readable on desktop and phone:

- **Overview:** growth, activity, response performance, and items needing attention.
- **People & schools:** sign-ups by account type, participating schools, leading schools, and engagement.
- **Surveys:** surveys published, response trend, progress toward targets, stalled/closing surveys, tiers, and visibility.
- **Revenue & credits:** successful sales in Ghana cedis, credits sold/issued/spent, current balances, and purchase performance.

### 4. Legible charts and detailed lists
- Replace the unlabeled mini bars with proper charts using the existing chart library.
- Include readable dates, values, gridlines, legends, tooltips, and accessible summaries.
- Use line charts for trends, stacked bars for account/survey mix, and ranked horizontal bars for school and tier comparisons.
- Make operational rows easy to scan with progress, status, owner/school context, and dates.

### 5. Export
- Add a CSV download for the selected reporting period.
- Export the visible summary, daily trends, school breakdown, survey breakdown, and credit/revenue figures as clearly labelled rows.

## Technical details
- Add an owner-only, read-only database analytics function that returns full-table aggregate data for a requested preset; do not expose personal emails or response content.
- Include successful credit purchases, research boosts, and university-slot purchases in revenue, while keeping donations separate from operating revenue.
- Continue using authenticated server functions and the existing app-owner email-claim gate.
- Keep current CampusVerify colors and typography; use the existing button, navigation, and card patterns.
- Preserve the existing admin management page and link back to it.

## Verification
- Check each preset and period comparison against direct aggregate queries.
- Verify charts, labels, tooltips, empty states, export contents, and refresh behavior.
- Test the owner-only restriction and confirm a non-owner receives the private-area message.
- Check desktop and phone layouts for clipping, overlapping text, and readable chart labels.
