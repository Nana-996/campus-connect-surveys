# Co-branded school joining and launch kit

## What will be built

- A public school partnership page at `/join/{school-slug}` for every active, subscribed school.
- The page will show CampusVerify and the school name together, explain the verified partnership, the 50-credit student welcome benefit, and require the student's matching academic email domain.
- The join button will open student signup with the school identity prefilled and protected from accidental changes; final eligibility will still be enforced by the existing email-domain and subscription rules.
- Invalid, inactive, expired, or unknown school links will show a clear unavailable page without exposing private school data.
- A **Launch kit** section in `/school-admin` with:
  - the school's permanent joining link;
  - one-click copy for the link and a ready-written student announcement;
  - WhatsApp and email sharing actions;
  - printable QR code download for posters and notices;
  - concise launch steps for the school manager.

## Safety and reliability

- Add one narrowly scoped public read function returning only partnership-safe school fields: name, domain-derived slug, and eligibility status. No manager, student, subscription-date, or private data will be exposed.
- School identity comes from the database, not URL text, and duplicate slugs are prevented.
- Existing student signup, credit grants, school subscriptions, admin permissions, and live user records remain unchanged.
- The signup link carries school context only; a student's verified email domain remains the authority for school membership and the 50-credit grant.
- Add unique page metadata for valid school partnership pages and `noindex` metadata for unavailable links.

## Verification

- Confirm a valid subscribed school page loads and displays the correct school.
- Confirm an unknown or expired school link cannot start a branded signup.
- Confirm signup is student-only, prefilled, and rejects a mismatched email domain before submission.
- Confirm every launch-kit copy/share/QR action uses the same permanent URL.
- Check desktop and mobile layouts, then verify the current build and runtime logs are clean.
