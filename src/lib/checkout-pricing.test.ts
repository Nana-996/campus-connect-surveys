import { describe, expect, it } from "vitest";
import { bundleAmountGhs, getBundleByBundleId, PAID_BUNDLES } from "./credit-bundles";
import { paymentFeedback } from "./payment-feedback";

describe("credit checkout rules", () => {
  it("offers 10 Mini credits for exactly GHS 10 without an exchange rate", () => {
    const mini = getBundleByBundleId("mini");
    if (!mini) throw new Error("Mini missing");
    expect(mini.credits).toBe(10);
    expect(bundleAmountGhs(mini, 1, 0)).toBe(10);
    expect(PAID_BUNDLES.map((bundle) => bundle.id)).toContain("mini");
  });
  it("retains the 50% student price for Mini", () => {
    const mini = getBundleByBundleId("mini");
    if (!mini) throw new Error("Mini missing");
    expect(bundleAmountGhs(mini, 0.5, 0)).toBe(5);
  });
  it("preserves existing bundle credits and USD prices", () => {
    expect(PAID_BUNDLES.filter((b) => b.id !== "mini").map((b) => [b.id, b.credits, b.usdAmount])).toEqual([
      ["starter", 50, 5], ["plus", 120, 10], ["pro", 300, 20],
    ]);
  });
  it("retains the USD exchange adjustment", () => {
    const starter = getBundleByBundleId("starter");
    if (!starter) throw new Error("Starter missing");
    expect(bundleAmountGhs(starter, 1, 12)).toBe(63);
    expect(() => bundleAmountGhs(starter, 1, 0)).toThrow();
  });
});

describe("payment feedback states", () => {
  it.each(["pending", "ongoing", "processing", "queued"])("does not treat %s as a failed payment", (status) => {
    expect(paymentFeedback(status, "Insufficient balance").status).toBe("pending");
  });
  it.each(["failed", "abandoned", "reversed"])("allows retry only for terminal %s status", (status) => {
    expect(paymentFeedback(status).status).toBe("failed");
  });
  it("does not expose arbitrary provider details", () => {
    expect(paymentFeedback("failed", "private transaction details").message).not.toContain("private transaction details");
  });
});