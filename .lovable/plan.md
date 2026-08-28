# WebMCP Research Workspace for CampusVerify

A browser-side WebMCP layer that lets an AI browser agent operate CampusVerify's existing research tools while the human researcher keeps control of every consequential decision. All existing app functionality stays as-is; the competition work is a clearly separated, additive layer.

## A. Current architecture (verified by inspection)

- Survey creation/publish: `src/routes/_authenticated/create.tsx` ("Survey Studio"). Publishing is a direct authenticated client insert into `surveys` (line ~269) with tier, targeting (`target_department`, `target_year`, `target_country`, `target_age_range`, `target_interests`, `target_universities`, `required_criteria`), `response_goal`, `visibility`, `respondent_bonus`, expiry. Credit charging happens in the database (publish trigger), so RLS + triggers already enforce affordability and ownership. Draft state persists to `localStorage` (`DRAFT_KEY`) and `src/lib/offline-store.ts`.
- Targeting UI + reach estimate: `src/components/AudienceBuilder.tsx`, RPC `estimate_survey_reach`.
- Owner survey list / progress: `src/routes/_authenticated/my-surveys.tsx`, `manage.$surveyId.tsx`.
- Analysis: `src/routes/_authenticated/survey.$id.analyze.tsx` (overview, questions, subgroup compare, cross-tab, raw, saved views), fed by `getOwnerSurveyResults` in `src/lib/survey-owner.functions.ts` — a `requireSupabaseAuth` server fn that verifies `creator_id === context.userId` and pseudonymizes `respondent_id` before anything leaves the server.
- Saved views / share links: tables `survey_report_views`, `survey_share_tokens` (client inserts in analyze route).
- Reporting/export: `src/routes/_authenticated/survey.$id.report.tsx`, `src/lib/report/{stats,charts,pdf,csv}.ts`, `src/components/SurveyExportDialog.tsx`.
- Auth: `src/lib/auth.tsx` (AuthProvider), `_authenticated` gate, bearer attach in `src/start.ts`.
- Existing MCP: server-side `src/lib/mcp/**` (5 read-only OAuth tools) + plugin-generated routes. Pre-existing groundwork, untouched by this work.

## B. New WebMCP tools

All registered in the browser via `navigator.modelContext` on authenticated research routes only. Naming prefix `cv_` so they are unmistakably the competition layer.

Read-only (execute immediately, no confirmation):
1. `cv_get_workspace_context` — in: none. out: signed-in member type, university, credit balance, current route, active survey draft summary, list of owned surveys with response counts/goals. No participant identities.
2. `cv_list_my_surveys` — in: `{ active_only?, limit? }`. out: id, title, status, responses/goal, expiry.
3. `cv_get_survey_progress` — in: `{ survey_id }`. out: response count, % of goal, pace, time remaining, whether goal met.
4. `cv_estimate_audience_reach` — in: targeting criteria. out: estimated reachable respondents (wraps `estimate_survey_reach`).
5. `cv_analyze_subgroups` — in: `{ survey_id, dimension ('year'|'department'|'country'|'age_range'), groups?: string[], question_ids? }`. out: per-group n, per-question distributions/means, gap summary. Uses `getOwnerSurveyResults` (owner-verified, pseudonymized). Supports the "first-year vs final-year" comparison.
6. `cv_get_question_results` — in: `{ survey_id, question_id, filters? }`. out: aggregate distribution only, never raw free-text tied to an individual beyond what the owner already sees in the UI.

Proposal / draft (mutate only local UI state, always reversible, no server write):
7. `cv_propose_survey_draft` — in: `{ objective, title, description, questions[] }`. out: draft id + normalized draft. Side effect: fills Survey Studio fields and shows the draft in the Agent Workspace panel for human editing.
8. `cv_propose_targeting` — in: `{ department?, year?, country?, age_range?, interests?, universities?, required_criteria?, response_goal?, visibility?, expires_at? }`. Side effect: populates AudienceBuilder + goal fields, returns reach estimate. No publish.
9. `cv_revise_draft` — in: `{ patch }`. Same shape, partial update.

Consequential (require explicit human approval in-app before execution):
10. `cv_request_publish_approval` — in: `{ confirm_token? }`. Side effect: opens the Approval Card with a full publication summary (title, question count, targeting, required criteria, goal, tier, credit cost, visibility). Returns `pending_approval` with an `approval_id`. It does **not** publish.
11. `cv_publish_survey` — in: `{ approval_id }`. Executes only if that approval id was approved by the human in the UI within the session and the draft hash is unchanged. Reuses the exact Survey Studio submit path (same insert + credit trigger + reset + navigation). Out: survey id and URL. Rejects otherwise.
12. `cv_save_analysis_view` — in: `{ survey_id, name, config }`. Requires approval (writes a row); low-risk so approval is a single-click inline confirm.
13. `cv_prepare_report` — in: `{ survey_id, sections, format }`. Side effect: opens the existing export dialog pre-configured; the human presses Export/Download. The agent never silently downloads or shares.

