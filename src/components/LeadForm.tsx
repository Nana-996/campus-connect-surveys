import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitLead } from "@/lib/leads.functions";
import { leadSchema } from "@/lib/lead-schema";

type Kind = "school" | "demo" | "study";

export function LeadForm({ kind }: { kind: Kind }) {
  const send = useServerFn(submitLead);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    try {
      const result = leadSchema.safeParse({ kind, ...f });
      if (!result.success) {
        toast.error(result.error.issues[0]?.message ?? "Check your details.");
        return;
      }
      await send({ data: { kind, ...f } });
      setDone(true);
    } catch (err: any) {
      toast.error(err?.message?.includes("email") ? "Please enter a valid email." : "Could not send. Check the fields and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="rounded-3xl border border-foreground/15 bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 font-serif text-3xl">Thank you.</p>
        <p className="mt-1 text-sm text-muted-foreground">We've received your request and will reply by email shortly.</p>
      </div>
    );

  const school = kind === "school";
  const study = kind === "study";
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-foreground/15 bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="full_name" label="Full name" required max={120} />
        <Field name="email" label={school ? "Work email" : "Email"} type="email" required max={255} />
        {!study && <Field name="organization" label={school ? "School / university" : "Organisation"} required={school} max={160} />}
        {!study && <Field name="role_title" label={school ? "Your role (e.g. Registrar, Dean)" : "Your role"} max={120} />}
        <Field name="phone" label="Phone (optional)" max={40} />
        {!study && <Field name="country" label="Country" max={80} />}
        {study && <Field name="sample_size" label="How many responses do you need? (optional)" max={120} />}
        {study && <div><Label htmlFor="contact_preference">Preferred contact</Label><select id="contact_preference" name="contact_preference" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="phone">Phone</option></select></div>}
        {school && <Field name="student_count" label="Approx. number of students" max={40} />}
      </div>
      <div>
        <Label htmlFor="message">{study ? "Who do you need to hear from, and what is your study about?" : school ? "What would you like CampusVerify to help with?" : "What would you like to see in the demo?"}</Label>
        <Textarea id="message" name="message" maxLength={2000} rows={4} className="mt-1" />
      </div>
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? "Sending…" : study ? "Send study enquiry" : school ? "Register interest" : "Request a demo"}
      </Button>
    </form>
  );
}

function Field({ name, label, type = "text", required, max }: { name: string; label: string; type?: string; required?: boolean; max: number }) {
  return (
    <div>
      <Label htmlFor={name}>{label}{required && " *"}</Label>
      <Input id={name} name={name} type={type} required={required} maxLength={max} className="mt-1" />
    </div>
  );
}
