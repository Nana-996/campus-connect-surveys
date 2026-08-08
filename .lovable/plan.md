# Research Boost — paid targeted distribution

A new way to publish: instead of spending credits, anyone (general users **and** students) can pay cash for a guaranteed number of responses from a precisely targeted population.

## The product

Four price points, charged in Ghana Cedis through Paystack:

| Boost | Price | Targeted responses |
|---|---|---|
| Starter | ₵10 | 50 |
| Standard | ₵20 | 100 |
| Advanced | ₵35 | 200 |
| Campus-wide | ₵50 | 500 |

Targeting is picked with the existing Audience builder: university/school, faculty or department, level/year, interests, country. The live reach estimate already built into that component tells the buyer, before paying, how many real people match — if the matching pool is smaller than the responses they want, the purchase is blocked with a suggestion to widen the audience or pick a smaller boost.

Boosts run for 30 days. If the quota isn't filled by then the boost simply ends — no refunds, stated clearly at checkout and in the refund policy page.

## Buyer flow

```text
Create survey  ->  choose "Research Boost" instead of a credit tier
      |
      v
Audience builder (school / department / level / interests)  +  response target
      |
      v
Reach check: enough matching people?  -- no -->  widen audience or smaller boost
      | yes
      v
Paystack checkout (GHS)  ->  redirect back  ->  verified
      |
      v
Survey goes live, pinned to the top of matching users' feeds until the quota fills
```

The survey is saved as an unpublished draft before payment and only goes live once Paystack confirms. Abandoned checkouts leave a draft the user can retry or delete; no credits are ever charged for a boosted survey.

## Distribution

- Boosted surveys sit above everything else in the feed of every user who matches the required criteria, ahead of the existing credit-tier boosts.
- The paid response target becomes the survey's hard response goal — once reached, the survey stops accepting responses and closes automatically.
- Respondents earn credits for boosted surveys exactly as they do today.
- The creator's Report Studio gains a progress strip: responses delivered vs paid-for, days remaining, and a breakdown of which targeted segments have responded (reusing the existing tracking category grouping).

## Who can buy

Both general users and students can buy a boost with money. It sits alongside — not in place of — the credit system: students keep earning and spending credits for ordinary surveys, and general users keep buying credit bundles. A boost is a separate cash purchase tied to one specific survey.

## Technical notes

**Database**
- New table `public.research_boosts`: `user_id`, `survey_id`, `boost_tier`, `target_responses`, `price_ghs_pesewas`, `paystack_reference`, `status` (`pending` / `paid` / `active` / `completed` / `expired`), `targeting` JSONB snapshot, `expires_at`, `activated_at`. GRANTs for `authenticated` + `service_role`; RLS so a user reads only their own rows, plus admin read via `has_role`.
- `surveys.tier` gains a `research_boost` value. `charge_survey_publish_credit` is amended: for that tier it charges no credits, forces `is_active = false` and `response_goal`/`expires_at` from the boost record instead of the tier table.
- New security-definer RPC `activate_research_boost(_reference, _raw)` — idempotent: marks the boost paid, sets the survey `is_active = true`, `boosted_until = now() + 30 days`, `response_goal = target_responses`.
- `handle_new_response` closes the survey when `response_count >= response_goal` for boosted surveys.
- Admin RPC `admin_list_research_boosts()` for the admin portal.

**Payments**
- New server functions in `src/utils/research-boost.functions.ts`: `initializeResearchBoostCheckout` (validates tier + reach + ownership, inserts the pending boost, calls Paystack with an `rb_` reference prefix) and `verifyResearchBoostCheckout` (verifies with Paystack, calls `activate_research_boost`).
- `src/routes/api/public/paystack/webhook.ts` routes by reference prefix: `cv_` → existing `credit_paystack_purchase`, `rb_` → `activate_research_boost`. Signature verification is unchanged.

**Frontend**
- `src/lib/research-boost.ts`: tier table (price, response count, label, blurb) shared by pricing page and create flow.
- `src/routes/_authenticated/create.tsx`: a "Research Boost" option in the publish step that swaps the credit-cost panel for boost tiers, wires the Audience builder's reach estimate into an eligibility check, and sends the user to Paystack.
- Boost return handling on `/create` (or a small `/boost-complete` step) calling the verify function, mirroring the existing `buy-credits` `paystack_ref` pattern.
- `src/routes/_authenticated/feed.tsx`: boosted surveys rank above all others for matching users, with a distinct badge.
- `src/routes/pricing.tsx`: a Research Boost section with the four cedi tiers, visible to students too (the student-only free notice is adjusted so students can still reach it).
- Progress strip in `src/routes/_authenticated/survey.$id.report.tsx`.
- Refund policy page gains a line: boosts are non-refundable, unfilled quota is not returned.
