## Goal

Turn general (non-student) users into paying customers. They buy credits in Ghanaian cedis (GHS) and spend them to publish surveys. Students keep earning credits for free by answering surveys. To preserve the earn-by-answering economy, general users pay **2× the credit cost** for every tier.

## 1. Payment provider — Paddle

Paddle is the right fit:
- It is a merchant of record, so VAT/tax, fraud, refunds and chargebacks are handled for you — important when you're solo in Ghana selling to a global academic audience.
- Paddle supports localized pricing: buyers see GHS at checkout while you receive payout in a supported currency (USD/EUR/GBP). I'll set GHS as the display currency on every price.
- No Stripe/PSP account needed; checkout works as soon as the test environment is provisioned.

A test (sandbox) environment is created immediately so we can run end-to-end purchases without real money. Live payments require Paddle's standard seller verification afterwards.

## 2. New pricing system

### Dual tier costs (the surcharge)

`src/lib/credits.ts` gets a per-tier student vs general cost. The earn-side stays unchanged.

| Tier | Student cost | General cost (2×) | Response goal |
|------|--------------|-------------------|----------------|
| Basic | 1 | 2 | 50 |
| Targeted | 3 | 6 | 200 |
| Boosted | 8 | 16 | 500 |
| Pro | 15 | 30 | 2,000 |

`canAfford()` and every place that reads `TIERS[t].cost` switches to a helper `tierCost(tier, userType)` so the right number is charged and shown.

### Credit bundles (general users only)

Base anchor: **GHS 1 / credit**, with progressive bundle discounts.

| Bundle | Credits | Price | Effective |
|--------|---------|-------|-----------|
| Starter | 10 | GHS 9 | 0.90 / cr (10% off) |
| Plus | 30 | GHS 24 | 0.80 / cr (20% off) |
| Pro | 100 | GHS 70 | 0.70 / cr (30% off) |

Sanity check against tiers: Starter covers 5 Basic surveys or one Boosted with change. Plus covers one Pro-tier survey. Pro bundle covers ~3 Pro-tier surveys — a comfortable "stock up for a semester" pack.

## 3. App changes

### Backend
- **`payment_transactions` table** already exists — reuse it. Add `bundle_id`, `credits_granted`, `paddle_txn_id`, `currency` if any are missing (verified during build).
- **Webhook route** at `src/routes/api/public/paddle-webhook.ts`:
  - Verify Paddle signature.
  - On `transaction.completed`, look up the bundle, insert a `credit_ledger` row (`wallet=purchased`, `delta=+credits`, no expiry), and mark the transaction paid.
  - Idempotent on `paddle_txn_id`.
- **`credit_ledger.wallet`** gains a `purchased` value (separate from `earned`) so purchased credits never expire and admin reporting stays clean. `canAfford` sums earned + purchased for general users.
- **`createCheckoutSession` server function** in `src/lib/payments.functions.ts` (auth-protected): takes a `bundleId`, returns a Paddle checkout URL/transaction token for the current user.

### Frontend
- **`/buy-credits` route** (under `_authenticated`): shows the three bundles as cards, "Buy" launches Paddle's overlay checkout via `@paddle/paddle-js`. Hidden entirely for students — they see a "You earn credits by answering surveys" panel instead.
- **AppHeader credit chip** for general users links to `/buy-credits` instead of `/feed`.
- **Profile page**: replace the "Earn credits — answer surveys" CTA with a "Buy credits" CTA for general users; show purchased vs earned balance breakdown.
- **Create-survey tier picker**: shows the cost for the current user type (2× numbers for general users) and a "Not enough credits — buy more" inline link when applicable.
- **Tier copy** in `src/lib/credits.ts` features stays the same; only the displayed cost changes.

### Admin
- Admin Users table gets a "Lifetime spend (GHS)" column sourced from `payment_transactions`.

## 4. Rollout order (build mode)

1. Enable Paddle (`enable_paddle_payments`) and wait for confirmation.
2. Create the three bundle products in Paddle with GHS pricing via `batch_create_product`.
3. Migration: add `purchased` wallet value, any missing `payment_transactions` columns.
4. Refactor `credits.ts` to `tierCost(tier, userType)`; update every caller.
5. Build `/buy-credits` route, Paddle checkout server fn, and webhook.
6. Update Profile, header chip, and tier picker UI for general users.
7. Sandbox end-to-end test: signup as general → buy Starter → balance updates → publish a Basic survey (cost 2).

## Technical notes

- Paddle prices are stored per-currency; GHS will be the primary display currency, with a USD fallback for unsupported regions.
- `purchased` credits bypass `EARNED_EXPIRY_DAYS` and the daily/weekly earn caps — those rules still only apply to `earned`.
- The webhook lives under `/api/public/*` so Paddle can reach it without auth; signature verification is mandatory inside the handler.
- Student accounts never see the buy-credits surface and the checkout server fn rejects non-general callers, so the earn-by-answering loop is preserved.
