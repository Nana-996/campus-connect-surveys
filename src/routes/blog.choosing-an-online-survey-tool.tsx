import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://campus-verify.live/blog/choosing-an-online-survey-tool";
const TITLE = "Choosing an Online Survey Tool for Research: What Actually Matters";
const DESC =
  "How to pick the best online survey tool for academic and professional research: respondent verification, audience targeting, data quality, and cost compared.";

export const Route = createFileRoute("/blog/choosing-an-online-survey-tool")({
  component: GuidePage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESC,
          author: { "@type": "Organization", name: "CampusVerify" },
          publisher: { "@type": "Organization", name: "CampusVerify" },
          mainEntityOfPage: URL,
          datePublished: "2026-10-02",
          dateModified: "2026-10-02",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "What is the best online survey tool for academic research?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "The best tool depends on your respondents. For campus research, choose a platform that verifies respondents through academic email and lets you target by department and year — like CampusVerify. For general public polls, any major form tool works, but you must screen respondents yourself.",
              },
            },
            {
              "@type": "Question",
              name: "What features matter most in a research survey tool?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "In order: respondent verification (are answers from real, eligible people?), audience targeting (can you reach exactly your population?), data export (can you analyse results properly?), and cost structure (free credits, subscriptions, or per-response fees).",
              },
            },
            {
              "@type": "Question",
              name: "Are free survey tools good enough for research?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Free form builders are fine for collecting answers, but they provide no respondents and no verification — you distribute the link yourself and cannot control who answers. For research that needs a defined population, use a platform with a verified respondent pool.",
              },
            },
          ],
        }),
      },
    ],
  }),
});

function GuidePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Guide</p>
      <h1 className="mt-3 font-serif text-5xl leading-[0.95]">Choosing an Online Survey Tool for Research</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Most survey tools are form builders. Research needs more than forms — it needs the right people answering. Here's what to evaluate before you commit.
      </p>

      <section className="prose prose-neutral mt-10 max-w-none">
        <h2>The four things that actually matter</h2>
        <ol>
          <li><strong>Respondent verification.</strong> Can the platform prove answers come from real, eligible people? A form link shared online can be answered by anyone — or anything. For academic and market research, unverified responses are the number-one cause of unusable data.</li>
          <li><strong>Audience targeting.</strong> Can you reach exactly your population — a specific campus, department, year group, country, or age range — or do you just get "whoever clicks"?</li>
          <li><strong>Data quality controls.</strong> Duplicate-response prevention, completion tracking, and response-time signals matter more than pretty charts.</li>
          <li><strong>Cost structure.</strong> Per-response fees, subscriptions, and credit systems suit different budgets. Know what 200 responses actually cost before you start.</li>
        </ol>

        <h2>The three types of survey tool</h2>
        <h3>1. Form builders (Google Forms, Typeform, and similar)</h3>
        <p>
          Great for collecting answers from people you already reach — your class, your mailing list, your customers. They provide no respondents and no verification, so for research beyond your own network you carry the full burden of finding and screening participants.
        </p>

        <h3>2. Panel providers</h3>
        <p>
          Companies that sell access to paid respondent panels. You get volume and demographic targeting, but per-response pricing adds up fast, and panel quality varies — professional survey-takers clicking through for payment are a known data-quality problem in academic literature.
        </p>

        <h3>3. Verified-community platforms (like CampusVerify)</h3>
        <p>
          A newer model: a community where respondents are verified (students through their academic email) and motivated by a credit system rather than cash. You publish a survey, the platform shows it to matching verified members, and members earn credits for quality answers — credits they spend to run their own research. The result is a defined, verified population at a fraction of panel pricing.
        </p>

        <h2>Which one is right for you?</h2>
        <ul>
          <li><strong>Class poll or event feedback?</strong> A free form builder is enough.</li>
          <li><strong>Academic research on students?</strong> You need campus verification and department targeting — that's exactly what CampusVerify is built for.</li>
          <li><strong>Market research on the general public?</strong> Use a platform with a verified public audience, or a panel provider if budget allows.</li>
          <li><strong>Thesis or dissertation survey?</strong> Prioritise verification and a paper trail of who was eligible — examiners ask.</li>
        </ul>

        <h2>Questions to ask before choosing</h2>
        <ul>
          <li>How does the platform verify that respondents are who they claim to be?</li>
          <li>Can I target the exact population my research is about?</li>
          <li>What stops the same person answering twice?</li>
          <li>What will my target number of responses cost, in total?</li>
          <li>Can I export raw data for analysis?</li>
        </ul>

        <h2>Try the verified approach</h2>
        <p>
          <Link to="/signup" className="font-semibold text-primary underline">Sign up for CampusVerify</Link> — verified student and public respondents, campus and department targeting, and a credit system where answering surveys pays for publishing your own. See <Link to="/pricing" className="font-semibold text-primary underline">pricing</Link> or read <Link to="/blog/academic-research-surveys" className="font-semibold text-primary underline">how to run an academic research survey</Link>.
        </p>
      </section>
    </main>
  );
}
