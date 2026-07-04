import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://campus-spotlight-verify.lovable.app/blog/student-perception-surveys";
const TITLE = "Student Perception Surveys: The Complete Guide + Templates";
const DESC =
  "How to design student perception surveys that measure teaching quality, campus climate, and support — with question templates and response tips.";

export const Route = createFileRoute("/blog/student-perception-surveys")({
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
          datePublished: "2026-07-04",
          dateModified: "2026-07-04",
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
              name: "What is a student perception survey?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A student perception survey collects students' first-hand views on teaching quality, learning environment, campus climate, and institutional support. Unlike test scores, it captures how students actually experience their courses and campus.",
              },
            },
            {
              "@type": "Question",
              name: "What questions should a student perception survey include?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Cover four buckets: instruction (clarity, pacing, feedback), engagement (participation, interest), support (advising, mental health, accessibility), and climate (safety, belonging, fairness). Use 1–5 rating scales with one open-text prompt per bucket.",
              },
            },
            {
              "@type": "Question",
              name: "How often should student perception surveys run?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Run course-level perception surveys once per term (mid-term for early adjustments, end-of-term for records). Run campus-climate perception surveys once per academic year so trend lines are comparable.",
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
      <h1 className="mt-3 font-serif text-5xl leading-[0.95]">Student Perception Surveys: The Complete Guide</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        How to design student perception surveys that measure teaching quality, campus climate, and institutional support — with question templates you can copy.
      </p>

      <section className="prose prose-neutral mt-10 max-w-none">
        <h2>What is a student perception survey?</h2>
        <p>
          A student perception survey collects students' first-hand views on the parts of university life that grades and attendance records can't measure: teaching quality, engagement, campus climate, and support services. Institutions use them to evaluate courses, improve programs, and demonstrate accreditation outcomes.
        </p>

        <h2>The four buckets to cover</h2>
        <ol>
          <li><strong>Instruction</strong> — clarity of explanations, pacing, feedback quality, workload fairness.</li>
          <li><strong>Engagement</strong> — participation opportunities, relevance of material, motivation to attend.</li>
          <li><strong>Support</strong> — advising, mental health services, accessibility accommodations, library access.</li>
          <li><strong>Climate</strong> — safety, sense of belonging, fair treatment across identity groups.</li>
        </ol>

        <h2>Question templates</h2>
        <h3>Instruction</h3>
        <ul>
          <li>The instructor explained concepts clearly. (1–5)</li>
          <li>Feedback on my work was timely and useful. (1–5)</li>
          <li>The workload was reasonable given the credit hours. (1–5)</li>
          <li>One thing that would improve how this course is taught: (open text)</li>
        </ul>

        <h3>Engagement</h3>
        <ul>
          <li>I felt motivated to attend this class. (1–5)</li>
          <li>The course material connected to real problems in my field. (1–5)</li>
          <li>I had opportunities to participate meaningfully. (1–5)</li>
        </ul>

        <h3>Support</h3>
        <ul>
          <li>I know where to go for academic advising. (Yes / No / Unsure)</li>
          <li>Mental health support at this university is easy to access. (1–5)</li>
          <li>Accommodations (if requested) were provided promptly. (1–5 / N/A)</li>
        </ul>

        <h3>Climate</h3>
        <ul>
          <li>I feel a sense of belonging on this campus. (1–5)</li>
          <li>Students from all backgrounds are treated fairly here. (1–5)</li>
          <li>I feel safe on campus during the day / at night. (1–5 each)</li>
        </ul>

        <h2>Design principles</h2>
        <ul>
          <li><strong>Keep it under 3 minutes.</strong> Completion rates collapse past that — pick 10–15 questions, not 50.</li>
          <li><strong>Mix scale + open text.</strong> One open-text question per bucket surfaces the "why" behind the ratings.</li>
          <li><strong>Verify respondents.</strong> Anonymous doesn't have to mean unverified — campus-scoped verification (like CampusVerify) strips bots and off-campus randoms without exposing identities.</li>
          <li><strong>Share results back.</strong> Response rates the next term depend on students seeing that last term's answers changed something.</li>
        </ul>

        <h2>How often to run them</h2>
        <p>
          Course-level perception surveys work best twice per term: a short mid-term pulse (5 questions) for early adjustments, and a full end-of-term survey for records. Campus-climate perception surveys run once per academic year so year-over-year trend lines stay comparable.
        </p>

        <h2>Ready to run one?</h2>
        <p>
          <Link to="/create" className="font-semibold text-primary underline">Create a perception survey on CampusVerify</Link> — verified student respondents, campus-scoped by default, and credits so students actually finish it.
        </p>
      </section>
    </main>
  );
}
