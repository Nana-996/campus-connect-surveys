# Correct account-specific guidance and owner access

## Goal
Make each account type see accurate, relevant guidance and ensure the platform administration area is reserved for the app owner.

## Changes
- Update the non-partner student credit page to explain the 10 permanent sign-up credits, half-price purchases, and how to ask a school administrator to contact the app owner about partnership.
- Replace outdated progress-access instructions with the current email invitation process controlled by the survey owner.
- Restrict the admin console, analytics, and administration actions to the configured app owner; other users will see a clear private-area message rather than an error.
- Make sign-in wording change with the selected Student or General/Researcher account type, without showing student-only language to General/Researcher users.
- Make the credit page describe only the signed-in person's applicable credit grant and pricing instead of displaying all account types together.
- Verify the corrected screens and access states on desktop and mobile.

## Technical details
- Reuse the existing protected app-owner identity check for all administration functions and navigation.
- Keep faculty, school-manager, survey-owner, student, and General/Researcher permissions unchanged outside the administration area.
- No pricing amounts, credit awards, partnership eligibility, or survey-access rules will change.
