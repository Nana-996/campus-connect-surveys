import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refund-policy")({
  component: RefundPolicyPage,
  head: () => ({
    meta: [
      { title: "Refund Policy — CampusVerify" },
      { name: "description", content: "CampusVerify payments are final and non-refundable, except where applicable law requires otherwise." },
      { property: "og:title", content: "Refund Policy — CampusVerify" },
      { property: "og:description", content: "All CampusVerify purchases and paid services are final, subject to rights that applicable law does not allow us to exclude." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://campus-verify.live/refund-policy" },
    ],
    links: [{ rel: "canonical", href: "https://campus-verify.live/refund-policy" }],
  }),
});

function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">← Back home</Link>
      <h1 className="mt-6 font-serif text-5xl leading-[0.95]">Refund <em className="text-primary">Policy</em></h1>
      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Last updated: September 2026</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-serif text-2xl">1. All payments are final</h2>
          <p>CampusVerify, operated in Ghana by <strong>Vibe Tribe Organisation</strong>, does not offer refunds for credit bundles, Research Boosts, university slots, donations, subscriptions, or any other paid service once payment is completed.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">2. Credits and Research Boosts</h2>
          <p>Unused credits are not redeemable for cash. A Research Boost is not refundable if it is activated, underperforms, expires, or does not reach its response target. Sign-up credits are permanent but have no cash value.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">3. Payment errors</h2>
          <p>If you were charged more than once for the same order, charged without receiving the purchased service, or believe a payment was unauthorized, email us with your account email and Paystack reference so we can investigate the payment record.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">4. Rights preserved by law</h2>
          <p>This policy does not exclude or limit a refund, reversal, or other remedy that applicable Ghanaian law or another law governing your purchase requires and does not permit us to exclude.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">5. Contact</h2>
          <p>Email Vibe Tribe Organisation at <a href="mailto:nanadjan996@gmail.com" className="underline">nanadjan996@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  );
}