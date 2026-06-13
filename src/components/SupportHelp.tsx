import { MessageCircle, ArrowUpRight, Headphones } from "lucide-react";

export const WHATSAPP_SUPPORT_URL =
  "https://chat.whatsapp.com/IU9duPqSXvG7Qb2U9IIoR3";

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
      <a
        href={WHATSAPP_SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-2xl border border-foreground/15 bg-card p-4 shadow-paper transition hover:border-[#25D366]/40"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10">
          <MessageCircle className="h-5 w-5 text-[#25D366]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Need help?</p>
          <p className="text-xs text-muted-foreground">
            Chat with us on WhatsApp
          </p>
        </div>
        <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </a>
    );
  }

  return (
    <a
      href={WHATSAPP_SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-3xl border border-foreground/15 bg-card p-6 shadow-paper transition hover:border-[#25D366]/40 sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/10">
          <Headphones className="h-6 w-6 text-[#25D366]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-2xl leading-tight">
            Need help or have feedback?
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Join the CampusVerify student support group on WhatsApp. Get answers
            from the team and fellow students in minutes.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366]/10 px-4 py-2 text-sm font-semibold text-[#128C7E] transition group-hover:bg-[#25D366]/20">
            <MessageCircle className="h-4 w-4" />
            Open support chat
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </a>
  );
}
