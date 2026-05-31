## Goal

Two fixes:
1. Make every tier affordable for a new user's *first* survey, while keeping higher tiers as something to "earn toward".
2. Remove the remaining payment/pricing language from legal pages and admin, and shorten the overlong "can't afford" button label on the Create page.

---

## 1. Tier costs (so new users can publish immediately)

In `src/lib/credits.ts`, lower the costs so the **default 10-credit grant** (students) and **5-credit grant** (general) cover at least Basic and Targeted out of the box, with Boosted/Pro requiring earning:

- Basic: `1` → **1** (unchanged — instantly publishable)
- Targeted: `3` → **3** (unchanged — first Targeted is free for everyone)
- Boosted: `10` → **8** (a first Boosted is reachable for students on day 1, general users earn ~3 more)
- Pro: `20` → **15** (clearly an "earn toward it" tier)

This satisfies "enough for their first surveys, but need to answer surveys to make more."

## 2. Fix the overflowing publish button

In `src/routes/_authenticated/create.tsx`, the submit button currently renders `afford.reason` as the label when the user can't afford the selected tier — that produces "Needs 10 credits — you have 5. Answer surveys in your feed to earn more." which overflows.

Change the button to always show a short label, and show the affordability hint as a small line *above* the button:

```text
[Need 5 more credits — answer surveys in your feed to earn them.]
[       Publish Boosted (8 credits)            ]   ← always short
```

When the user *can* afford it, no hint, button reads `Publish <Tier> →`. The button keeps `disabled={!afford.ok}`.

Also tighten `canAfford` in `src/lib/credits.ts` so the reason is a short phrase (`"Need N more credits"`) instead of a full sentence — the long sentence is now redundant with the hint line.

## 3. Remove remaining payment/pricing language

- `src/routes/terms.tsx` §6 "Payments": replace with a "Credits" section saying credits are earned by answering surveys and are not for sale.
- `src/routes/privacy.tsx`: remove the "Payment data: Paystack…" bullet.
- `src/routes/_authenticated/admin.tsx`: remove the **Revenue** KPI, the **Credits sold** KPI, and the **Payments** tab + `PaymentsPanel` (and the `listPayments` import). Admin keeps Users / Surveys / Flags / Blocked domains.
- Leave the tier cost chips ("1 credit", "3 credits", …) on the Create page — those are credit *costs*, not money, and are needed for users to choose a tier.

## Out of scope

- No changes to the credit-earning logic, ledger, or DB.
- No changes to signup grants (students 10 / general 5 stay as-is — the tier rebalance above is what makes them sufficient).
- `src/lib/admin.functions.ts` `listPayments` server fn stays in the file (unused) to avoid touching server code; only the UI calling it is removed.
