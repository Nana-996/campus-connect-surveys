import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy-audit")({
  component: PrivacyAuditPage,
  head: () => ({
    meta: [
      { title: "Privacy & Security Audit — CampusVerify" },
      { name: "description", content: "CampusVerify's documented privacy and security controls, data flows, limitations, and review date." },
      { property: "og:title", content: "Privacy & Security Audit — CampusVerify" },
      { property: "og:description", content: "A transparent review of CampusVerify's verified safeguards and current limitations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://campus-verify.live/privacy-audit" },
    ],
    links: [{ rel: "canonical", href: "https://campus-verify.live/privacy-audit" }],
  }),
});

const controls = [
  ["Account identity", "Every account requires email confirmation. Student accounts additionally require a recognised academic email domain; General/Researcher accounts are email-confirmed but are not academically verified."],
  ["Data access", "Database access rules separate private account data, survey ownership, responses, administrative tools, and public survey information. Sensitive profile and survey fields are protected from direct user changes."],
  ["Roles", "Administrative, manager, and faculty permissions are stored separately from user profiles and checked by trusted backend functions."],
  ["Survey access", "Survey owners control private invitations and progress access. Invitees must register and accept with the same confirmed email address. Super-admin assistance notifies the survey owner."],
  ["Payments", "Payment confirmation is verified before credits or paid features are granted. CampusVerify does not store full payment-card details."],
  ["Transport and credentials", "Traffic uses encrypted connections. Password handling is delegated to the authentication provider and passwords are not stored in readable form by CampusVerify."],
  ["Data minimisation", "Public pages use limited survey information. Lecturer email addresses and sensitive account fields are not available through ordinary public or signed-in data access."],
];

function PrivacyAuditPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <Link to="/privacy" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">← Privacy Policy</Link>
        <div className="mt-8 flex items-center gap-3 text-primary"><ShieldCheck className="h-8 w-8" /><span className="text-xs font-bold uppercase tracking-[0.2em]">Transparency review</span></div>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[0.95] sm:text-6xl">Privacy &amp; Security Audit</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">A plain-language record of the controls verified in CampusVerify as of 30 September 2026.</p>

        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-serif text-3xl">Scope and status</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">This is an internal product and code review, not an independent certification, legal opinion, penetration test, or claim of complete security. It covers the current website, authentication, database access rules, survey workflows, payments, and app-email triggers.</p>
        </section>

        <section className="mt-10">
          <h2 className="font-serif text-3xl">Verified controls</h2>
          <div className="mt-6 divide-y divide-border border-y border-border">
            {controls.map(([title, body]) => <div key={title} className="grid gap-2 py-5 sm:grid-cols-[12rem_1fr]"><h3 className="font-semibold">{title}</h3><p className="leading-relaxed text-muted-foreground">{body}</p></div>)}
          </div>
        </section>

        <section className="mt-10 border-l-4 border-highlight bg-card p-6">
          <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" /><h2 className="font-serif text-2xl">Important limitations</h2></div>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Email confirmation verifies control of an inbox; it does not prove how a person completes a survey or guarantee that every answer is truthful.</li>
            <li>Academic-domain checks establish eligibility for a student account, not a permanent guarantee of enrolment or identity.</li>
            <li>Survey creators control their questions and may ask respondents for identifying information. Respondents should review each survey before submitting.</li>
            <li>No online service can promise that unauthorized access, human error, service interruption, or abuse will never occur.</li>
            <li>Privacy and security controls require ongoing review as the service, its providers, and legal requirements change.</li>
          </ul>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-serif text-3xl">Data flow</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 leading-relaxed text-muted-foreground">
            <li>Account and profile information is collected during registration and stored in the protected database.</li>
            <li>Survey creators define questions and audiences; eligible respondents submit answers through signed-in accounts or authorised invitation paths.</li>
            <li>Responses are stored for the survey owner’s analysis. Access links and progress permissions are separately controlled.</li>
            <li>Paystack processes checkout details and reports payment status; CampusVerify records the transaction reference and resulting credits or service.</li>
            <li>Expected app emails are sent for account and feature events. The sending domain is not an incoming mailbox.</li>
          </ol>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-serif text-3xl">Contact and review</h2>
          <p className="mt-3 text-muted-foreground">Operator: Vibe Tribe Organisation, Ghana. Privacy or security questions can be sent to <a className="underline" href="mailto:founder@campus-verify.live">founder@campus-verify.live</a>.</p>
          <Button asChild className="mt-6 rounded-full"><Link to="/privacy">Read the Privacy Policy</Link></Button>
        </section>
      </main>
    </div>
  );
}