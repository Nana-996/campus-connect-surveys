## Plan

1. **Fix the backend publish trigger**
   - Update the survey publish database function so publishing a survey no longer checks, deducts, or updates any credit fields.
   - Keep useful publish preparation: set safe response limits, expiry dates, boosted placement, and targeting cleanup.
   - Keep the account-safety check that blocks only flagged accounts.

2. **Remove duplicate publish triggers**
   - The database currently has two active survey publish triggers calling the same function.
   - Replace them with one clean trigger so publish logic runs exactly once.

3. **Remove frontend credit blockers from survey creation**
   - Stop calling `canAfford()` on the create survey page.
   - Enable the publish button for all signed-in users regardless of credit count.
   - Remove the “need credits” blocking message and credit-cost wording from the publish button.

4. **Validate the fix**
   - Confirm the database trigger no longer touches protected profile fields.
   - Confirm survey publishing no longer depends on earned or paid credits.

## Technical details

The exact error comes from this chain:

```text
Publishing survey
→ charge_survey_publish_credit() updates profiles.earned_credits
→ protect_profile_sensitive_columns() sees a non-admin user changing protected fields
→ raises: “You cannot modify protected profile fields”
```

The correct fix is not to weaken profile protection. The correct fix is to remove credit mutations from survey publishing entirely.