# Dual-Wallet Credit Economy

Redesign CampusVerify's credits into two distinct wallets so paid credits feel essential for serious work, while earned credits keep casual engagement alive.

## Wallet model

Two balances per user:

- **Earned credits** — from completing surveys. Daily cap, weekly cap, 30-day expiry. Spendable only on Basic publishing.
- **Paid credits** — from purchase. Never expire. Required for Pro features.

```text
                  EARNED                PAID
  Source          answering surveys     purchase
  Cap             3/day, 10/week        none
  Expiry          30 days               never
  Basic publish   yes (2 credits)       yes (2 credits)
  Pro features    no                    yes
```

## Publishing tiers

| Tier | Cost | Paid required | Features |
|---|---|---|---|
| Basic | 2 | no | Open to whole university, capped at 25 responses, standard queue |
| Targeted | 5 paid | yes | Department + year targeting, 100 response cap |
| Boosted | 10 paid | yes | Pinned in feed for 48h, push to cohort, 250 response cap |
| Pro | 20 paid | yes | All targeting, top placement, 1000 response cap, instant publish, analytics export |

Earned credits cover Basic only. Attempting Targeted+ with only earned credits prompts upgrade.

## Fraud prevention

- **Verified school email**: reject signup unless domain matches an allowlist of `.edu` / known university TLDs (`.ac.uk`, `.edu.au`, etc.). Block disposable domains via maintained list (mailinator, tempmail, etc.).
- **Anti-duplicate account**: hash `lower(trim(email))` and store; also store normalized full name + university; flag soft-duplicates for admin review. Hard block on existing email hash.
- **Earning caps**: server-side trigger refuses to grant earned credit when daily/weekly cap reached or when respondent has already answered that survey.
- **Quality threshold**: response must have non-empty answers for ≥80% of questions and take ≥15 seconds total (client timestamp on entry, server validates on submit). Failing responses recorded but grant 0 credits.
- **Suspicious behavior detection**: tracks rapid-fire submissions (>5 in 10 min), copy-paste identical answers across surveys, and answering own university surveys created by same IP/device. Flags raise a `review_flags` row.
- **Admin review queue**: flagged users can't earn or spend until cleared. Simple admin role + page.

## Credit UX

- Profile shows two distinct cards: paid (gold/primary, prominent) and earned (sage, secondary), with progress to next cap reset and expiry countdown.
- Publish flow defaults to Pro tier with a clear "fastest, no friction" badge. Basic is a small text link underneath ("Publish basic with earned credits →").
- Insufficient paid credits triggers an inline buy sheet with three packs (10 / 50 / 200) and per-credit price reduction at higher tiers.
- Feed shows a "Boosted" ribbon on premium surveys so creators see the visible value of paying.

## Technical details

### Schema (migration)

- `profiles`: add `earned_credits int default 0`, `paid_credits int default 0`, `is_flagged bool default false`, `flag_reason text`, `email_hash text unique`. Migrate existing `credits` → `earned_credits` then drop.
- New table `credit_ledger` (audit): `id, user_id, wallet ('earned'|'paid'), delta, reason, survey_id?, expires_at?, created_at`.
- New table `earning_caps` (per-user rolling counters): `user_id, day_bucket, week_bucket, day_count, week_count`.
- New table `review_flags`: `id, user_id, type, details jsonb, resolved bool, created_at`.
- New table `user_roles` + `app_role` enum (`admin`, `user`) + `has_role()` security-definer function (per template rules — never store role on profiles).
- New table `disposable_domains` seeded with common providers.
- `surveys`: add `tier text default 'basic'`, `paid_cost int default 0`, `boosted_until timestamptz`, `response_goal int`.
- `survey_responses`: add `duration_ms int`, `quality_score numeric`.

### Triggers / functions

- `charge_survey_publish_credit` rewritten: deduct from paid wallet for Targeted/Boosted/Pro, allow earned for Basic only, enforce tier rules.
- `handle_new_response` rewritten: validate quality + caps, expire-stamp new earned credit (`now() + interval '30 days'`), insert ledger row, increment counters.
- Nightly `pg_cron` job to expire stale earned credits and reset weekly bucket.
- `signup` trigger validates email domain against allowlist + disposable list, sets `email_hash`.

### Frontend

- `src/lib/credits.ts` helper: tier definitions, formatting, "can afford" check.
- `src/routes/_authenticated/profile.tsx`: dual wallet cards + expiry meter + ledger history.
- `src/routes/_authenticated/create.tsx`: tier selector with Pro pre-selected, upgrade nudges.
- `src/routes/_authenticated/feed.tsx`: boosted ribbon, sort boosted first.
- `src/routes/_authenticated/survey.$id.tsx`: track entry timestamp, send `duration_ms` on submit.
- New `src/routes/_authenticated/buy.tsx`: credit packs, currently placeholder (Stripe wiring deferred unless requested).
- New `src/routes/_authenticated/admin.tsx`: gated by `has_role('admin')`, lists flagged users + review actions.

### Not included (call out)

- Real payment processing — packs add to `paid_credits` directly with a "Demo purchase" note. Wire Stripe in a follow-up.
- IP/device fingerprinting beyond Supabase auth — deeper anti-fraud (e.g. fingerprintjs) is a follow-up.

## Open question

Pricing of packs (10 / 50 / 200) — pick now or leave as placeholders? I'll use placeholders unless you give numbers.
