
## What we're building

A new **manager** role you (owner/admin) can grant to faculty / department heads. Managers see every student in their university and, for every survey in that university, who responded and who didn't — by name, index number, and department. They never see answer content. You keep sole power to grant credits.

## Database changes (one migration)

- Add `'manager'` to the `app_role` enum.
- Add `profiles.index_number text` (nullable so existing accounts keep working; required for new student signups at the application layer). Add a partial unique index on `(university_domain, lower(index_number))` so two students in the same university can't share one.
- Allow managers to update `index_number` and `department` on their own profile (existing `protect_profile_sensitive_columns` trigger already locks the sensitive ones — no change there).
- Add a **manager visibility policy** on `profiles`: a user with `has_role(auth.uid(),'manager')` can `SELECT` profiles whose `university_domain = current_university_domain()` and `user_type='student'`. Admins continue to see all (via existing admin policies / server fns).
- New SECURITY DEFINER function `get_university_survey_tracking(_survey_id uuid)` returns one row per student in the caller's university:
  `{ student_id, full_name, index_number, department, responded_at | null }`.
  Authorization inside the function: caller must be `admin` OR `manager` whose university matches the survey's `university_domain` (or the survey's `allow_general_respondents` survey is rejected — out of scope for tracking). It does **not** return answers.
- New SECURITY DEFINER function `list_university_surveys()` returns surveys in the caller's university (id, title, response_count, response_goal, created_at, expires_at, creator name) for the manager dashboard.

## Server functions (new file `src/lib/manager.functions.ts`)

- `getMyManagerScope()` — returns whether the caller is a manager/admin and their `university_domain` + `university_name`.
- `listUniversitySurveys()` — wraps `list_university_surveys()`.
- `getSurveyTracking({ surveyId })` — wraps `get_university_survey_tracking`.

## Admin additions (`src/lib/admin.functions.ts` + Admin tab)

- `setUserManagerRole({ userId, grant })` — owner-only; mirrors the existing admin-role toggle.
- New **Managers** tab in `/admin` listing every user with the manager role, plus an "Add manager" search-and-grant flow against existing users (we onboard by promoting an existing verified account — keeps the academic-email rule).
- The existing `grantCreditsToUser` stays admin-only as you requested.

## New manager route

`src/routes/_authenticated/manage.tsx` — visible only to managers/admins (gated by `getMyManagerScope`):

```text
┌─────────────────────────────────────────────┐
│ Faculty dashboard — {university_name}       │
│ {N students tracked}                        │
├─────────────────────────────────────────────┤
│ Survey                Responded   Goal      │
│ Mental Health Q1      42 / 120    Open  →   │
│ Internship Plans      88 / 200    Open  →   │
└─────────────────────────────────────────────┘
```

Drill-in (`/manage/$surveyId`) shows two tabs — **Responded** and **Not yet responded** — each a searchable table of `name · index number · department · responded_at`. Export-to-CSV button on both. No answer data anywhere on the page.

## Signup form (`src/routes/signup.tsx`)

- Add **Index / Student number** field, required when `user_type = 'student'`, validated `1–32` chars, alphanumeric + dash. Passed through `raw_user_meta_data.index_number` and persisted by extending `handle_new_user()` to read it.
- Add an inline "Update your index number" prompt in `/profile` so existing students can backfill — uses a small `updateMyStudentInfo` server fn that only allows `index_number` + `department` writes.

## Header / nav

Add a **"Faculty"** link in `AppHeader` that's only shown when `getMyManagerScope().role !== 'none'`.

## Security & privacy guarantees

- Manager role is stored in `user_roles` and checked via `has_role`. No client can self-grant.
- Tracking functions return identity + responded/not-responded only; answers (`answers` JSONB) are never selected.
- Manager scope is derived server-side from their own `university_domain`; they cannot pass another domain in.
- Credit granting remains admin-only.
- The existing protected-columns trigger on `profiles` already blocks managers from changing `earned_credits`, `user_type`, `university_domain`, etc.

## Files touched

- New migration (enum + column + index + 2 functions + policy + `handle_new_user` patch).
- New: `src/lib/manager.functions.ts`, `src/routes/_authenticated/manage.tsx`, `src/routes/_authenticated/manage.$surveyId.tsx`.
- Edited: `src/lib/admin.functions.ts`, `src/routes/_authenticated/admin.tsx` (Managers tab), `src/routes/signup.tsx` (index field), `src/routes/_authenticated/profile.tsx` (backfill), `src/components/AppHeader.tsx` (Faculty link).

## Out of scope (call out if you want them next)

- Per-department restriction for managers (you chose university-wide).
- Letting managers publish or grade surveys themselves.
- Email invitations to onboard managers who don't yet have accounts.
