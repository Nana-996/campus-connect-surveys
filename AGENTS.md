# Architecture rules

- Public school partnership pages resolve a database-backed `schools.join_slug`; school membership and credit eligibility always remain email-domain enforced so URL parameters cannot grant benefits.
- The pitch deck verifies the existing super-admin role through a protected server function before rendering because its contents are private.