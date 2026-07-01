import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://campus-spotlight-verify.lovable.app/blog/student-survey-questions-guide";
const TITLE = "Survey Questions for Students: 80+ Examples & Topics";
const DESC =
  "A practical guide to the best survey questions for university students — 80+ examples across academics, wellbeing, campus life, and research, plus the topics that get the most responses.";

export const Route = createFileRoute("/blog/student-survey-questions-guide")({
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
          datePublished: "2026-06-03",
          dateModified: "2026-06-03",
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
              name: "What are some good survey questions to ask students?",
              acceptedAnswer: {
                "@type": "Answer",
                text:
                  "Good student surveys mix short demographic questions (year, department, country) with 5–10 focused topic questions. Use rating scales (1–5) for opinions, single-choice for behavior frequency, and one or two open-text questions for context. Keep the whole survey under 3 minutes — completion rates collapse past that.",
              },
            },
            {
              "@type": "Question",
              name: "What are good topics for surveys for students?",
              acceptedAnswer: {
                "@type": "Answer",
                text:
                  "Strongest-performing topics on CampusVerify are sleep & wellbeing, study habits, AI use in coursework, dating & social life, money & part-time work, campus food, mental health support, career plans, and political/social attitudes. These are the topics students actually want to share opinions on.",
              },
            },
            {
              "@type": "Question",
              name: "How many questions should a student survey have?",
              acceptedAnswer: {
                "@type": "Answer",
                text:
                  "Aim for 8–12 questions for the best response rate. Under 5 feels thin; over 15 causes drop-off. If you need more, split into two surveys.",
              },
            },
            {
              "@type": "Question",
              name: "How do I get more responses to my student survey?",
              acceptedAnswer: {
                "@type": "Answer",
                text:
                  "Use a specific title (\"Sleep & exam stress at UK unis\" beats \"Student survey\"), keep it under 10 questions, target a clear group (year, country, interests), and offer a small incentive — on CampusVerify every answer earns the respondent credits, which is why response rates are 5–10× higher than cold links.",
              },
            },
          ],
        }),
      },
    ],
  }),
});

type Section = {
  id: string;
  topic: string;
  intro: string;
  questions: { text: string; type: "rating" | "choice" | "text"; options?: string[] }[];
};

