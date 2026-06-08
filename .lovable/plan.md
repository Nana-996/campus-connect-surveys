## 1. Fix the password reset link

**Problem.** The reset email link opens `/reset-password` but the page is stuck on "Waiting for the reset link to validate…". Supabase now sends reset links as `?code=<pkce_code>` (PKCE flow) instead of the old `#access_token=...` hash, so our current page — which only listens for `onAuthStateChange` / `getSession()` — never sees a session.

**Fix.** In `src/routes/reset-password.tsx`:
- Read `?code` from the URL search params on mount.
- If present, call `supabase.auth.exchangeCodeForSession(code)`; on success mark `ready = true` and strip `code` from the URL.
- Keep the existing `onAuthStateChange` / `getSession` fallback for hash-based links.
- Show a clear error if the exchange fails ("Reset link expired or already used — request a new one") and link back to `/forgot-password`.

No other files change.

## 2. Admin claim — assign admin to a different email

You chose "Assign admin to a different email". The current `/admin-setup` page only works when no admin exists, so it can't help you. I'll add an authenticated server flow that lets the current admin promote another user by email, and a migration to transfer the existing admin row to the email you provide.

**Step A — Tell me the target email.**
Before I run anything, reply with the email address that should become the admin (the account must already exist — i.e. the person has signed up). Example: `you@yourschool.edu`.

**Step B — One-time migration (auto-generated once you give the email).**
A single SQL migration that:
- Looks up the user id for that email in `auth.users`.
- Deletes the existing admin role row (`8cdee73e-…`, "Nana Afia…").
- Inserts a new admin row for the target user id.
- Wrapped in a transaction; fails loudly if the email isn't found.

**Step C — Ongoing admin onboarding (no more SQL needed after this).**
Add a new server function `grantAdminByEmail(email)` in `src/lib/admin.functions.ts`:
- Guarded by the existing `requireAdmin` middleware (only current admins can call it).
- Uses `supabaseAdmin.auth.admin.listUsers()` (or `getUserByEmail`) to resolve the email to a user id.
- Inserts `{ user_id, role: 'admin' }` into `public.user_roles` (idempotent).
- Returns `{ ok: true }` or a sanitized error.

Surface it in the existing `/admin` page as a small "Promote user to admin" form (email input + button) in the Users section. The existing `setUserAdminRole` toggle (with sole-admin guard) stays as-is for revoking.

## 3. Technical details

**Files changed**
- `src/routes/reset-password.tsx` — handle `?code=` PKCE exchange.
- `src/lib/admin.functions.ts` — add `grantAdminByEmail` server fn.
- `src/routes/_authenticated/admin.tsx` — add "Promote by email" UI in the users panel.
- New migration: transfer admin role from current holder to the email you provide.

**Not changed**
- `bootstrapFirstAdmin` and `/admin-setup` stay (still useful if all admins are ever removed).
- Sole-admin guard in `setUserAdminRole` stays.
- No auth or RLS changes; `user_roles` writes continue to go through service-role server functions only.

**Open question blocking step B**
What email should become the new admin?