Explicitly NOT exposed: raw SQL, arbitrary table reads, participant identities/emails, credit purchases, Research Boost payments, share-token minting, admin/faculty tools, broadcast email.

## C. Action classification

| Class | Tools | Gate |
|---|---|---|
| Read-only | 1–6 | none (owner-scoped by existing RLS/server fn) |
| Proposal | 7–9 | none; only local state, human edits freely |
| Consequential | 10–13 | explicit human approval in the Approval Card; publish additionally needs an approval id bound to a draft hash |

Credits are only ever spent through tool 11 after approval; the credit cost is shown in the approval summary.

## D. Safe registration against existing backend

- New module `src/lib/webmcp/` (all competition code lives here): `provider.tsx` (React provider registering tools), `tools/*.ts`, `approvals.ts` (approval store), `types.ts`.
- Registration happens inside `_authenticated` routes only, from a component that already has `useAuth()` — so tools close over the live session and never take a user id as input. Signed-out ⇒ no tools registered.
- Every tool calls existing code paths: `useServerFn(getOwnerSurveyResults)`, `supabase.rpc('estimate_survey_reach')`, the `surveys` insert used by Survey Studio, `survey_report_views` insert. No new server functions unless a gap appears; no new RLS policies, no new grants.
- Inputs validated with zod at the tool boundary; outputs are projected to explicit safe fields.
- API: W3C `navigator.modelContext.registerTool(...)`; ship the `@mcp-b/global` polyfill so the tools are available in browsers/extensions without native support. Tools are unregistered on unmount/sign-out.

## E. UI changes

- New **Agent Workspace** panel (route `/_authenticated/workspace`, plus a compact docked strip on `create` and `analyze`):
  - Objective box (human states the research objective).
  - Live **Agent activity log**: every tool call, its class badge (Read / Proposal / Needs approval), inputs summary, and result.
  - **Draft review card**: agent-proposed title/questions/targeting, fully editable inline by the human, with Accept / Revise.
  - **Approval Card**: publication summary + credit cost + Approve / Decline; approving is the only path that unlocks `cv_publish_survey`.
  - **Monitoring strip**: response count vs goal after publish.
  - Analysis results and saved-view actions surfaced in the same log with links into the existing analyze page.
- Small "Agent connected / not connected" indicator in the header of that route. No chatbot, no message composer.

## F. Security & privacy

- All data access stays behind the owner-verified `getOwnerSurveyResults`; respondent ids remain pseudonymized; no profile emails/names exposed.
- Prompt injection: survey titles, descriptions, question text and free-text responses are untrusted. Tool outputs wrap all user-generated text in explicit `untrusted_content` fields with a fixed note that it is data, not instructions; free-text is truncated and never used to build tool arguments automatically. Approval summaries render text as plain text, never as actionable directives.
- Approval tokens are single-use, session-scoped, bound to a hash of the exact draft being approved — an agent cannot mutate the draft after approval and re-use the token.
- No tool can widen RLS, use service role, or reach admin/faculty/broadcast surfaces.
- Rate limit: per-session cap on consequential tool attempts; declines are logged in the activity feed.

## G. Competition boundary

- All new code under `src/lib/webmcp/**`, `src/components/webmcp/**`, `src/routes/_authenticated/workspace.tsx`, prefixed tool names `cv_*`.
- Each new file carries a header comment: `WebMCP Challenge — added after competition start. Not part of pre-existing CampusVerify functionality.`
- `WEBMCP.md` at repo root documenting: what pre-existed (survey engine, targeting, analysis, exports, backend MCP server), what is new (browser WebMCP tools, approval model, workspace UI), and the demo script.
- Touches to existing files kept minimal and additive: mount the provider, add a nav link, expose imperative setters from Survey Studio / analyze page.

## H. Verification plan

- Per-tool unit tests (vitest) for input validation, output projection, and that untrusted text is wrapped.
- Guard tests: `cv_publish_survey` without/with stale/reused approval id ⇒ rejected; tools return "not authenticated" when signed out; a non-owner survey id returns not-found via the existing server fn.
- Playwright end-to-end driving the workflow: objective → draft proposed → human edits → targeting proposed with reach → approval card → approve → publish → progress read → first-year vs final-year comparison → save view → prepare report. Screenshots at each checkpoint.
- Manual pass with a real MCP-capable browser agent against the preview to confirm tool discovery and registration.
- Regression check that Survey Studio, analyze, and export still work with no agent present.

## I. Blockers / assumptions

1. WebMCP is still an emerging standard — the plan targets `navigator.modelContext` with the `@mcp-b/global` polyfill. Confirm the challenge's expected API surface/version before implementation.
2. Assumes publishing continues to run as the authenticated client insert (credits charged by DB trigger); no server-side publish endpoint is added.
3. Assumes agent operation on behalf of the signed-in owner only — no cross-user or admin agent capability.
4. Judging demo will need a seeded survey with enough responses across year groups for the first-year vs final-year comparison to be meaningful; confirm whether a demo dataset is acceptable.
5. `getOwnerSurveyResults` returns full response payloads to the client; subgroup analysis reuses that, so no new data exposure — confirm that is acceptable for the demo account.
