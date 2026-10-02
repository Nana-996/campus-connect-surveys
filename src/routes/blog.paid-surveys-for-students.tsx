import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://campus-verify.live/blog/paid-surveys-for-students";
const TITLE = "Paid Surveys for Students: How Research Credits Work on CampusVerify";
const DESC =
  "How students earn research credits by answering verified surveys on CampusVerify — and how those credits pay for publishing your own academic research.";

export const Route = createFileRoute("/blog/paid-surveys-for-students")({
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
              name: "How do students earn from surveys on CampusVerify?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Students earn 1 research credit for each quality survey response they submit. Credits are spent to publish their own surveys, so answering other people's research directly funds your own.",
              },
            },
            {
              "@type": "Question",
              name: "Do sign-up credits expire?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No. Sign-up credits on CampusVerify are permanent — 10 for students at non-partner schools, 50 for students at partner schools, and 5 for General/Researcher accounts.",
              },
            },
            {
              "@type": "Question",
              name: "How is CampusVerify different from paid survey sites?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Paid survey sites pay small cash amounts for consumer opinions. CampusVerify is a research platform: students are verified through their academic email, surveys are real academic and organisational research, and earnings are credits that fund your own research rather than cash.",
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
      <h1 className="mt-3 font-serif text-5xl leading-[0.95]">Paid Surveys for Students: How Research Credits Work</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        If you've searched for paid surveys as a student, you've seen the usual sites. CampusVerify works differently — and for student researchers, the difference matters.
      </p>

      <section className="prose prose-neutral mt-10 max-w-none">
        <h2>The problem with typical paid survey sites</h2>
        <p>
          Most paid survey platforms are built for consumer market research. You answer questions about products and brands for small cash rewards, and the surveys have nothing to do with your life as a student. They also can't help you when <em>you</em> need responses — for a thesis, a course project, or a dissertation.
        </p>

        <h2>The CampusVerify model: credits, not cash</h2>
        <p>
          CampusVerify is a research platform where the currency is research itself:
        </p>
        <ul>
          <li><strong>Answer surveys, earn credits.</strong> Every quality response you submit earns 1 credit.</li>
          <li><strong>Spend credits to publish.</strong> Publishing your own survey costs credits — so the time you spend answering other people's research directly funds responses to yours.</li>
          <li><strong>Everyone is verified.</strong> Students sign up with their academic email, so campus surveys are answered by real students of that campus — not random internet users or bots.</li>
        </ul>

        <h2>What you get when you sign up</h2>
        <ul>
          <li><strong>Students at partner schools:</strong> 50 permanent sign-up credits.</li>
          <li><strong>Students at other schools:</strong> 10 permanent sign-up credits.</li>
          <li><strong>General/Researcher accounts:</strong> 5 permanent sign-up credits.</li>
        </ul>
        <p>
          Sign-up credits never expire. For most students, the free credits plus a few answered surveys are enough to run a full course-project survey without paying anything.
        </p>

        <h2>Why researchers trust credit-based answers</h2>
        <p>
          Cash attracts professional survey-takers who rush through for payment. Credits attract people who need research responses themselves — they answer carefully because they know what a careless answer does to someone else's data. That's why verified, credit-based communities produce cleaner research data than paid panels.
        </p>

        <h2>How to get started</h2>
        <ol>
          <li><Link to="/signup" className="font-semibold text-primary underline">Sign up</Link> with your academic email and verify it.</li>
          <li>Complete your profile — department, year, and interests — so relevant surveys find you.</li>
          <li>Answer surveys from your feed to earn credits.</li>
          <li>Publish your own survey when you're ready, targeted to exactly the audience your research needs.</li>
        </ol>

        <h2>Ready to earn your first credits?</h2>
        <p>
          <Link to="/signup" className="font-semibold text-primary underline">Create your free account</Link> — or read the <Link to="/guide" className="font-semibold text-primary underline">full onboarding guide</Link> and <Link to="/blog/academic-research-surveys" className="font-semibold text-primary underline">how to run an academic research survey</Link>.
        </p>
      </section>
    </main>
  );
}
