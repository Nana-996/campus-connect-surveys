# Google Search Console inside CampusVerify

## Goal
Give the app owner a "Search visibility" page inside the super-admin area that shows live Google Search Console data for campus-verify.live: clicks, impressions, CTR, average position, top search queries, top pages, and indexing status — without visiting search.google.com.

## How it works
- The Google account is now linked to the project (done). The app calls Google through a secure server-side connection; nothing is exposed to visitors.
- A daily scheduled refresh pulls the last 28 days of search data from Google and stores a snapshot in the database. The page reads the snapshot, so it loads instantly and never hits Google's rate limits.
- The owner can also press "Refresh now" to pull fresh data on demand.
- Property selection: on first open, the app lists the verified Search Console properties that cover campus-verify.live. If more than one matches, the owner picks one once; the choice is stored and revalidated on every refresh.

## What gets built

### 1. Database
- `search_console_settings` table: stores the selected property (site_url), single row, owner-only.
- `search_console_snapshots` table: stores the latest snapshot JSON (performance rows, queries, pages, generated-at). Owner-only read; writes only from the server.
- A pg_cron daily job calling a server route to refresh the snapshot.

### 2. Server functions (src/lib/search-console.functions.ts)
- `getSearchConsoleStatus` — returns current settings + latest snapshot + whether setup is needed. Owner-only (email claim check via existing app-owner gate).
- `listSearchConsoleProperties` — lists verified properties covering campus-verify.live; returns `selection_required` with candidates when multiple match.
- `selectSearchConsoleProperty(siteUrl)` — stores the owner's exact choice after re-listing and validating it.
- `refreshSearchConsoleSnapshot` — pulls searchAnalytics (28 days: clicks, impressions, CTR, position, top queries, top pages) + sitemap status, stores the snapshot. Called by the cron route and by "Refresh now".
- All gateway calls server-side only, using LOVABLE_API_KEY + GOOGLE_SEARCH_CONSOLE_API_KEY env vars, with the list→select→pass property workflow.

### 3. Cron route
- `src/routes/api/public/cron/search-console-refresh.ts` — called daily by pg_cron with a shared secret header; runs the refresh.

### 4. Admin UI
- New "Search" tab/section in the super-admin area (or a dedicated `_authenticated/admin-search.tsx` page linked from admin).
- Shows: headline numbers (clicks, impressions, CTR, avg position) with prior-period comparison, top queries table, top pages table, indexing/sitemap status, last-refreshed time, Refresh button.
- First-run state: property picker if multiple properties match; setup instructions if none.
- Owner-only, same gate as the analytics page.

## Technical details
- Gateway: https://connector-gateway.lovable.dev/google_search_console, headers Authorization: Bearer $LOVABLE_API_KEY and X-Connection-Api-Key: $GOOGLE_SEARCH_CONSOLE_API_KEY, read inside handlers.
- Property resolution: GET /webmasters/v3/sites at runtime, exclude siteUnverifiedUser, match campus-verify.live; never hardcode the property.
- Analytics query: POST /webmasters/v3/sites/{siteUrl}/searchAnalytics/query, 28-day window, dimensions date/query/page.
- RLS + GRANTs on both new tables; no client writes.
- Verify: build check + browser pass on the new admin page.

## Out of scope
- Request-indexing buttons (Google offers no API for that).
- Non-owner access to search data.
