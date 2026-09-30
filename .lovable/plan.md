# Correct public claims and policies

## Goal
Make CampusVerify’s public information match the confirmed operating rules, remove unsupported or exposed examples, and restrict the pitch deck to the super administrator.

## Changes
- Correct every relevant page and document to state: non-partner students receive 10 permanent sign-up credits, General/Researcher accounts receive 5 permanent sign-up credits, and partner-school students receive 50 permanent sign-up credits.
- Update the live credit rules so future sign-up bonuses never expire; safely preserve existing unexpired sign-up bonuses and inspect prior expiry records before deciding whether any restoration is mathematically safe.
- Replace the current money-back promise with an all-sales-final policy across pricing, terms, metadata, and the refund page, while preserving any rights that Ghanaian law cannot exclude.
- Move the pitch deck behind signed-in super-administrator access, keep its published address as `campus-verify.live`, remove the exposed real-survey claim, remove beta language, and retain the verified-account/no-random-link-response positioning in accurate wording.
- Keep the confirmed response-rate claim, remove the “strongest-performing topics” claim, and remove final-year/academic-project framing throughout shared pages.
- Replace the temporary social-preview image reference with a stable CampusVerify-owned asset or omit it where a valid absolute image is unavailable.
- Add a public privacy and security audit that documents verified controls, data flows, limitations, and the audit date without claiming formal certification. Link it from the Privacy Policy and update the pitch claim to match the audit.
- Identify Vibe Tribe Organisation as the Ghana-based operator and use `nanadjan996@gmail.com` as the contact address on legal/support pages.

## Email note
`notify.campus-verify.live` is verified for sending CampusVerify emails, but it is not an inbox. Messages sent to an address on that subdomain are not automatically received anywhere. The app will therefore use `nanadjan996@gmail.com` for incoming contact until a mailbox or forwarding address is configured separately.

## Technical details
- Apply the credit expiry correction through a database migration, including the current `handle_new_user` function and relevant sign-up ledger rows; no page-load seeding.
- Authorize `/pitch` with the existing server-verified super-admin identity check, not browser storage or a public route guard.
- The privacy audit will distinguish academic verification for students from confirmed-email registration for General/Researcher accounts, and will not claim that authentication proves how a person completed a survey.
- Update route metadata alongside visible text and verify the affected pages, protected pitch access, and build output.
