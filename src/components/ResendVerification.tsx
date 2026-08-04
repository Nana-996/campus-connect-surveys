import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";

/**
 * Lets a user re-send the signup confirmation email if it never arrived.
 */
export function ResendVerification({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async () => {
    const target = email.trim();
    if (!target) {
      toast.error("Enter the email you signed up with.");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: target,
        options: { emailRedirectTo: `${window.location.origin}/feed` },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Verification email sent. Check your inbox and spam folder.");
    } catch (err: any) {
      toast.error(err.message ?? "Could not resend the verification email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-foreground/15 bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Didn't get the verification email?
      </p>
      <Label htmlFor="resend-email" className="sr-only">Email</Label>
      <Input
        id="resend-email"
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setSent(false); }}
        placeholder="you@yourschool.edu"
        className="mt-2 h-10 rounded-xl border-foreground/25"
      />
      <Button
        type="button"
        variant="outline"
        className="mt-2 h-10 w-full rounded-full"
        onClick={resend}
        disabled={sending}
      >
        <MailCheck className="mr-2 h-4 w-4" />
        {sending ? "Sending…" : sent ? "Send again" : "Resend verification email"}
      </Button>
    </div>
  );
}

export default ResendVerification;
