import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — CampusVerify" },
      { name: "description", content: "How CampusVerify collects, uses, and protects your data." },
      { property: "og:title", content: "Privacy Policy — CampusVerify" },
      {
        property: "og:description",
        content: "How CampusVerify collects, uses, and protects your data.",
      },
      { property: "og:url", content: "https://your-domain.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://your-domain.com/privacy" }],
  }),
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/"
        className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        ← Back home
      </Link>
      <h1 className="mt-6 font-serif text-5xl leading-[0.95]">
        Privacy <em className="text-primary">Policy</em>
      </h1>
      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Last updated: {new Date().getFullYear()}
      </p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-serif text-2xl">1. What we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Account data:</strong> email, name, university domain, department, year,
              interests.
            </li>
            <li>
              <strong>Survey data:</strong> the surveys you create and the responses you submit.
            </li>
            <li>
              <strong>Technical data:</strong> basic logs needed to operate the service.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-2xl">2. How we use it</h2>
          <p>
            To operate the platform, match surveys to relevant respondents, enforce the credit
            system, prevent abuse, and communicate service updates. We do not sell your personal
            data.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">3. Sharing</h2>
          <p>
            Survey creators see <em>aggregated</em> answers and respondent-level answers without
            identifying personal info beyond what the question asks. We use Supabase (database &
            auth) as our infrastructure provider.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">4. Security</h2>
          <p>
            Row-level security policies restrict data access by user. Passwords are hashed by
            Supabase. We monitor for suspicious behavior and flag accounts that appear to abuse the
            credit system.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">5. Your rights</h2>
          <p>
            You can update profile data inside the app, request export or deletion of your account
            by contacting support. Deletion removes your profile and active surveys; aggregated,
            anonymized analytics may be retained.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">6. Cookies & local storage</h2>
          <p>
            We use local storage to keep you signed in and remember a few UI preferences. We do not
            use third-party advertising cookies.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">7. Children</h2>
          <p>CampusVerify is not directed to anyone under 18. Don't use it if you're younger.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">8. Changes</h2>
          <p>We'll post updates here and announce material changes in-app.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">9. Contact</h2>
          <p>Privacy questions? Reach us through the support channel inside the app.</p>
        </section>
      </div>
    </div>
  );
}
