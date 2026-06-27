import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refund-policy")({
  component: RefundPolicyPage,
  head: () => ({
    meta: [
      { title: "Refund Policy — CampusVerify" },
      { name: "description", content: "30-day money-back guarantee on CampusVerify credit purchases, processed by Paddle." },
      { property: "og:title", content: "Refund Policy — CampusVerify" },
      { property: "og:description", content: "30-day money-back guarantee on CampusVerify credit purchases, processed by Paddle." },
    ],
  }),
});

function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">← Back home</Link>
      <h1 className="mt-6 font-serif text-5xl leading-[0.95]">Refund <em className="text-primary">Policy</em></h1>
      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-serif text-2xl">1. 30-day money-back guarantee</h2>
          <p>
            CampusVerify, operated by <strong>Vibe Tribe Organisation</strong>, offers a <strong>30-day money-back guarantee</strong> on credit-bundle purchases. If you're not satisfied, you can request a full refund within 30 days of your order date.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">2. How refunds are processed</h2>
          <p>
            Our online reseller, <strong>Paddle.com</strong>, is the Merchant of Record for all CampusVerify orders. Paddle handles all billing, customer service inquiries, and refunds.
          </p>
          <p>
            To request a refund, visit <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="underline">paddle.net</a> and look up your order using the email address you used at checkout, or contact our support team and we'll help you raise the request with Paddle.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">3. What happens to your credits</h2>
          <p>
            When a refund is issued, any unspent credits from that purchase are removed from your balance. If you have already spent some of the credits, the corresponding portion may be deducted from future purchases or the refund amount adjusted, in line with Paddle's <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer" className="underline">Refund Policy</a>.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">4. Earned credits</h2>
          <p>
            Credits earned by students for answering surveys are free promotional credits, are not purchased, and are not refundable for cash. They expire 30 days after issue.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">5. Processing time</h2>
          <p>
            Once approved, refunds are returned to the original payment method by Paddle, typically within 5–10 business days depending on your bank.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-2xl">6. Contact</h2>
          <p>Questions about a refund? Visit <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="underline">paddle.net</a> or reach Vibe Tribe Organisation through the support channel inside the app.</p>
        </section>
      </div>
    </div>
  );
}
