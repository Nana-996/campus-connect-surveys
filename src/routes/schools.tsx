import { createFileRoute, Link } from "@tanstack/react-router";
import { LeadForm } from "@/components/LeadForm";

export const Route = createFileRoute("/schools")({
  head: () => ({
    meta: [
      { title: "Partner your school with CampusVerify — Verified campus surveys" },
      { name: "description", content: "Register your school for CampusVerify: verified student respondents for campus research, student survey credits, and a school admin portal with response tracking." },
      { property: "og:title", content: "Partner your school with CampusVerify" },
      { property: "og:description", content: "Register your school's interest in verified campus research on CampusVerify." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://campus-verify.live/schools" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://campus-verify.live/schools" }],
  }),
  component: SchoolsPage,
});

function SchoolsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">For schools</p>
      <h1 className="mt-1 font-serif text-5xl leading-[0.95]">Bring CampusVerify to your school.</h1>
      <p className="mt-3 text-muted-foreground">
        Verified student surveys, 50 starter credits for every student on a school plan, and a portal to see your students, surveys and departments.
      </p>
      <div className="mt-8"><LeadForm kind="school" /></div>
      <p className="mt-6 text-sm text-muted-foreground">Not a school? <Link to="/demo" className="underline">Request a demo</Link> instead.</p>
    </main>
  );
}
