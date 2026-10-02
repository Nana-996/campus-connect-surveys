import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://campus-verify.live/blog/academic-research-surveys";
const TITLE = "How to Do a Survey for Academic Research: A Practical Guide";
const DESC =
  "Step-by-step guide to running an academic research survey: defining your question, building the questionnaire, finding verified respondents, and analysing results.";

export const Route = createFileRoute("/blog/academic-research-surveys")({
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
              name: "How do you do a survey for academic research?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Start with one specific research question, turn it into 10–15 measurable survey questions, define exactly who should answer, pilot with a small group, then distribute to a verified audience and analyse the responses against your original question.",
              },
            },
            {
              "@type": "Question",
              name: "How long should an academic research survey be?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Under 3 minutes of completion time — roughly 10 to 15 questions. Completion rates drop sharply past that point, and long surveys produce rushed, lower-quality answers.",
              },
            },
            {
              "@type": "Question",
              name: "How do you make a professional academic research survey questionnaire?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Use closed questions with consistent rating scales (1–5), one idea per question, neutral wording without leading phrases, and one or two open-text questions for context. Pilot the questionnaire with 5–10 people before full distribution.",
              },
            },
            {
              "@type": "Question",
              name: "Where can I find respondents for an academic survey?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Survey platforms with verified audiences — such as CampusVerify, where students are verified through their academic email — give more reliable data than posting a link on social media, where anyone (or any bot) can answer.",
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
      <h1 className="mt-3 font-serif text-5xl leading-[0.95]">How to Do a Survey for Academic Research</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        A practical walkthrough for students and researchers: from research question to reliable responses, without the common mistakes that ruin survey data.
      </p>

      <section className="prose prose-neutral mt-10 max-w-none">
        <h2>1. Start with one research question</h2>
        <p>
          Every good academic survey answers exactly one question. "What do students think about campus life?" is too broad. "How do first-year students rate the availability of academic advising?" is researchable. Write your question down — every survey question you add must serve it.
        </p>

        <h2>2. Turn the question into measurable items</h2>
        <p>
          Convert your research question into 10–15 survey questions. Rules that separate professional questionnaires from amateur ones:
        </p>
        <ul>
          <li><strong>One idea per question.</strong> "The lectures were clear and the slides were useful" is two questions disguised as one.</li>
          <li><strong>Consistent scales.</strong> If you use 1–5 agreement scales, use them throughout — mixing scales confuses respondents and complicates analysis.</li>
          <li><strong>Neutral wording.</strong> "How would you rate the library's opening hours?" not "How bad are the library's opening hours?"</li>
          <li><strong>One or two open-text questions.</strong> Ratings tell you what; open text tells you why.</li>
        </ul>

        <h2>3. Define exactly who should answer</h2>
        <p>
          "Students" is not an audience. Which university? Which departments? Which year groups? Academic results only generalise to the population you actually sampled. On CampusVerify you can target by campus, department, year of study, country, age range, and interests — so the people answering match the population your research is about.
        </p>

        <h2>4. Pilot before you publish</h2>
        <p>
          Send the draft to 5–10 people first. Ask them what confused them, where they hesitated, and how long it took. You will always find at least one ambiguous question. Fix it before real responses come in — you cannot edit a survey mid-flight without invalidating earlier answers.
        </p>

        <h2>5. Choose verified respondents over volume</h2>
        <p>
          A link posted on social media collects anyone — including bots, people outside your target population, and the same person twice. For academic work, that data is unusable. Verified-audience platforms solve this: on CampusVerify, student respondents are verified through their academic email, so a campus-scoped survey is answered by actual students of that campus.
        </p>

        <h2>6. Keep it short and respect respondents</h2>
        <p>
          Under 3 minutes is the sweet spot. Completion rates collapse past that, and the people who do finish a long survey are rushing. If you need more data, run two focused surveys instead of one bloated one.
        </p>

        <h2>7. Analyse against your original question</h2>
        <p>
          When responses arrive, go back to the research question from step 1. Report response counts, distributions per question, and the open-text themes. Avoid claiming more than your sample supports — 80 responses from one department describe that department, not the whole university.
        </p>

        <h2>Ready to run yours?</h2>
        <p>
          <Link to="/create" className="font-semibold text-primary underline">Create your research survey on CampusVerify</Link> — verified student and public respondents, audience targeting by department and year, and a credit system that motivates people to actually finish. New to the platform? <Link to="/guide" className="font-semibold text-primary underline">Read the onboarding guide</Link> or see <Link to="/pricing" className="font-semibold text-primary underline">how credits work</Link>.
        </p>
      </section>
    </main>
  );
}
