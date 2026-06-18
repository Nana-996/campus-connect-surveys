import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — CampusVerify" },
      { name: "description", content: "The rules and agreements that govern your use of CampusVerify." },
      { property: "og:title", content: "Terms of Service — CampusVerify" },
      { property: "og:description", content: "The rules and agreements that govern your use of CampusVerify." },
      { property: "og:url", content: "https://your-domain.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://your-domain.com/terms" }],
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
          <h2 className="font-serif text-2xl">1. Acceptance</h2>
          <p>By creating a CampusVerify account or using the service, you agree to these Terms. If you don't agree, don't use the service.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">2. Eligibility</h2>
          <p>Student accounts require a valid academic email (.edu, .edu.xx, .ac.xx, or .uni.xx). General accounts are open to anyone 18+. You must provide accurate information and may not impersonate others.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">3. Credits</h2>
          <p>Credits are an in-platform unit used to publish and answer surveys. Earned credits expire 30 days from issue. Credits have no cash value and are non-refundable except where required by law.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">4. Acceptable use</h2>
          <p>You agree not to: (a) submit low-quality or fraudulent responses; (b) create multiple accounts to game the credit system; (c) post content that is unlawful, harassing, discriminatory, infringing, or that exposes others' personal data; (d) attempt to interfere with the service. We may suspend or remove accounts that violate these rules.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">5. Content ownership</h2>
          <p>You retain ownership of the surveys and responses you create. You grant CampusVerify a limited license to host, display, and process that content to operate the service.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">6. Credits</h2>
          <p>CampusVerify is free to use. Credits are earned by answering surveys and are not for sale. Credits have no cash value and cannot be transferred or refunded.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">7. Disclaimers</h2>
          <p>CampusVerify is provided "as is", without warranties of any kind. We do not guarantee uninterrupted availability or that any particular survey will reach its response goal.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">8. Limitation of liability</h2>
          <p>To the maximum extent permitted by law, CampusVerify is not liable for indirect, incidental, or consequential damages. Our total liability for any claim is limited to the greater of the amount in your credit balance or zero.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">9. Changes</h2>
          <p>We may update these Terms. Material changes will be announced in-app. Continued use after the effective date constitutes acceptance.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">10. Contact</h2>
          <p>Questions? Reach us through the support channel inside the app.</p>
        </section>
      </div>
    </div>
  );
}
