export type PaymentFeedback = {
  status: "failed" | "pending";
  message: string;
};

/** Map provider reasons to a small allowlist; never send raw gateway data to the browser. */
export function paymentFeedback(status: string, reason?: string | null): PaymentFeedback {
  if (!["failed", "abandoned", "reversed"].includes(status)) {
    return { status: "pending", message: "Your payment is not confirmed yet. Approve any mobile money prompt on your phone, then check again. If you were debited, do not pay again while confirmation is pending." };
  }
  const text = (reason ?? "").toLowerCase();
  if (/balance|insufficient|funds|limit/.test(text)) {
    return { status: "failed", message: "Your wallet or card may have insufficient funds or a payment limit. Top up your wallet, check your limits, or try another card or mobile money account." };
  }
  if (/approve|approval|timeout|timed out|authoriz|otp|prompt/.test(text)) {
    return { status: "failed", message: "The payment was not approved in time. Try again and approve the prompt on your phone, or use a card." };
  }
  if (status === "abandoned" || /cancel|abandon/.test(text)) {
    return { status: "failed", message: "Checkout was closed before payment completed. Try again when you are ready, using mobile money or a card." };
  }
  return { status: "failed", message: "Paystack could not complete this payment. Check your wallet balance or try another payment method. If you were debited, contact founder@campus-verify.live before paying again." };
}