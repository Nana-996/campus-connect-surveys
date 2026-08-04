import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ShieldCheck,
  Database,
  Coins,
  Users,
  Wifi,
  FileBarChart,
  Lock,
  GitBranch,
  Layers,
  Sparkles,
  GraduationCap,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About CampusVerify — Project overview & architecture" },
      {
        name: "description",
        content:
          "An academic overview of CampusVerify: the problem, the solution, system architecture, security model, and credit economy that power campus-scoped surveys.",
      },
      { property: "og:title", content: "About CampusVerify — Project overview" },
      {
        property: "og:description",
        content:
          "How CampusVerify uses academic email verification, row-level security, and a credit economy to deliver trustworthy student surveys.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://campus-verify.live/about" },
    ],
  }),
});

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-foreground/10 py-16">
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </span>
      <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">{title}</h2>
      <div className="mt-6 max-w-3xl space-y-4 text-base leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Pillar({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-foreground/15 bg-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-serif text-xl text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-serif text-2xl text-primary">
          CampusVerify
        </Link>
        <Link to="/">
          <Button variant="ghost" className="rounded-full">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back home
          </Button>
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        {/* Hero */}
        <section className="py-12 sm:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-highlight-foreground">
            <GraduationCap className="h-3 w-3" /> Project overview
          </span>
          <h1 className="mt-5 font-serif text-5xl leading-[0.95] tracking-tight sm:text-6xl">
            A campus-scoped survey platform built for{" "}
            <em className="text-primary">trustworthy research.</em>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            CampusVerify is a final-year project that helps university students run honest,
            verified surveys without paying for panels. This page documents the problem we
            tackled, the system we built, and the design decisions we made — at the level of
            detail an academic evaluator needs.
          </p>
        </section>

        {/* Problem */}
        <Section id="problem" eyebrow="The problem" title="Student research is broken in two ways.">
          <p>
            <strong className="text-foreground">Data quality.</strong> Free survey tools allow
            anyone to respond. A dissertation about engineering students at a Ghanaian
            university can end up answered by bots, click-farms, or strangers from another
            continent — invalidating the dataset.
          </p>
          <p>
            <strong className="text-foreground">Access &amp; cost.</strong> Paid panels are
            unaffordable for undergraduates, and social-media recruiting depends on the
            researcher's personal network. Students with smaller networks systematically get
            less data.
          </p>
        </Section>

        {/* Solution */}
        <Section
          id="solution"
          eyebrow="The solution"
          title="A credit-powered feed of verified classmates."
        >
          <p>
            CampusVerify gates participation on a <strong className="text-foreground">verified
            academic email</strong> (<code>.edu</code>, <code>.edu.gh</code>, <code>.ac.uk</code>,{" "}
            etc.). The email's domain defines a student's campus, and surveys are scoped to
            that campus by default. Researchers can also opt-in to a wider public audience for
            general-interest studies.
          </p>
          <p>
            Instead of money, the platform runs on a{" "}
            <strong className="text-foreground">credit economy</strong>: you earn one credit
            for each quality response you give, and spend credits to publish your own surveys.
            This aligns incentives — every researcher is also a respondent.
          </p>
        </Section>

        {/* Core pillars */}
        <Section
          id="pillars"
          eyebrow="Core pillars"
          title="Five concerns drove every design decision."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Pillar icon={ShieldCheck} title="Identity verification">
              Sign-up requires an academic email and confirmation link. We never auto-sign-in;
              the email must be verified before the account is usable.
            </Pillar>
            <Pillar icon={Users} title="Campus scoping">
              Email domain maps to a university. Default audience for any survey is "only your
              campus", protecting both relevance and respondent privacy.
            </Pillar>
            <Pillar icon={Coins} title="Credit economy">
              Publishing costs credits; answering earns them. This funds the platform without
              real money and discourages low-effort surveys.
            </Pillar>
            <Pillar icon={Lock} title="Defense-in-depth security">
              Row-level security on every table, role checks via a security-definer function,
              and database triggers that protect sensitive columns even from the owner.
            </Pillar>
            <Pillar icon={Wifi} title="Offline-first">
              Campus Wi-Fi and mobile data are unreliable. Surveys cache locally so respondents
              can answer without a connection and sync automatically when back online.
            </Pillar>
            <Pillar icon={FileBarChart} title="Report builder">
              Survey owners get a configurable report — cover page, executive summary, per-question
              analysis, owner commentary — exported as a clean PDF document.
            </Pillar>
          </div>
        </Section>

        {/* Architecture */}
        <Section
          id="architecture"
          eyebrow="System architecture"
          title="A modern serverless stack chosen for cost and reliability."
        >
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong className="text-foreground">Frontend:</strong> React 19 + TanStack Start
              (file-based routing, server functions, SSR) on Vite 7, styled with Tailwind CSS
              v4 and shadcn/ui primitives.
            </li>
            <li>
              <strong className="text-foreground">Backend:</strong> Postgres + Supabase Auth
              for identity. Business logic runs as TanStack server functions secured by an
              authentication middleware; webhooks live as server routes.
            </li>
            <li>
              <strong className="text-foreground">Data layer:</strong> Row-Level Security on
              every table. A <code>has_role()</code> security-definer function avoids RLS
              recursion. Triggers protect sensitive columns (credits, user types, survey
              rules) from direct modification.
            </li>
            <li>
              <strong className="text-foreground">Offline:</strong> A service worker caches
              survey payloads; responses queue in IndexedDB and replay on reconnect.
            </li>
            <li>
              <strong className="text-foreground">Hosting:</strong> Edge runtime (Cloudflare
              Workers) — cold-start free, geographically close to Ghanaian users.
            </li>
          </ul>
        </Section>

        {/* Security model */}
        <Section
          id="security"
          eyebrow="Security model"
          title="Trust is enforced in the database, not just the UI."
        >
          <p>
            Every table in the <code>public</code> schema has RLS enabled. Roles are stored in
            a separate <code>user_roles</code> table — never on the profile — and checked via
            <code> has_role(user_id, role)</code>, a <code>SECURITY DEFINER</code> function
            that prevents privilege-escalation attacks common in naive Supabase apps.
          </p>
          <p>
            Sensitive columns (a user's credit balance, a survey's published flag, a profile's
            verification status) cannot be edited via the API even by the row's owner. Database
            triggers reject any attempt; only internal server logic can update them. A
            "speed-trap" trigger flags suspiciously fast responses as fraud, while still
            honouring genuine offline-sync timing.
          </p>
          <p>
            Realtime broadcasts are restricted to a safe column allow-list so sensitive fields
            (email hash, flagging metadata, raw identifiers) are never wired to the websocket.
          </p>
        </Section>

        {/* Engineering */}
        <Section
          id="engineering"
          eyebrow="Engineering practices"
          title="Built to be evaluated, audited, and extended."
        >
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong className="text-foreground">Migrations as source of truth.</strong> Every
              schema change ships as a numbered SQL migration in <code>supabase/migrations/</code>.
            </li>
            <li>
              <strong className="text-foreground">Type-safe routing.</strong> TanStack Router
              generates route types at build time; broken links fail the build, not production.
            </li>
            <li>
              <strong className="text-foreground">Semantic design tokens.</strong> No raw
              colours in components — every shade is a token defined in{" "}
              <code>src/styles.css</code>, giving consistent light/dark behaviour.
            </li>
            <li>
              <strong className="text-foreground">PWA installable.</strong> The app ships a
              manifest and icons; students can install it to their home screen.
            </li>
          </ul>
        </Section>

        {/* For evaluators */}
        <Section
          id="evaluators"
          eyebrow="For evaluators"
          title="How to assess CampusVerify in 10 minutes."
        >
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              <strong className="text-foreground">Create an account</strong> from the home
              page using any academic email; confirm the verification link.
            </li>
            <li>
              <strong className="text-foreground">Open the feed</strong> — it shows surveys
              scoped to your campus, with credit rewards and remaining slots.
            </li>
            <li>
              <strong className="text-foreground">Answer one survey</strong> to earn credits
              and observe the offline indicator (try toggling airplane mode mid-answer).
            </li>
            <li>
              <strong className="text-foreground">Publish your own survey</strong>; spend
              credits, then open the Analytics view to see live results.
            </li>
            <li>
              <strong className="text-foreground">Build a report</strong> from the analytics
              page and export the PDF — this is the artefact a researcher would submit.
            </li>
          </ol>
        </Section>

        {/* CTA */}
        <section className="mt-16 rounded-3xl border border-foreground/15 bg-card p-8 text-center sm:p-12">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <h2 className="mt-3 font-serif text-3xl tracking-tight">
            Try it the way a student would.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            The best evaluation is hands-on. Create a free account, run a survey, and read the
            generated report — the full loop takes about ten minutes.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="h-12 rounded-full bg-primary px-7">
                Create an account
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline" className="h-12 rounded-full border-foreground/30 px-7">
                Back to home
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/10 py-8 text-center text-xs text-muted-foreground">
        CampusVerify · An academic project · <Link to="/privacy" className="underline">Privacy</Link>{" "}
        · <Link to="/terms" className="underline">Terms</Link>
      </footer>
    </div>
  );
}
