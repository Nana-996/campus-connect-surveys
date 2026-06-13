import { useState } from "react";
import { MessageCircle, ArrowUpRight, Headphones, Copy, Check, QrCode } from "lucide-react";

export const WHATSAPP_INVITE_CODE = "IU9duPqSXvG7Qb2U9IIoR3";
export const WHATSAPP_SUPPORT_URL = `https://chat.whatsapp.com/${WHATSAPP_INVITE_CODE}`;
// QR encoding of the invite URL — works even when the link is blocked in a browser
export const WHATSAPP_QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
  WHATSAPP_SUPPORT_URL,
)}`;

function CopyLinkButton({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard?.writeText(WHATSAPP_SUPPORT_URL).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
      className={`inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:bg-background ${className}`}
      aria-label="Copy WhatsApp support link"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-[#128C7E]" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

export function SupportCard({
  variant = "default",
}: {
  variant?: "default" | "compact" | "floating";
}) {
  if (variant === "floating") {
    return (
      <a
        href={WHATSAPP_SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-lg transition hover:scale-105 hover:shadow-xl sm:bottom-6 sm:right-6"
        aria-label="Open CampusVerify support chat on WhatsApp"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden text-sm font-semibold sm:inline">
          CampusVerify Support
        </span>
      </a>
    );
  }

  if (variant === "compact") {
    return (
      <div className="rounded-2xl border border-foreground/15 bg-card p-4 shadow-paper">
        <a
          href={WHATSAPP_SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Need help?</p>
            <p className="text-xs text-muted-foreground">Chat with us on WhatsApp</p>
          </div>
          <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </a>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-foreground/10 pt-3">
          <span className="truncate text-[11px] text-muted-foreground">
            chat.whatsapp.com/{WHATSAPP_INVITE_CODE.slice(0, 8)}…
          </span>
          <CopyLinkButton />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-foreground/15 bg-card p-6 shadow-paper sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4 sm:flex-1">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/10">
            <Headphones className="h-6 w-6 text-[#25D366]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-2xl leading-tight">
              Need help or have feedback?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Join the CampusVerify student support group on WhatsApp. Get
              answers from the team and fellow students in minutes.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={WHATSAPP_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#128C7E]"
              >
                <MessageCircle className="h-4 w-4" />
                Open in WhatsApp
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <CopyLinkButton />
            </div>

            <p className="mt-3 break-all text-xs text-muted-foreground">
              If the button is blocked on your network, copy this link and open
              it in WhatsApp directly:{" "}
              <span className="font-mono text-foreground/80">
                {WHATSAPP_SUPPORT_URL}
              </span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2 self-center rounded-2xl border border-foreground/10 bg-background/60 p-3 sm:self-start">
          <img
            src={WHATSAPP_QR_URL}
            alt="Scan to join CampusVerify support on WhatsApp"
            width={120}
            height={120}
            className="h-[120px] w-[120px] rounded-lg"
            loading="lazy"
          />
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <QrCode className="h-3 w-3" /> Scan with your phone
          </span>
        </div>
      </div>
    </div>
  );
}