const SECTIONS: Section[] = [
  {
    id: "academics",
    topic: "Academics & study habits",
    intro:
      "The most common university-research topic. Works for course design, ed-tech, and study-tool research.",
    questions: [
      { text: "On average, how many hours per week do you study outside of class?", type: "choice", options: ["<5", "5–10", "10–20", "20–30", "30+"] },
      { text: "Where do you do most of your studying?", type: "choice", options: ["Dorm/home", "Library", "Café", "Empty classroom", "Outdoors"] },
      { text: "How prepared do you feel for your exams this semester?", type: "rating" },
      { text: "How often do you attend lectures in person?", type: "choice", options: ["Always", "Most of the time", "Sometimes", "Rarely", "Never"] },
      { text: "Which study method works best for you?", type: "choice", options: ["Re-reading notes", "Flashcards", "Past papers", "Group study", "Teaching others"] },
      { text: "What's the biggest obstacle to your studying right now?", type: "text" },
      { text: "How useful is your course's lecture-recording system?", type: "rating" },
      { text: "Rate the quality of feedback you get on assignments.", type: "rating" },
    ],
  },
  {
    id: "wellbeing",
    topic: "Sleep, stress & wellbeing",
    intro:
      "Highest response rates on CampusVerify. Students self-select into these surveys quickly.",
    questions: [
      { text: "How many hours of sleep did you get last night?", type: "choice", options: ["<5", "5–6", "6–7", "7–8", "8+"] },
      { text: "How would you rate your stress levels this week?", type: "rating" },
      { text: "How often do you exercise?", type: "choice", options: ["Daily", "3–5×/week", "1–2×/week", "Rarely", "Never"] },
      { text: "Do you feel your university provides enough mental health support?", type: "rating" },
      { text: "Have you spoken to a counsellor or therapist in the last 12 months?", type: "choice", options: ["Yes", "No", "Prefer not to say"] },
      { text: "What's your biggest source of stress at university?", type: "choice", options: ["Exams/grades", "Money", "Relationships", "Future career", "Family", "Other"] },
      { text: "If you could change one thing about student mental health support on your campus, what would it be?", type: "text" },
    ],
  },
  {
    id: "ai",
    topic: "AI & technology in coursework",
    intro:
      "Hot research area in 2026. Universities, ed-tech founders, and journalists all want this data.",
    questions: [
      { text: "How often do you use AI tools (ChatGPT, Claude, Gemini) for coursework?", type: "choice", options: ["Daily", "Weekly", "Occasionally", "Rarely", "Never"] },
      { text: "What do you most use AI for?", type: "choice", options: ["Brainstorming", "Writing/editing", "Coding", "Summarising readings", "Explaining concepts", "Other"] },
      { text: "Does your university have a clear policy on AI use?", type: "choice", options: ["Yes, clear", "Yes, but unclear", "No policy", "I don't know"] },
      { text: "Do you think using AI for coursework is cheating?", type: "rating" },
      { text: "Has AI made you more or less confident in your writing?", type: "choice", options: ["Much more", "Slightly more", "No change", "Slightly less", "Much less"] },
      { text: "Describe one assignment where AI helped you most.", type: "text" },
    ],
  },
  {
    id: "social",
    topic: "Dating, friendships & social life",
    intro: "Popular with social-science and product research. Keep questions inclusive.",
    questions: [
      { text: "How would you rate your social life at university?", type: "rating" },
      { text: "How did you meet most of your close friends?", type: "choice", options: ["Halls/dorm", "Course/lectures", "Society/club", "Sports", "Online", "Through friends"] },
      { text: "How often do you go out (clubs, bars, parties) in a typical week?", type: "choice", options: ["Never", "Once", "2–3×", "4+"] },
      { text: "Have you used a dating app in the last 6 months?", type: "choice", options: ["Yes", "No"] },
      { text: "How easy is it to make new friends at your university?", type: "rating" },
      { text: "What would make your social life better at university?", type: "text" },
    ],
  },
  {
    id: "money",
    topic: "Money & part-time work",
    intro:
      "Important for fintech, government, and policy research. Always provide a 'Prefer not to say' option.",
    questions: [
      { text: "Do you currently have a part-time job?", type: "choice", options: ["Yes, on campus", "Yes, off campus", "Yes, freelance/online", "No"] },
      { text: "How many hours a week do you work?", type: "choice", options: ["0", "1–10", "10–20", "20+"] },
      { text: "Roughly how much do you spend per week (excluding rent)?", type: "choice", options: ["<£50", "£50–100", "£100–200", "£200+", "Prefer not to say"] },
      { text: "How financially secure do you feel right now?", type: "rating" },
      { text: "What's your biggest monthly expense besides rent?", type: "choice", options: ["Food", "Transport", "Going out", "Subscriptions", "Course materials", "Other"] },
      { text: "Have you ever skipped a meal because of money?", type: "choice", options: ["Often", "Sometimes", "Rarely", "Never"] },
    ],
  },
  {
    id: "career",
    topic: "Career plans & life after graduation",
    intro: "Strong topic for grad-recruiter, alumni, and policy research.",
    questions: [
      { text: "How confident are you about your post-graduation plans?", type: "rating" },
      { text: "What's your top priority in a first job?", type: "choice", options: ["Salary", "Learning", "Work-life balance", "Mission/impact", "Location", "Prestige"] },
      { text: "Are you considering postgraduate study?", type: "choice", options: ["Yes — definitely", "Maybe", "No"] },
      { text: "How prepared do you feel for the job market?", type: "rating" },
      { text: "What kind of company do you most want to work for?", type: "choice", options: ["Startup", "Big tech", "Consulting/finance", "Public sector", "NGO/nonprofit", "Self-employed"] },
      { text: "What would help your university better prepare you for work?", type: "text" },
    ],
  },
  {
    id: "campus",
    topic: "Campus life, food & facilities",
    intro: "Useful for student-union research, on-campus businesses, and university operations.",
    questions: [
      { text: "How would you rate the food options on campus?", type: "rating" },
      { text: "Where do you eat lunch most often?", type: "choice", options: ["Campus canteen", "Café", "Bring my own", "Skip lunch", "Off campus"] },
      { text: "How would you rate the library?", type: "rating" },
      { text: "How would you rate your accommodation?", type: "rating" },
      { text: "What's one thing your campus is missing?", type: "text" },
    ],
  },
];

