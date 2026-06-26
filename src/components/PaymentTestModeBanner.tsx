import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;
  return (
    <div className="w-full border-b border-orange-300 bg-orange-100 px-4 py-2 text-center text-xs text-orange-800">
      Payments are in test mode — use test card{" "}
      <code className="rounded bg-orange-200 px-1 font-mono">4242 4242 4242 4242</code>, any future
      expiry, any CVC.
    </div>
  );
}
