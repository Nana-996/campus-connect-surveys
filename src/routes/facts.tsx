import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  Coins,
  Globe2,
  Mail,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const URL = "https://campus-verify.live/facts";
const TITLE = "CampusVerify Facts — Verified research survey platform";
const DESCRIPTION =
  "Verified facts about CampusVerify: its research survey tools, audiences, academic email verification, credits, privacy boundaries, operator, and official contact details.";

const facts = [
  {
    icon: Users,
    title: "Who it serves",
    text: "Students, lecturers, professional and independent researchers, NGOs, companies, institutions, and community respondents.",
  },
  {
    icon: BadgeCheck,
    title: "How verification works",
    text: "Every account confirms an email address. Student accounts must also use a recognised academic email domain; General/Researcher accounts support wider research and participation.",
  },
  {
    icon: Target,
    title: "Audience controls",
    text: "Researchers can choose campus-specific, student, everyone, or private invite-only participation. Eligible studies can also target department, year, country, age range, and interests.",
  },
  {
    icon: Coins,
    title: "Credit model",
    text: "Answering an eligible survey earns one research credit. Credits are spent to publish surveys. Sign-up credits do not expire: 10 for students, 50 for partner-school students, and 5 for General/Researcher accounts.",
  },
  {
    icon: Building2,
    title: "School partnerships",
    text: "Partner schools can use permanent co-branded joining links, school administration tools, and privacy-limited response tracking. Academic email domains—not a joining URL—determine student eligibility and partner benefits.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy boundary",
    text: "Survey owners receive answers, not hidden account identities. School-assisted tracking exposes only eligible students’ index numbers, departments, and response state—not names, emails, answers, or submission times.",
  },
];

const faq = [
  {
    question: "What is CampusVerify?",
    answer:
      "CampusVerify is a published, credit-powered online survey platform for academic, professional, organisational, and community research. It connects researchers with relevant registered respondents, including academically verified students.",
  },
  {
    question: "Is CampusVerify only for students?",
    answer:
      "No. Students are one audience, with academic-email verification and campus-specific features. General/Researcher accounts are available for lecturers, professional and independent researchers, NGOs, companies, institutions, and community respondents.",
  },
  {
    question: "Does CampusVerify guarantee that every response is bot-free?",
    answer:
      "CampusVerify requires a person to authenticate an account and uses academic-email checks for student status. It does not claim to prove how a person prepared every answer or to detect every possible use of automation.",
  },
  {
    question: "Who operates CampusVerify?",
    answer:
      "CampusVerify is operated by Vibe Tribe Organisation in Ghana. Its official website is campus-verify.live and its main contact email is campusverify996@gmail.com.",
  },
];

export const Route = createFileRoute("/facts")({
  component: FactsPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { property: "og:image", content: "https://campus-verify.live/logo-mark.png" },
      { name: "twitter:image", content: "https://campus-verify.live/logo-mark.png" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "@id": "https://campus-verify.live/#software",
          name: "CampusVerify",
          url: "https://campus-verify.live",
          description:
            "A credit-powered survey platform for academic, professional, organisational, and community research, with academically verified student audiences and registered General/Researcher accounts.",
          applicationCategory: "EducationalApplication",
          applicationSubCategory: "Research survey platform",
          operatingSystem: "Web",
          browserRequirements: "Requires a modern web browser",
          image: "https://campus-verify.live/logo-mark.png",
          publisher: { "@id": "https://campus-verify.live/#organization" },
          audience: [
            { "@type": "Audience", audienceType: "Students" },
            { "@type": "Audience", audienceType: "Researchers" },
            { "@type": "Audience", audienceType: "Organisations" },
            { "@type": "Audience", audienceType: "Community respondents" },
          ],
          featureList: [
            "Academic email verification for student accounts",
            "Campus-specific and public survey audiences",
            "Department, year, country, age-range, and interest targeting",
            "Private invite-only surveys",
            "Research credit exchange",
            "Survey analytics, data export, and report building",
            "School partnership and privacy-limited response tracking tools",
          ],
          offers: { "@type": "Offer", price: "0", priceCurrency: "GHS", description: "Accounts include permanent sign-up research credits." },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }),
      },
    ],
  }),
});

function FactsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2 font-serif text-2xl text-primary">
          <img src="/logo-mark.png" alt="" width={28} height={28} className="h-7 w-7" />
          CampusVerify
        </Link>
        <Link to="/">
          <Button variant="ghost" className="rounded-full">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back home
          </Button>
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="border-b border-foreground/10 py-12 sm:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-highlight-foreground">
            <BookOpenCheck className="h-3 w-3" /> Official reference
          </span>
          <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[0.95] tracking-tight sm:text-6xl">
            Facts about <em className="text-primary">CampusVerify.</em>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            A concise, citable description of the platform, who it serves, and how its research tools work. These facts apply to the official website at campus-verify.live.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Last reviewed 2 October 2026
          </p>
        </section>

        <section className="py-14" aria-labelledby="at-a-glance">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">At a glance</p>
          <h2 id="at-a-glance" className="mt-3 font-serif text-3xl sm:text-4xl">What the platform does</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-foreground/15 bg-card p-6 shadow-paper">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-serif text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-foreground/10 py-14" aria-labelledby="identity">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Official identity</p>
          <h2 id="identity" className="mt-3 font-serif text-3xl sm:text-4xl">Canonical details</h2>
          <dl className="mt-8 divide-y divide-foreground/10 border-y border-foreground/10">
            <FactRow label="Product" value="CampusVerify" />
            <FactRow label="Category" value="Online research and survey platform" />
            <FactRow label="Operator" value="Vibe Tribe Organisation" />
            <FactRow label="Country" value="Ghana" />
            <FactRow label="Official website" value={<a href="https://campus-verify.live" className="font-semibold text-primary underline">campus-verify.live</a>} />
            <FactRow label="Contact" value={<a href="mailto:campusverify996@gmail.com" className="font-semibold text-primary underline">campusverify996@gmail.com</a>} />
            <FactRow label="Availability" value="Published web application" />
          </dl>
        </section>

        <section className="border-t border-foreground/10 py-14" aria-labelledby="accuracy">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Accuracy notes</p>
          <h2 id="accuracy" className="mt-3 font-serif text-3xl sm:text-4xl">What CampusVerify does—and does not—verify</h2>
          <div className="mt-6 max-w-3xl space-y-4 text-base leading-relaxed text-muted-foreground">
            <p>
              Student status is based on a confirmed, recognised academic email domain. This supports campus and student audience controls. General/Researcher accounts confirm an email but are not presented as academically verified students.
            </p>
            <p>
              CampusVerify requires authenticated accounts and applies response-quality safeguards. It does not claim to prove how every respondent prepared an answer, guarantee every research result, or detect every possible use of automation.
            </p>
            <p>
              Research quality still depends on questionnaire design, sample selection, ethics, interpretation, and the claims a researcher makes from the resulting data.
            </p>
          </div>
        </section>

        <section className="border-t border-foreground/10 py-14" aria-labelledby="sources">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Primary sources</p>
          <h2 id="sources" className="mt-3 font-serif text-3xl sm:text-4xl">Read the supporting pages</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <SourceLink to="/about" icon={<Globe2 />} title="About the platform" text="Purpose, verification model, research workflow, and technology." />
            <SourceLink to="/pricing" icon={<Coins />} title="Credits and pricing" text="Current account credits, publishing tiers, and purchase options." />
            <SourceLink to="/privacy" icon={<ShieldCheck />} title="Privacy policy" text="How personal information and survey responses are handled." />
            <SourceLink to="/privacy-audit" icon={<BadgeCheck />} title="Privacy & security audit" text="Documented protections, boundaries, and current limitations." />
            <SourceLink to="/schools" icon={<Building2 />} title="School partnerships" text="Institutional onboarding, campus access, and partnership options." />
            <SourceLink to="/blog/academic-research-surveys" icon={<BookOpenCheck />} title="Academic survey guide" text="Practical guidance for designing and running research surveys." />
          </div>
        </section>

        <section className="rounded-2xl bg-primary p-8 text-primary-foreground sm:p-10">
          <Mail className="h-6 w-6" />
          <h2 className="mt-3 font-serif text-3xl">Need to verify a detail?</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed opacity-80">
            Journalists, institutions, researchers, directories, and AI services can contact the CampusVerify team for clarification.
          </p>
          <a href="mailto:campusverify996@gmail.com" className="mt-6 inline-flex rounded-full bg-highlight px-5 py-2.5 text-sm font-semibold text-highlight-foreground">
            Email CampusVerify
          </a>
        </section>
      </main>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
      <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

type SourcePath = "/about" | "/pricing" | "/privacy" | "/privacy-audit" | "/schools" | "/blog/academic-research-surveys";

function SourceLink({ to, icon, title, text }: { to: SourcePath; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link to={to} className="group rounded-2xl border border-foreground/15 bg-card p-5 shadow-paper transition hover:border-primary/40">
      <div className="text-primary [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      <h3 className="mt-3 font-serif text-xl group-hover:text-primary">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </Link>
  );
}