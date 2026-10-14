# Architecture rules

- Public school partnership pages resolve a database-backed `schools.join_slug`; school membership and credit eligibility always remain email-domain enforced so URL parameters cannot grant benefits.
- The pitch deck and platform administration functions verify the authenticated email claim against the configured owner because only the app owner may access them.
- Platform analytics aggregates full-table data in a service-only database function after the server verifies the app owner's authenticated email claim, preventing capped admin lists from distorting reports.
- School-assisted survey tracking uses explicit, revocable school grants and returns only eligible students' index number, department, and response state; it never broadens faculty roles or exposes identity and answer data.
## Search Console integration
- Search visibility data lives in `search_console_settings`/`search_console_snapshots` (service-role only); all Google calls go through the connector gateway in `src/lib/search-console.functions.ts`, owner-gated via `isAppOwnerClaims`, with the runtime list-then-select property workflow — never hardcode a GSC property.
- The daily refresh is pg_cron job `search-console-refresh` POSTing to `/api/public/cron/search-console-refresh` with the `x-cron-secret` header stored in `cron_config`; the secret is re-synced whenever the owner opens the status function.
- Public entity data is canonicalized in root Organization/WebSite JSON-LD and `/facts` SoftwareApplication schema; `llms.txt` points machine readers to evidence pages so product claims stay consistent.

- Official contact and sending addresses are independent of the authenticated owner identity; contact updates must never change access control.
- Survey-owner results use snapshot-bounded, count-checked response batches and bounded profile queries so exports never silently accept capped data.
- All spreadsheet exports use the shared formula-neutralizing CSV serializer so alternate export entry points retain the same protection.
- Partner payouts use a service-only locked database transaction and immutable milestone ledger; expected progress prevents duplicate confirmations and paid targets cannot be edited.
- Conversion payment and enquiry events originate from database transitions; public interaction tracking cannot report payments or identify callers, and aggregate reporting stays owner-gated.
