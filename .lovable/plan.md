## Goal

Remove email-verification as a blocker for signing up and logging in, since there is no sender domain and confirmation emails are unreliable. Students still must use an academic email domain (.edu / .ac.xx) to get a Student account.

## What changes

### 1. Auth setting
Turn on auto-confirm for email signups. New accounts become usable immediately — no confirmation email, no "Email not confirmed" login error. Google sign-in (General accounts) keeps working exactly as it does today.

### 2. Signup flow (`src/routes/signup.tsx`)
- After a successful signup, sign the user in and send them straight to the feed instead of showing "check your inbox".
- Keep the existing duplicate-email detection so re-registering with an existing address gives a clear "This email already has an account — log in instead" message with a link to the login page.
- Keep the academic-domain requirement and the disposable-domain block for Student accounts, unchanged.
- Remove the "Didn't get the verification email?" resend block and the "verified email required" tag from this page.

### 3. Login page (`src/routes/auth.tsx`)
- Remove the resend-verification block.
- Replace the failed-login message with an accurate one: wrong email or password, with a link to reset the password or create an account. No more references to verifying email.

### 4. Copy cleanup
- Marketing line on the landing page that says "Every account is tied to a verified email" becomes "Student accounts are tied to a university email domain" — accurate to the new rule.
- The `ResendVerification` component becomes unused and is deleted.

### 5. Project memory
The stored rule "Require email verification, never auto sign-in" is now wrong; it gets updated to record that email confirmation is off and students are gated by academic domain instead.

## Trade-off you should know

Without mailbox verification, someone can sign up with an academic-looking address they don't own. Your existing defences still apply: academic-domain check, disposable-domain blocklist, admin flagging, and per-user credit caps. When you later get a sender domain, flipping confirmation back on is a one-setting change plus restoring the resend control.

Also note: password reset still sends email. That flow will remain unreliable until a sender domain exists — an admin can reset a user manually in the meantime.

## Technical details

- `supabase--configure_auth` with `auto_confirm_email: true`, `disable_signup: false`, `external_anonymous_users_enabled: false`, `password_hibp_enabled` unchanged.
- No database migration needed: `handle_new_user` / `sanitize_profile_on_insert` triggers and the profiles INSERT policy already produce correct defaults on first session.
- Signup keeps `signUp()` then navigates on the returned session; with auto-confirm, `data.session` is non-null, so no extra `signInWithPassword` call is needed (a fallback sign-in is added in case the session is absent).
- Files touched: `src/routes/signup.tsx`, `src/routes/auth.tsx`, `src/routes/index.tsx`, delete `src/components/ResendVerification.tsx`.
