# Architecture rules

- Public school partnership pages resolve a database-backed `schools.join_slug`; school membership and credit eligibility always remain email-domain enforced so URL parameters cannot grant benefits.
- The pitch deck and platform administration functions verify the authenticated email claim against the configured owner because only the app owner may access them.