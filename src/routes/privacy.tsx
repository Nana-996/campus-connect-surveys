import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — CampusVerify" },
      { name: "description", content: "How CampusVerify collects, uses, and protects your data." },
      { property: "og:title", content: "Privacy Policy — CampusVerify" },
      { property: "og:description", content: "How CampusVerify collects, uses, and protects your data." },
    ],
  }),
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">← Back home</Link>
      <h1 className="mt-6 font-serif text-5xl leading-[0.95]">Privacy <em className="text-primary">Policy</em></h1>
      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-serif text-2xl">1. Who we are</h2>
          <p>
            CampusVerify is a service operated by <strong>Vibe Tribe Organisation</strong> ("we", "us", "our").
            For the personal data described in this notice, Vibe Tribe Organisation acts as the <strong>data controller</strong>.
            Our payment processor, Paystack, acts as the Merchant of Record and is a separate data controller for payment data it collects directly from you at checkout.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">2. What we collect and why</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Account data</strong> (email, name, university domain, department, year, interests) — to create and operate your account. Legal basis: performance of a contract.</li>
            <li><strong>Survey data</strong> (surveys you create and responses you submit) — to deliver the core service. Legal basis: performance of a contract.</li>
            <li><strong>Credit and transaction metadata</strong> (bundle purchased, credits granted, Paystack transaction reference) — to fulfil purchases and prevent fraud. Legal basis: contract and legitimate interests.</li>
            <li><strong>Technical data</strong> (IP address, device, basic logs) — to keep the service secure and reliable. Legal basis: legitimate interests.</li>
            <li><strong>Support messages</strong> — to respond to you. Legal basis: legitimate interests.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-2xl">3. Who we share data with</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> — database, authentication, and storage infrastructure.</li>
            <li><strong>Paystack</strong> — our Merchant of Record for all paid transactions. Paystack handles billing, tax, invoicing, refund requests, and chargebacks, and receives the personal data needed for those activities (name, email, billing address, payment details). See Paystack's <a href="https://paystack.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">privacy policy</a>.</li>
            <li><strong>Google</strong> — for users who choose Sign in with Google.</li>
            <li><strong>Professional advisers and authorities</strong> — where required by law.</li>
          </ul>
          <p>We do not sell your personal data.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">4. Data retention</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account and profile data — kept while your account is active and deleted within 30 days of account deletion.</li>
            <li>Survey responses — retained for the lifetime of the survey; aggregated, anonymised analytics may be kept indefinitely.</li>
            <li>Transaction records — retained for up to 7 years to meet tax and accounting obligations.</li>
            <li>Support correspondence — retained for up to 2 years.</li>
            <li>Security and access logs — retained for up to 12 months.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-2xl">5. Security</h2>
          <p>Row-level security policies restrict data access per user, passwords are hashed by Supabase, and traffic is encrypted in transit. We monitor for suspicious behaviour and flag accounts that appear to abuse the credit system.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">6. Your rights</h2>
          <p>
            Subject to applicable law (including GDPR for EEA/UK users), you have the right to access, rectify, erase, restrict, port, or object to processing of your personal data, to withdraw consent, and to lodge a complaint with your local data protection authority. You can update profile data inside the app and request export or deletion by contacting support.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">7. International transfers</h2>
          <p>Data may be processed outside your country, including by Supabase and Paystack. Where required, we rely on Standard Contractual Clauses or equivalent safeguards.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">8. Cookies and local storage</h2>
          <p>We use local storage to keep you signed in and remember a few UI preferences. We do not use third-party advertising cookies. Paystack may set its own cookies on the checkout page.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">9. Children</h2>
          <p>CampusVerify is not directed to anyone under 18.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">10. Changes</h2>
          <p>We'll post updates here and announce material changes in-app.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">11. Contact</h2>
          <p>Privacy questions? Reach Vibe Tribe Organisation through the support channel inside the app.</p>
        </section>
      </div>
    </div>
  );
}
