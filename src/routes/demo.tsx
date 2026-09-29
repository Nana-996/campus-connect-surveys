import { createFileRoute, Link } from "@tanstack/react-router";
import { LeadForm } from "@/components/LeadForm";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Request a demo — CampusVerify" },
      { name: "description", content: "Book a walkthrough of CampusVerify for your research team, NGO, company or department." },
      { property: "og:title", content: "Request a CampusVerify demo" },
      { property: "og:description", content: "See how CampusVerify collects verified survey responses from real students and researchers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Demo</p>
      <h1 className="mt-1 font-serif text-5xl leading-[0.95]">See CampusVerify in action.</h1>
      <p className="mt-3 text-muted-foreground">Tell us about your research and we'll set up a short walkthrough.</p>
      <div className="mt-8"><LeadForm kind="demo" /></div>
      <p className="mt-6 text-sm text-muted-foreground">Representing a school? <Link to="/schools" className="underline">Register your school</Link>.</p>
    </main>
  );
}
