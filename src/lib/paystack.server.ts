// Paystack server helpers (secret-key API calls). Import only from server code.
const PAYSTACK_BASE = "https://api.paystack.co";

function getSecret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

async function paystackFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecret()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: unknown };
  if (!res.ok || body.status === false) {
    throw new Error(body.message || `Paystack request failed: ${res.status}`);
  }
  return body.data;
}

export async function initializeTransaction(input: {
  email: string;
  amountGhsPesewas: number; // GHS in pesewas (kobo-equivalent — 100 = GHS 1)
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  return (await paystackFetch("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountGhsPesewas,
      currency: "GHS",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  })) as { authorization_url: string; access_code: string; reference: string };
}

export async function verifyTransaction(reference: string) {
  return (await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`)) as {
    status: string; // "success" | "failed" | ...
    reference: string;
    amount: number; // pesewas
    currency: string;
    metadata?: Record<string, unknown>;
    customer?: { email?: string };
  };
}

export function isTestMode(): boolean {
  return getSecret().startsWith("sk_test_");
}
