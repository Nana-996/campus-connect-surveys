import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function ResendVerification({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const target = (email || defaultEmail).trim();
    if (!target) {
      toast.error("Enter your email first.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: target,
        options: { emailRedirectTo: `${window.location.origin}/feed` },
      });
      if (error) throw error;
      toast.success("Verification email sent. Check your inbox (and spam).");
    } catch (err: any) {
      toast.error(err.message ?? "Could not resend email");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-semibold text-foreground underline"
      >
        Resend verification email
      </button>
    );
  }

  return (
    <div className="mt-2 flex gap-2">
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="h-10 rounded-xl border-foreground/25 bg-card text-sm"
      />
      <Button type="button" onClick={send} disabled={busy} className="h-10 rounded-full px-4">
        {busy ? "Sending…" : "Send"}
      </Button>
    </div>
  );
}
