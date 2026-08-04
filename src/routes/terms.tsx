import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — CampusVerify" },
      { name: "description", content: "The CampusVerify terms of service: account eligibility, credit rules, survey conduct, payments, refunds and termination." },
      { property: "og:title", content: "Terms of Service — CampusVerify" },
      { property: "og:description", content: "Read the CampusVerify terms covering accounts, credits, survey conduct, payments and account termination." },
      { property: "og:url", content: "https://campus-verify.live/terms" },
    ],
    links: [{ rel: "canonical", href: "https://campus-verify.live/terms" }],
  }),
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">← Back home</Link>
      <h1 className="mt-6 font-serif text-5xl leading-[0.95]">Terms of <em className="text-primary">Service</em></h1>
      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-serif text-2xl">1. Who you're contracting with</h2>
          <p>
            CampusVerify is operated by <strong>Vibe Tribe Organisation</strong> ("CampusVerify", "we", "us"). By creating an account or using the service, you agree to these Terms. If you don't agree, don't use the service.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">2. Eligibility</h2>
          <p>Student accounts require a valid academic email (.edu, .edu.xx, .ac.xx, or .uni.xx). General accounts are open to anyone 18 or older. You must provide accurate information and may not impersonate others. If you sign up on behalf of an organisation, you confirm you have authority to bind it.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">3. The service</h2>
          <p>CampusVerify lets verified students and general users create and answer surveys using an in-platform unit called "credits". We grant you a limited, non-exclusive, non-transferable right to use the service. We may add, change, or remove features at any time.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">4. Credits, payments, and Merchant of Record</h2>
          <p>
            Students earn credits by answering surveys. General users may purchase credit bundles. <strong>Our order process is conducted by our online reseller Paystack. Paystack is the Merchant of Record for all our orders. Paystack provides payment processing, customer service inquiries, and handles returns.</strong>
          </p>
          <p>
            By purchasing credits, you also agree to Paystack's <a href="https://paystack.com/terms" target="_blank" rel="noopener noreferrer" className="underline">Buyer Terms</a>, which govern payment, billing, tax, invoicing, and refund mechanics. Prices are shown in USD for comparison; checkout is charged in Ghana Cedis at the live exchange rate. Credits are delivered to your balance after Paystack confirms payment.
          </p>
          <p>
            Refunds are handled under our <Link to="/refund-policy" className="underline">Refund Policy</Link>. Earned (non-purchased) credits expire 30 days after issue. Purchased credits do not expire.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">5. Acceptable use</h2>
          <p>You agree not to: (a) submit low-quality or fraudulent responses; (b) create multiple accounts to game the credit system; (c) post content that is unlawful, harassing, discriminatory, infringing, or that exposes others' personal data; (d) attempt to interfere with the service, probe it for vulnerabilities, scrape it, or upload malware. You are responsible for safeguarding your credentials.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">6. Content ownership</h2>
          <p>You retain ownership of the surveys and responses you create. You grant CampusVerify a limited, worldwide licence to host, display, and process that content solely to operate the service.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">7. Intellectual property</h2>
          <p>CampusVerify, including its software, design, and branding, is owned by Vibe Tribe Organisation. No rights are granted to you other than the limited licence described above. You may not reverse engineer, resell, or redistribute the service.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">8. Suspension and termination</h2>
          <p>We may suspend or terminate your account for material breach, non-payment, suspected fraud, security risk, or repeated policy violations. On termination, your access ends and your data is deleted as described in the Privacy Policy.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">9. Disclaimers</h2>
          <p>The service is provided "as is" without warranties of any kind, express or implied, including merchantability or fitness for a particular purpose, to the maximum extent permitted by law. We do not guarantee uninterrupted availability or that any survey will reach its response goal.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">10. Limitation of liability</h2>
          <p>To the maximum extent permitted by law, CampusVerify is not liable for indirect, incidental, special, or consequential damages, or loss of profits, data, or goodwill. Our aggregate liability for any claim is limited to the amount you paid us in the 12 months preceding the claim. Nothing in these Terms excludes liability that cannot be excluded by law.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">11. Indemnity</h2>
          <p>You agree to indemnify Vibe Tribe Organisation against claims arising from your content, your unlawful use of the service, or your breach of these Terms.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">12. Changes</h2>
          <p>We may update these Terms. Material changes will be announced in-app. Continued use after the effective date constitutes acceptance.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">13. Contact</h2>
          <p>Questions? Reach Vibe Tribe Organisation through the support channel inside the app.</p>
        </section>
      </div>
    </div>
  );
}
