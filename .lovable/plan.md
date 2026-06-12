## 1. Replace Swipe with Polls

### New table `public.polls`
- Columns: `id`, `creator_id` (auth.users), `question` (text, 1–200 chars), `type` ('choice' | 'rating'), `options` (text[], 2–4 entries, required for choice), `is_active` (default true), `expires_at` (default now()+14 days), `created_at`, `updated_at`.
- RLS:
  - Anyone signed-in can `SELECT` active, non-expired polls.
  - Authenticated users can `INSERT` their own poll (validated: question length, 2–4 options for choice, no targeting fields).
  - Creators can `UPDATE`/`DELETE` their own polls (to close/remove).
- GRANTS to `authenticated` and `service_role`.
- **No credit ledger touches, no triggers that charge or award.**

### New table `public.poll_responses`
- Columns: `id`, `poll_id`, `respondent_id`, `answer` (text), `created_at`. Unique `(poll_id, respondent_id)` so one vote per user.
- RLS:
  - Authenticated users `INSERT` their own vote.
  - Creators can `SELECT` aggregated rows for their poll; respondents can `SELECT` their own row. (Aggregation is also exposed via an RPC `get_poll_results(poll_id)` returning counts only, callable by any signed-in user.)
- GRANTS to `authenticated` and `service_role`.
- **No earning_caps, no credit_ledger, no profile balance writes.**

### Routes & UI
- Rename file `src/routes/_authenticated/swipe.tsx` → `src/routes/_authenticated/polls.tsx`. Route path `/polls`. (Delete the old swipe route file.)
- Polls page contents:
  - Header: "Polls — quick public votes. Free to post, free to answer."
  - "Create poll" composer at the top (collapsed by default): question + type toggle (Choice/Rating) + option inputs (2–4) + submit. Posts straight to `polls`.
  - List/feed of active polls (most recent first). Each card shows the question, vote buttons (choice options or 1–5 stars), live counts after voting, and a "you voted" indicator. No swipe gesture; vote = tap.
  - No "credits earned" / "answered N today" copy anywhere.
- `src/components/AppHeader.tsx`: rename `Swipe` link → `Polls`, change `to="/swipe"` → `to="/polls"` in both mobile and desktop nav.
- Update `src/integrations/supabase/types.ts` will regenerate after migration.

## 2. Mobile fit pass (390px and below)

Targeted overflow fixes using the grid + `min-w-0` + `shrink-0` + `truncate` pattern:

- **`src/routes/_authenticated/admin.tsx`**: wrap every `<table>` in `<div className="-mx-5 overflow-x-auto px-5">`; truncate long emails/names; ensure action buttons stay on one line.
- **`src/routes/_authenticated/manage.tsx`**: already has mobile card layout; verify the desktop table is wrapped in `overflow-x-auto` and the mobile cards don't horizontal-scroll due to long titles (add `truncate`/`break-words`).
- **`src/routes/_authenticated/manage.$surveyId.tsx`**: responses tab — wrap CSV/header row in the responsive grid pattern; collapse long answers with `break-words`.
- **`src/components/AppHeader.tsx`**: the credits pill + logout can crowd the logo on 320–360px. Switch container to the `grid-cols-[minmax(0,1fr)_auto]` pattern and `truncate` the logo text.
- **`src/routes/_authenticated/profile.tsx`**, **`my-surveys.tsx`**, **`feed.tsx`**, **`create.tsx`**: audit pass — add `min-w-0` to flex text containers, `shrink-0` to icons/avatars, and `break-words` to user-supplied text fields. Constrain any fixed-width elements (e.g. `w-[...]` numeric inputs) with `max-w-full`.
- **Root `__root.tsx` / global**: add `overflow-x-hidden` on `body` as a safety net and make sure the main content wrapper uses `px-4 sm:px-5` with `max-w-full`.

No layout redesigns — only overflow / truncation fixes so nothing escapes the viewport on a 390px device.

## 3. Out of scope (not touched)

- Existing surveys, credits, earning caps, triggers, and the share-link / dashboard flow remain unchanged.
- No changes to auth, roles, or RLS on existing tables.

## Technical notes

- Polls deliberately live in their own tables so the `charge_survey_publish_credit` and `handle_new_response` triggers on `surveys` / `survey_responses` cannot fire for them — guaranteeing zero credit movement.
- `get_poll_results` is a `SECURITY DEFINER` SQL function returning `{ option: text, count: int }[]` so the UI can show counts without exposing voter identities.
