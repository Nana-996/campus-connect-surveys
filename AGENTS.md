# Architecture rules

- Public school partnership pages resolve a database-backed `schools.join_slug`; school membership and credit eligibility always remain email-domain enforced so URL parameters cannot grant benefits.
- The pitch deck and platform administration functions verify the authenticated email claim against the configured owner because only the app owner may access them.
- Platform analytics aggregates full-table data in a service-only database function after the server verifies the app owner's authenticated email claim, preventing capped admin lists from distorting reports.
- School-assisted survey tracking uses explicit, revocable school grants and returns only eligible students' index number, department, and response state; it never broadens faculty roles or exposes identity and answer data.