import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { startDonation } from "@/utils/donations.functions";
import {
  DONATION_PRESETS_GHS,
  PRESET_BLURBS,
  formatGhs,
  isValidDonationAmount,
  type DonationFrequency,
} from "@/lib/donations";
import { BadgeCheck, HeartHandshake, Landmark, Loader2, Repeat, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/donate/")({
  component: DonatePage,
  head: () => ({
    meta: [
      { title: "Donate — Keep campus research free | CampusVerify" },
      {
        name: "description",
        content:
          "Pledge GHS 5, 25, 50, 250 or any amount you wish — once or monthly — to keep verified student research free on CampusVerify. Every gift gets an emailed tax receipt.",
      },
      { property: "og:title", content: "Donate — Keep campus research free | CampusVerify" },
      {
        property: "og:description",
        content: "Support verified student research in Ghana. One-time or monthly pledges, with an instant tax receipt.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://campus-verify.live/donate" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://campus-verify.live/donate" }],
  }),
});

function DonatePage() {
  const { user, profile } = useAuth();
  const begin = useServerFn(startDonation);

  const [preset, setPreset] = useState<number | "custom">(25);
  const [custom, setCustom] = useState("");
  const [frequency, setFrequency] = useState<DonationFrequency>("one_time");
  const [name, setName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const amount = preset === "custom" ? Number(custom) : preset;
  const valid = isValidDonationAmount(amount);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      toast.error("Enter an amount of at least GHS 1");
      return;
    }
    setBusy(true);
    try {
      const res = await begin({
        data: {
          amountGhs: amount,
          frequency,
          donorName: name,
          donorEmail: email,
          message,
          originUrl: window.location.origin,
        },
      });
      window.location.href = res.authorizationUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the donation");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link to="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
        ← Back home
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Support</p>
          <h1 className="mt-1 font-serif text-5xl leading-[0.95]">
            Keep campus research <em className="text-primary">free</em>.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            CampusVerify exists so a student with a questionnaire and no budget can still reach verified respondents.
            Donations pay for email verification, response incentives and the servers that keep it honest.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              { icon: BadgeCheck, title: "Verification stays free", body: "Every student account is checked against a real academic domain." },
              { icon: HeartHandshake, title: "Students get paid to help", body: "Response credits reward the students who answer other people's research." },
              { icon: ShieldCheck, title: "No ads, ever", body: "Your gift is why we never sell student data or attention." },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <item.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-serif text-lg leading-tight">{item.title}</span>
                  <span className="text-sm text-muted-foreground">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
            <Landmark className="h-3.5 w-3.5" /> Charged securely in Ghana Cedis. A tax receipt lands in your inbox
            straight after payment.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-border bg-card p-6 shadow-paper sm:p-8"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Pledge form</p>
          <h2 className="mt-1 font-serif text-3xl">Choose your gift</h2>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {DONATION_PRESETS_GHS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  preset === p
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                <span className="block font-serif text-2xl leading-none">{formatGhs(p)}</span>
                <span className={`mt-1 block text-[11px] leading-snug ${preset === p ? "opacity-80" : "text-muted-foreground"}`}>
                  {PRESET_BLURBS[p]}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPreset("custom")}
            className={`mt-3 w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
              preset === "custom" ? "border-primary bg-secondary" : "border-border bg-background hover:border-primary/50"
            }`}
          >
            Give what you can — any amount
          </button>

          {preset === "custom" && (
            <div className="mt-3">
              <Label htmlFor="custom-amount" className="text-xs uppercase tracking-wider text-muted-foreground">
                Your amount (GHS)
              </Label>
              <Input
                id="custom-amount"
                inputMode="decimal"
                autoFocus
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="e.g. 12"
                className="mt-1"
              />
            </div>
          )}

          <div className="mt-6 flex rounded-full border border-border bg-background p-1">
            {(
              [
                { key: "one_time" as const, label: "One-time" },
                { key: "monthly" as const, label: "Monthly" },
              ]
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFrequency(opt.key)}
                className={`flex-1 rounded-full px-4 py-2 text-sm transition ${
                  frequency === opt.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.key === "monthly" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Repeat className="h-3.5 w-3.5" /> {opt.label}
                  </span>
                ) : (
                  opt.label
                )}
              </button>
            ))}
          </div>
          {frequency === "monthly" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Charged every month until you cancel. You can stop any time by replying to your receipt.
            </p>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="donor-name" className="text-xs uppercase tracking-wider text-muted-foreground">
                Name on the receipt
              </Label>
              <Input id="donor-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="donor-email" className="text-xs uppercase tracking-wider text-muted-foreground">
                Email for the receipt
              </Label>
              <Input
                id="donor-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="donor-message" className="text-xs uppercase tracking-wider text-muted-foreground">
                Note to the team
              </Label>
              <Textarea
                id="donor-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                placeholder="Optional"
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <Button type="submit" disabled={busy || !valid} className="mt-6 w-full rounded-full" size="lg">
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
              </span>
            ) : (
              `Give ${valid ? formatGhs(amount) : "—"}${frequency === "monthly" ? " / month" : ""}`
            )}
          </Button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Secure payment. Receipt emailed instantly.
          </p>
        </form>
      </div>
    </div>
  );
}
