import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Coins,
  FileText,
  GraduationCap,
  Search,
  ShieldCheck,
  Smartphone,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/guide")({
  component: GuidePage,
  head: () => ({
    meta: [
      { title: "CampusVerify — User Onboarding Guide" },
      {
        name: "description",
        content: "A practical step-by-step guide for using CampusVerify.",
      },
      { name: "robots", content: "noindex" },
      {
        property: "og:url",
        content: "https://campus-verify.live/guide",
      },
    ],
    links: [{ rel: "canonical", href: "https://campus-verify.live/guide" }],
  }),
});

const sections = [
  {
    number: "01",
    title: "Create the right account",
    text: "Choose Student for verified campus access or General for public and research surveys. Students need an academic email, university, department, year, and student number.",
    Icon: GraduationCap,
  },
  {
    number: "02",
    title: "Verify and complete your profile",
    text: "Confirm the verification link sent to your email, then review your department, year, interests, and profile details. Accurate information helps relevant surveys find you.",
    Icon: UserCheck,
  },
  {
    number: "03",
    title: "Use the feed",
    text: "The feed displays available surveys. Use the filters to narrow results by department, year, country, age range, or interests. Open a survey only when you meet its stated criteria.",
    Icon: Search,
  },
  {
    number: "04",
    title: "Earn and use credits",
    text: "Complete eligible surveys to earn credits. Answering has daily and weekly limits, and earned credits expire after 30 days. Your sign-up credits do not expire.",
    Icon: Coins,
  },
  {
    number: "05",
    title: "Create a survey",
    text: "Add questions, choose an audience, set a response goal, and select the right tier. Start with a smaller audience until you are comfortable using the targeting tools.",
    Icon: FileText,
  },
  {
    number: "06",
    title: "Track responses",
    text: "Open My Surveys to monitor response progress, review results, and export available data. Follow the progress from one place instead of managing surveys separately.",
    Icon: ShieldCheck,
  },
  {
    number: "07",
    title: "Install and return easily",
    text: "Use Add to Home Screen or Install App from the browser menu to save CampusVerify on your device. You can also bookmark this guide for a quick refresher.",
    Icon: Smartphone,
  },
];

function GuidePage() {
  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#1a3a2a]">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-8">
        <header className="flex items-center justify-between gap-3">
          <Link to="/feed" className="inline-flex items-center gap-2 text-sm font-bold">
            <span className="h-2 w-2 rounded-full bg-[#b8e04a]" />
            Campus<span className="text-[#5f7b43]">Verify</span>
          </Link>
          <Link
            to="/feed"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#1a3a2a]/20 bg-white/40 px-4 text-sm font-semibold transition hover:border-[#1a3a2a]/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
        </header>

        <section className="mt-8 grid overflow-hidden rounded-[28px] bg-[#1a3a2a] lg:grid-cols-[1fr_320px]">
          <div className="px-6 py-8 sm:px-10 sm:py-12 lg:px-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#b8e04a]">
              CampusVerify guide
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.05] text-[#f5f0e8] sm:text-5xl lg:text-6xl">
              A clear way to get started.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#f5f0e8]/75 sm:text-base">
              Follow these practical steps to verify your account, find surveys, earn credits, and
              publish research. No slides or timed walkthrough required.
            </p>
            <Link
              to="/feed"
              className="mt-7 inline-flex h-11 items-center rounded-full bg-[#b8e04a] px-5 text-sm font-bold text-[#1a3a2a]"
            >
              Open my feed
            </Link>
          </div>

          <aside className="border-t border-[#f5f0e8]/10 px-6 py-6 sm:px-10 lg:border-l lg:border-t-0 lg:px-8 lg:py-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#b8e04a]">
              Quick checklist
            </p>
            <ul className="mt-4 space-y-3 text-sm text-[#f5f0e8]/80">
              {[
                "Verify your email",
                "Complete your profile",
                "Choose relevant surveys",
                "Track your results",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#b8e04a]" />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {sections.map((section) => {
            const SectionIcon = section.Icon;
            return (
              <article
                key={section.number}
                className="rounded-[24px] border border-[#1a3a2a]/12 bg-white/55 p-5 sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1a3a2a] text-[#b8e04a]">
                    <SectionIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a3a2a]/45">
                      Step {section.number}
                    </p>
                    <h2 className="mt-1 font-serif text-2xl text-[#1a3a2a]">{section.title}</h2>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-[#1a3a2a]/72">{section.text}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 flex flex-col items-start justify-between gap-5 rounded-[24px] border border-[#1a3a2a]/15 px-5 py-6 sm:flex-row sm:items-center sm:px-7">
          <div>
            <h2 className="font-serif text-2xl">Ready to continue?</h2>
            <p className="mt-1 text-sm text-[#1a3a2a]/65">
              Return to the feed and begin with any survey that matches your profile.
            </p>
          </div>
          <Link
            to="/feed"
            className="inline-flex h-11 shrink-0 items-center rounded-full bg-[#1a3a2a] px-5 text-sm font-bold text-[#f5f0e8]"
          >
            Open CampusVerify
          </Link>
        </section>
      </div>
    </main>
  );
}
