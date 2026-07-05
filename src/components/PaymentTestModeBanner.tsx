import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPaystackTestMode } from "@/utils/paystack.functions";

export function PaymentTestModeBanner() {
  const check = useServerFn(getPaystackTestMode);
  const [testMode, setTestMode] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    check().then((r) => { if (!cancelled) setTestMode(r.testMode); }).catch(() => {});
    return () => { cancelled = true; };
  }, [check]);
  if (!testMode) return null;
  return (
    <div className="w-full border-b border-orange-300 bg-orange-100 px-4 py-2 text-center text-xs text-orange-800">
      Payments are in test mode — use Paystack test card{" "}
      <code className="rounded bg-orange-200 px-1 font-mono">4084 0840 8408 4081</code>, CVV 408, any future expiry, PIN 0000, OTP 123456.
    </div>
  );
}
