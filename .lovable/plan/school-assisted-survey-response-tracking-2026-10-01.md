# School-assisted survey response tracking

## Goal
Let administrators of active partner schools grant a registered person at their school limited tracking access to a school-linked survey, so the school can follow up with eligible students using index numbers without exposing names, emails, or survey answers.

## What will change

### 1. School-controlled tracking grants
- Add a dedicated school tracking grant with: survey, recipient, scope (`department` or `university`), selected department when applicable, granting school administrator, creation date, and revocation date.
- A school administrator can grant or revoke access from the school portal by entering the recipient’s registered CampusVerify email.
- The recipient must have a confirmed account whose academic domain matches the administrator’s school.
- Grants apply only to school-linked surveys: surveys created by a person at that school or surveys explicitly targeting that school.
- Only active onboarded schools can create or retain usable grants.

### 2. Department or university-wide scope
- Department scope shows only eligible registered students in the selected department.
- University-wide scope shows eligible registered students across that school.
- Eligibility will follow the survey’s actual required audience criteria, including department, year, country, age range, interests, and university targeting where those criteria are required.
- Students from other schools and General/Researcher accounts will never appear in this index-number roster.

### 3. Privacy-safe response status
- The tracker sees only each eligible student’s index number, department, and one status:
  - **Not started** — no response start or submission exists.
  - **Responding** — a start exists but no submission exists.
  - **Responded** — a response was submitted.
- Do not expose student names, email addresses, profile details, response answers, response quality, or response timestamps in this school-assistance view.
- Search, filter, status totals, and CSV export will contain only index number, department, and status.

### 4. School administrator experience
- Add a **Survey tracking** section to the school portal.
- Show school-linked surveys, their live/closed state, progress, current tracking grants, and grant/revoke controls.
- Grant form: survey, registered recipient email, scope, and department when department scope is selected.
- Make the privacy boundary visible before granting: the recipient receives index numbers and response status only.

### 5. Recipient experience
- Add granted surveys to the existing survey-tracking workspace.
- Update the tracking page to distinguish this limited school grant from existing manager/survey-owner access.
- Show the three response states and hide the existing response-answer view for school-granted trackers.
- Existing survey-owner invitations and app-owner access remain unchanged.

## Technical details
- Use a new public table with explicit grants, RLS enabled, and no direct client write policy; authenticated server functions call narrowly scoped security-definer database functions.
- Database functions derive the administrator and recipient from authenticated/registered accounts; caller-supplied user IDs cannot set ownership.
- Resolve school scope from `schools.admin_user_id` and the school’s active subscription, never from a URL or submitted domain.
- Match domains case-insensitively and support the project’s existing subdomain rule.
- Reuse `survey_response_starts` and `survey_responses` for status; submission takes precedence over an existing start.
- Preserve index-number access behind protected functions only; do not widen direct access to `profiles`.
- Record the grant scope separately from user roles. Do not add roles to profiles or automatically make recipients platform-wide faculty/managers.

## Verification
- As an active school administrator, grant department access and university-wide access to registered same-school accounts; verify both appear in the recipient workspace.
- Confirm department scope, university scope, all survey audience criteria, and school-linked survey rules are enforced.
- Confirm Not started, Responding, and Responded statuses against real start/submission records.
- Confirm the tracker and CSV reveal only index number, department, and status.
- Confirm cross-school recipients, unregistered emails, inactive schools, unrelated surveys, and caller-supplied alternative identities are rejected.
- Confirm revocation removes access immediately and existing owner/admin tracking still works.
- Check desktop and phone layouts and the final build.