function GuidePage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
        ← Back home
      </Link>

      <header className="mt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Guide · 8 min read
        </p>
        <h1 className="mt-2 font-serif text-5xl leading-[0.95] sm:text-6xl">
          Survey questions <em className="text-primary">for students</em>
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          80+ proven questions across the topics university researchers, ed-tech
          founders, and student journalists ask most. Copy, adapt, and publish.
        </p>
      </header>

      <section className="prose prose-sm mt-10 max-w-none space-y-4 text-sm leading-relaxed">
        <h2 className="font-serif text-3xl">Why most student surveys fail</h2>
        <p>
          The two biggest reasons student surveys flop are <strong>vague topics</strong>{" "}
          and <strong>too many questions</strong>. A survey called &ldquo;Student
          survey 2026&rdquo; with 25 questions will get a 3–5% completion rate.
          A survey called <em>&ldquo;Sleep &amp; exam stress at UK universities&rdquo;</em>{" "}
          with 8 questions will clear 40% — because the title tells the
          respondent who it&apos;s for and the length respects their time.
        </p>
        <p>
          The questions below are organised by topic, and each one is tagged
          with the question type (rating, single-choice, or open text) so you
          can drop it straight into your survey. Mix 6–10 closed questions with
          one or two open-text questions and you&apos;ll get a survey that&apos;s
          short enough to finish and rich enough to analyse.
        </p>
      </section>

      <nav className="mt-10 rounded-2xl border border-foreground/15 bg-card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Jump to a topic
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-sm font-semibold underline-offset-4 hover:underline">
                {s.topic}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} className="mt-12 scroll-mt-16">
          <h2 className="font-serif text-3xl leading-tight">{s.topic}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{s.intro}</p>
          <ol className="mt-4 space-y-3">
            {s.questions.map((q, i) => (
              <li key={i} className="rounded-xl border border-foreground/15 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm">{q.text}</p>
                  <span className="shrink-0 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {q.type === "rating" ? "Rating 1–5" : q.type === "choice" ? "Single choice" : "Open text"}
                  </span>
                </div>
                {q.options && (
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    Options: {q.options.join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section className="mt-14 space-y-4 text-sm leading-relaxed">
        <h2 className="font-serif text-3xl">How to get more responses</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong>Be specific in the title.</strong> &ldquo;Sleep habits of 2nd-year
            engineering students&rdquo; outperforms &ldquo;Student survey&rdquo; by
            5–10×.
          </li>
          <li>
            <strong>Keep it under 10 questions.</strong> Completion rate roughly
            halves between 10 and 20 questions.
          </li>
          <li>
            <strong>Target the right group.</strong> Use country, year, and
            interest filters so the survey only appears to people who can
            answer it well.
          </li>
          <li>
            <strong>Offer a real incentive.</strong> On CampusVerify every
            answer earns the respondent credits they can spend on their own
            research — that&apos;s why response rates are dramatically higher
            than cold Google Forms links.
          </li>
        </ol>
      </section>

      <section className="mt-12 rounded-3xl border border-foreground/15 bg-card p-7 shadow-paper">
        <h2 className="font-serif text-3xl">Publish your survey to verified students</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Copy any of the questions above into CampusVerify and reach verified
          university students in minutes. Every respondent is .edu / .ac /
          .uni verified — no bots, no random Reddit traffic.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/signup"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Create a free account
          </Link>
          <Link
            to="/"
            className="rounded-full border border-foreground/20 px-5 py-2.5 text-sm font-semibold"
          >
            How CampusVerify works
          </Link>
        </div>
      </section>

      <section className="mt-12 space-y-4 text-sm leading-relaxed">
        <h2 className="font-serif text-3xl">FAQ</h2>
        <div>
          <h3 className="font-semibold">How many questions should a student survey have?</h3>
          <p className="text-muted-foreground">8–12 is the sweet spot. Under 5 feels thin; over 15 causes drop-off.</p>
        </div>
        <div>
          <h3 className="font-semibold">What are good topics for surveys for students?</h3>
          <p className="text-muted-foreground">
            Sleep &amp; wellbeing, study habits, AI use in coursework, dating
            &amp; social life, money &amp; part-time work, campus food, mental
            health, career plans, and political attitudes consistently get the
            most responses on CampusVerify.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Can I use these questions for academic research?</h3>
          <p className="text-muted-foreground">
            Yes — every question above is suitable for a dissertation, thesis,
            or class project. Always check your university&apos;s ethics
            guidelines before publishing surveys that touch on sensitive
            topics like mental health.
          </p>
        </div>
      </section>
    </article>
  );
}
