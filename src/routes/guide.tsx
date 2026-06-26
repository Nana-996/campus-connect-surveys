import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Coins,
  WifiOff,
  Users,
  GraduationCap,
  Sparkles,
  Maximize2,
  Target,
  CheckCircle2,
  Send,
  PenLine,
  ClipboardList,
  UserCheck,
  Star,
  Bell,
  Mail,
  KeyRound,
  LayoutGrid,
  Search,
  BarChart3,
  Lock,
  XCircle,
  Smartphone,
  HelpCircle,
  PlayCircle,
  ListChecks,
  FileText,
  Globe2,
  Compass,
} from "lucide-react";

export const Route = createFileRoute("/guide")({
  component: GuideDeck,
  head: () => ({
    meta: [
      { title: "CampusVerify — User Onboarding Guide" },
      {
        name: "description",
        content:
          "A step-by-step onboarding guide for students, lecturers, and faculty supervisors using CampusVerify.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/* ---------- brand tokens (mirrors /pitch) ---------- */
const C = {
  green: "#1a3a2a",
  greenDeep: "#102218",
  greenSoft: "#234835",
  cream: "#f5f0e8",
  creamSoft: "#e8e0d2",
  lime: "#b8e04a",
  limeDeep: "#9bc436",
  ink: "#0d1f15",
  muted: "rgba(245,240,232,0.72)",
  mutedDark: "rgba(26,58,42,0.72)",
  line: "rgba(245,240,232,0.14)",
  lineDark: "rgba(26,58,42,0.16)",
};

const SERIF = `'Cormorant Garamond', 'Playfair Display', Georgia, serif`;
const SANS = `'Inter', 'Helvetica Neue', system-ui, sans-serif`;

/* ---------- motion ---------- */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 + i * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};
const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: (i: number = 0) => ({
    opacity: 1,
    transition: { delay: 0.1 + i * 0.08, duration: 0.65, ease: "easeOut" },
  }),
};

/* ---------- shared bits ---------- */
function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.28em]"
      style={{ color: dark ? C.green : C.cream, fontFamily: SANS }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: C.lime, boxShadow: `0 0 14px ${C.lime}` }}
      />
      Campus<span style={{ color: dark ? C.green : C.lime }}>Verify</span>
    </div>
  );
}

function Kicker({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <motion.span
      variants={fadeUp}
      custom={0}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em]"
      style={{
        borderColor: dark ? C.lineDark : C.line,
        color: dark ? C.green : C.lime,
        fontFamily: SANS,
      }}
    >
      <Sparkles className="h-3 w-3" /> {children}
    </motion.span>
  );
}

function SlideShell({
  children,
  bg = "cream",
  align = "start",
}: {
  children: React.ReactNode;
  bg?: "green" | "cream";
  align?: "center" | "start";
}) {
  const isGreen = bg === "green";
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: isGreen
          ? `radial-gradient(900px 500px at 12% 8%, rgba(184,224,74,0.10), transparent 60%), radial-gradient(700px 400px at 88% 92%, rgba(184,224,74,0.06), transparent 60%), ${C.green}`
          : C.cream,
        color: isGreen ? C.cream : C.green,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.6) 1px, transparent 0)",
          backgroundSize: "3px 3px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rotate-12 opacity-[0.08]"
        style={{ background: isGreen ? C.lime : C.green, borderRadius: "30%" }}
      />
      <div
        className={`relative flex h-full w-full flex-col px-16 py-14 ${
          align === "center"
            ? "items-center justify-center text-center"
            : "items-start justify-start"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function H({
  children,
  dark = false,
  size = "lg",
}: {
  children: React.ReactNode;
  dark?: boolean;
  size?: "lg" | "md";
}) {
  return (
    <motion.h2
      variants={fadeUp}
      custom={1}
      className={`mt-6 max-w-5xl tracking-tight ${size === "lg" ? "text-[68px] leading-[1.02]" : "text-[52px] leading-[1.05]"}`}
      style={{ fontFamily: SERIF, color: dark ? C.green : C.cream }}
    >
      {children}
    </motion.h2>
  );
}

function Sub({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <motion.p
      variants={fadeUp}
      custom={2}
      className="mt-4 max-w-3xl text-lg leading-relaxed"
      style={{ color: dark ? C.mutedDark : C.muted, fontFamily: SANS }}
    >
      {children}
    </motion.p>
  );
}

/* ============ 1. Welcome / Cover ============ */
const SlideWelcome = () => (
  <SlideShell bg="green" align="center">
    <div className="absolute left-12 top-10">
      <Wordmark />
    </div>
    <Kicker>User onboarding · 2026</Kicker>
    <motion.h1
      variants={fadeUp}
      custom={1}
      className="mt-10 max-w-[1100px] text-[88px] leading-[0.98] tracking-tight"
      style={{ fontFamily: SERIF, color: C.cream }}
    >
      Welcome to <span style={{ color: C.lime, fontStyle: "italic" }}>CampusVerify</span>.
    </motion.h1>
    <motion.p
      variants={fadeUp}
      custom={2}
      className="mt-8 max-w-2xl text-2xl"
      style={{ color: C.muted, fontFamily: SANS, fontWeight: 300 }}
    >
      A short guide to onboarding, earning credits, publishing surveys, and getting real responses
      from real students.
    </motion.p>
    <motion.div
      variants={fadeUp}
      custom={3}
      className="mt-12 flex items-center gap-3 text-xs uppercase tracking-[0.3em]"
      style={{ color: C.muted, fontFamily: SANS }}
    >
      <PlayCircle className="h-4 w-4" style={{ color: C.lime }} /> Press → to begin · F for
      fullscreen
    </motion.div>
  </SlideShell>
);

/* ============ 2. Why not Google Forms ============ */
const SlideWhyNotForms = () => {
  const rows = [
    {
      feat: "Verified student identity",
      us: "Required — university email, department, year, index",
      them: "Anyone with a link",
    },
    {
      feat: "Target specific cohort",
      us: "Department · Year · Interests · University",
      them: "Whoever you can DM",
    },
    {
      feat: "Bot / duplicate protection",
      us: "Account-bound, quality-scored",
      them: "Open form, easy to spam",
    },
    { feat: "Faculty visibility", us: "Supervisors see who responded", them: "None" },
    {
      feat: "Sentiment + keyword analysis",
      us: "Built-in on every open question",
      them: "Manual export to spreadsheet",
    },
    {
      feat: "Cost to reach 200 students",
      us: "3 credits (free to earn)",
      them: "Hours of DMs, group spam",
    },
  ];
  return (
    <SlideShell bg="cream">
      <Kicker dark>Why this — and not Google Forms</Kicker>
      <H dark>The school chose CampusVerify because forms aren't enough anymore.</H>
      <Sub dark>
        Google Forms is a great input box. It is not a respondent network. CampusVerify gives the
        university a closed, verified pool of student researchers so the data your peers collect is
        actually trustworthy.
      </Sub>
      <div
        className="mt-10 w-full max-w-6xl overflow-hidden rounded-2xl border"
        style={{ borderColor: C.lineDark, background: "rgba(26,58,42,0.04)" }}
      >
        <div
          className="grid grid-cols-[1.4fr_1.4fr_1fr] text-xs font-bold uppercase tracking-[0.22em]"
          style={{ color: C.green, background: "rgba(26,58,42,0.08)" }}
        >
          <div className="px-5 py-3">Feature</div>
          <div className="px-5 py-3" style={{ color: C.green }}>
            CampusVerify
          </div>
          <div className="px-5 py-3" style={{ opacity: 0.6 }}>
            Google Forms
          </div>
        </div>
        {rows.map((r, i) => (
          <motion.div
            key={r.feat}
            variants={fadeUp}
            custom={3 + i * 0.5}
            className="grid grid-cols-[1.4fr_1.4fr_1fr] border-t text-[15px]"
            style={{ borderColor: C.lineDark, fontFamily: SANS }}
          >
            <div className="px-5 py-4 font-semibold" style={{ color: C.green }}>
              {r.feat}
            </div>
            <div className="px-5 py-4 flex items-start gap-2" style={{ color: C.green }}>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: C.limeDeep }} />{" "}
              {r.us}
            </div>
            <div className="px-5 py-4 flex items-start gap-2" style={{ color: C.mutedDark }}>
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 opacity-60" /> {r.them}
            </div>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
};

/* ============ 3. Two account types ============ */
const SlideAccountTypes = () => {
  const cards = [
    {
      icon: GraduationCap,
      tag: "Student account",
      sub: "For verified university students",
      bullets: [
        "Sign up with your university email (.edu / .ac.xx)",
        "Add department, year of study, index number",
        "Receive 10 free credits on first verified login",
        "Can publish surveys AND answer surveys",
      ],
      cta: "If you have a school email — choose this.",
    },
    {
      icon: Globe2,
      tag: "General account",
      sub: "For staff, alumni, and the public",
      bullets: [
        "Sign up with any email address",
        "Answer surveys open to the general public",
        "Earn credits, redeem rewards when available",
        "Can publish only general-public surveys",
      ],
      cta: "No school email? Still useful — choose this.",
    },
  ];
  return (
    <SlideShell bg="green">
      <Kicker>Step 1 · Pick your account</Kicker>
      <H>Two accounts. Pick the one that matches you.</H>
      <div className="mt-10 grid w-full grid-cols-2 gap-6">
        {cards.map((c, i) => (
          <motion.div
            key={c.tag}
            variants={fadeUp}
            custom={2 + i}
            className="rounded-2xl border p-7"
            style={{ borderColor: C.line, background: "rgba(245,240,232,0.04)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: C.lime }}
              >
                <c.icon className="h-5 w-5" style={{ color: C.green }} />
              </div>
              <div>
                <div
                  className="text-[11px] font-bold uppercase tracking-[0.25em]"
                  style={{ color: C.lime, fontFamily: SANS }}
                >
                  {c.tag}
                </div>
                <div className="text-lg" style={{ fontFamily: SERIF, color: C.cream }}>
                  {c.sub}
                </div>
              </div>
            </div>
            <ul className="mt-5 space-y-2.5">
              {c.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2 text-[15px]"
                  style={{ color: C.cream, fontFamily: SANS }}
                >
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" style={{ color: C.lime }} />
                  <span style={{ opacity: 0.92 }}>{b}</span>
                </li>
              ))}
            </ul>
            <div
              className="mt-5 rounded-lg px-3 py-2 text-sm italic"
              style={{ background: "rgba(184,224,74,0.1)", color: C.lime, fontFamily: SERIF }}
            >
              {c.cta}
            </div>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
};

/* ============ 4. Signup walkthrough ============ */
const SlideSignup = () => {
  const steps = [
    {
      icon: Mail,
      title: "Enter your email",
      body: "Use your university email exactly as the school issues it. We extract your university automatically from the domain.",
    },
    {
      icon: KeyRound,
      title: "Choose a strong password",
      body: "Minimum 8 characters. We never store it in plain text. Forgotten passwords can be reset from the login screen.",
    },
    {
      icon: CheckCircle2,
      title: "Verify by email link",
      body: "Open the inbox of that email, click the verification link. You are NOT logged in until you verify — this stops fake accounts.",
    },
    {
      icon: UserCheck,
      title: "Complete your profile",
      body: "Department, year of study, index number, and 2-5 interest tags. This is how surveys find you.",
    },
  ];
  return (
    <SlideShell bg="cream">
      <Kicker dark>Step 2 · Sign up & verify</Kicker>
      <H dark>Four steps. About 90 seconds.</H>
      <div className="mt-10 grid w-full grid-cols-4 gap-5">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            variants={fadeUp}
            custom={2 + i}
            className="rounded-2xl border p-5"
            style={{ borderColor: C.lineDark, background: "rgba(255,255,255,0.5)" }}
          >
            <div
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ color: C.limeDeep, fontFamily: SANS }}
            >
              0{i + 1}
            </div>
            <s.icon className="mt-3 h-7 w-7" style={{ color: C.green }} />
            <div className="mt-3 text-xl" style={{ fontFamily: SERIF, color: C.green }}>
              {s.title}
            </div>
            <p
              className="mt-2 text-[14px] leading-snug"
              style={{ color: C.mutedDark, fontFamily: SANS }}
            >
              {s.body}
            </p>
          </motion.div>
        ))}
      </div>
      <motion.p
        variants={fadeUp}
        custom={7}
        className="mt-8 text-sm italic"
        style={{ color: C.mutedDark, fontFamily: SERIF }}
      >
        Didn't get the verification email? Use "Resend verification" on the login screen.
      </motion.p>
    </SlideShell>
  );
};

/* ============ 5. Your feed ============ */
const SlideFeed = () => {
  const items = [
    {
      tag: "Targeting",
      icon: Target,
      body: "You only see surveys that match your department, year, and university. No spam from unrelated cohorts.",
    },
    {
      tag: "Earn credits",
      icon: Coins,
      body: "Each survey you complete pays credits straight into your wallet. Wallet balance is always shown in the header.",
    },
    {
      tag: "Pinned & boosted",
      icon: Star,
      body: "Higher-tier surveys appear pinned at the top with a highlight badge — easier to spot the studies that need responses fast.",
    },
  ];
  return (
    <SlideShell bg="green">
      <Kicker>Step 3 · Your feed</Kicker>
      <H>Open the app — your feed is already filtered for you.</H>
      <Sub>
        The feed is the homepage after login. We auto-target every survey by department, year,
        university, and interest tags. You won't see a third-year Pharmacy survey if you're a
        first-year Law student.
      </Sub>
      <div className="mt-10 grid w-full grid-cols-3 gap-5">
        {items.map((i, idx) => (
          <motion.div
            key={i.tag}
            variants={fadeUp}
            custom={2 + idx}
            className="rounded-2xl border p-6"
            style={{ borderColor: C.line, background: "rgba(245,240,232,0.04)" }}
          >
            <i.icon className="h-7 w-7" style={{ color: C.lime }} />
            <div
              className="mt-4 text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: C.lime, fontFamily: SANS }}
            >
              {i.tag}
            </div>
            <p
              className="mt-2 text-[16px] leading-snug"
              style={{ color: C.cream, fontFamily: SANS }}
            >
              {i.body}
            </p>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
};

/* ============ 6. How credits work ============ */
const SlideCredits = () => {
  const tiers = [
    { name: "Basic", cost: "1", goal: "Up to 50", note: "Casual pulse check, whole campus" },
    { name: "Targeted", cost: "3", goal: "Up to 200", note: "Department + year + interests" },
    { name: "Boosted", cost: "8", goal: "Up to 500", note: "Pinned 72h, cohort badge" },
    { name: "Pro", cost: "15", goal: "Up to 2,000", note: "Top placement 7 days, CSV export" },
  ];
  return (
    <SlideShell bg="cream">
      <Kicker dark>Step 4 · The credit economy</Kicker>
      <H dark>Answer surveys → earn credits → publish your own.</H>
      <Sub dark>
        Every answered survey rewards you. Every survey you publish costs credits — more credits
        means more reach and more responses. You start with <strong>10 free credits</strong> as a
        verified student.
      </Sub>
      <div className="mt-10 grid w-full grid-cols-4 gap-4">
        {tiers.map((t, i) => (
          <motion.div
            key={t.name}
            variants={fadeUp}
            custom={2 + i}
            className="rounded-2xl border p-5"
            style={{ borderColor: C.lineDark, background: "rgba(255,255,255,0.55)" }}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ color: C.limeDeep }}
            >
              {t.name}
            </div>
            <div className="mt-2 text-5xl" style={{ fontFamily: SERIF, color: C.green }}>
              {t.cost}
              <span className="ml-1 text-base" style={{ opacity: 0.6 }}>
                credits
              </span>
            </div>
            <div
              className="mt-2 text-sm font-semibold"
              style={{ color: C.green, fontFamily: SANS }}
            >
              {t.goal} responses
            </div>
            <div className="mt-1 text-[13px]" style={{ color: C.mutedDark, fontFamily: SANS }}>
              {t.note}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p
        variants={fadeUp}
        custom={7}
        className="mt-6 text-sm italic"
        style={{ color: C.mutedDark, fontFamily: SERIF }}
      >
        Earned credits expire after 30 days — keep them flowing by answering regularly.
      </motion.p>
    </SlideShell>
  );
};

/* ============ 7. Bonus credits from admin ============ */
const SlideBonusCredits = () => (
  <SlideShell bg="green">
    <Kicker>Stuck? Ask for a top-up.</Kicker>
    <H>The admin can grant you bonus credits.</H>
    <Sub>
      Need to run a large thesis study but your wallet is short? Contact the platform admin via the
      support link in your Profile page. Admins can issue bonus credits directly to your account —
      useful for accredited research projects, faculty-approved studies, and final-year theses.
    </Sub>
    <div className="mt-10 grid w-full grid-cols-3 gap-5">
      {[
        {
          icon: Bell,
          t: "Request from Profile",
          d: "Profile → 'Request bonus credits' opens a short justification form (study title, sample size, supervisor).",
        },
        {
          icon: UserCheck,
          t: "Supervisor co-signs",
          d: "Your faculty supervisor confirms it's a real, approved study. This protects the credit pool from abuse.",
        },
        {
          icon: Coins,
          t: "Credits land instantly",
          d: "Once approved, the bonus appears in your wallet. You can publish straight away — no payment, no card.",
        },
      ].map((x, i) => (
        <motion.div
          key={x.t}
          variants={fadeUp}
          custom={2 + i}
          className="rounded-2xl border p-6"
          style={{ borderColor: C.line, background: "rgba(245,240,232,0.04)" }}
        >
          <x.icon className="h-7 w-7" style={{ color: C.lime }} />
          <div className="mt-4 text-xl" style={{ fontFamily: SERIF, color: C.cream }}>
            {x.t}
          </div>
          <p className="mt-2 text-[15px] leading-snug" style={{ color: C.muted, fontFamily: SANS }}>
            {x.d}
          </p>
        </motion.div>
      ))}
    </div>
  </SlideShell>
);

/* ============ 8. Creating a survey ============ */
const SlideCreate = () => {
  const steps = [
    {
      icon: PenLine,
      t: "Write",
      d: "Pick a template or start blank. Add multiple choice, scale, or open-ended questions.",
    },
    {
      icon: Target,
      t: "Target",
      d: "Choose departments, year levels, interests, and university scope. The feed engine handles the rest.",
    },
    {
      icon: Coins,
      t: "Tier",
      d: "Pick Basic, Targeted, Boosted, or Pro based on the response volume and reach you need.",
    },
    {
      icon: Send,
      t: "Publish",
      d: "Goes live instantly on Pro, or after a brief moderation check on lower tiers. Track responses in real time.",
    },
  ];
  return (
    <SlideShell bg="cream">
      <Kicker dark>Step 5 · Create a survey</Kicker>
      <H dark>From idea to live in under five minutes.</H>
      <div className="mt-10 grid w-full grid-cols-4 gap-5">
        {steps.map((s, i) => (
          <motion.div
            key={s.t}
            variants={fadeUp}
            custom={2 + i}
            className="rounded-2xl border p-5"
            style={{ borderColor: C.lineDark, background: "rgba(255,255,255,0.5)" }}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ color: C.limeDeep }}
            >
              0{i + 1}
            </div>
            <s.icon className="mt-3 h-7 w-7" style={{ color: C.green }} />
            <div className="mt-3 text-xl" style={{ fontFamily: SERIF, color: C.green }}>
              {s.t}
            </div>
            <p
              className="mt-2 text-[14px] leading-snug"
              style={{ color: C.mutedDark, fontFamily: SANS }}
            >
              {s.d}
            </p>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
};

/* ============ 9. Analyzing results ============ */
const SlideAnalyze = () => {
  const items = [
    {
      icon: BarChart3,
      t: "Live charts",
      d: "Multiple-choice and scale questions render as live bar / donut charts as responses come in.",
    },
    {
      icon: Sparkles,
      t: "Sentiment on open answers",
      d: "Every open-ended answer is auto-scored Positive / Neutral / Negative — no manual coding needed.",
    },
    {
      icon: Search,
      t: "Search + filter responses",
      d: "Open the side drawer to read responses 20 at a time. Search by keyword. Filter by sentiment bucket.",
    },
    {
      icon: FileText,
      t: "Dissertation-ready report",
      d: "Export a PDF with charts, summary stats, and a raw-response appendix. Goes straight into your appendix.",
    },
  ];
  return (
    <SlideShell bg="green">
      <Kicker>Step 6 · Analyze responses</Kicker>
      <H>Real analytics — not a CSV you have to clean yourself.</H>
      <div className="mt-10 grid w-full grid-cols-2 gap-5">
        {items.map((x, i) => (
          <motion.div
            key={x.t}
            variants={fadeUp}
            custom={2 + i}
            className="flex gap-5 rounded-2xl border p-6"
            style={{ borderColor: C.line, background: "rgba(245,240,232,0.04)" }}
          >
            <x.icon className="h-7 w-7 shrink-0" style={{ color: C.lime }} />
            <div>
              <div className="text-xl" style={{ fontFamily: SERIF, color: C.cream }}>
                {x.t}
              </div>
              <p
                className="mt-2 text-[15px] leading-snug"
                style={{ color: C.muted, fontFamily: SANS }}
              >
                {x.d}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
};

/* ============ 10. Faculty supervisors ============ */
const SlideFaculty = () => (
  <SlideShell bg="cream">
    <Kicker dark>For faculty supervisors</Kicker>
    <H dark>Track who has — and hasn't — responded.</H>
    <Sub dark>
      Supervisors get a private dashboard at{" "}
      <code style={{ background: "rgba(26,58,42,0.08)", padding: "1px 6px", borderRadius: 4 }}>
        /manage
      </code>
      . You see participation by department, year, and index number — not the answers themselves.
      Use it to nudge the cohorts that haven't responded so your students get the sample size they
      need.
    </Sub>
    <div
      className="mt-10 w-full max-w-5xl overflow-hidden rounded-2xl border"
      style={{ borderColor: C.lineDark }}
    >
      <div
        className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr] bg-[rgba(26,58,42,0.08)] px-5 py-3 text-xs font-bold uppercase tracking-[0.22em]"
        style={{ color: C.green }}
      >
        <div>Survey</div>
        <div>Department</div>
        <div>Responded</div>
        <div>Pending</div>
      </div>
      {[
        { s: "Mental Health & Academic Pressure", d: "Psychology · Y3", r: "142 / 180", p: "38" },
        { s: "Mobile Money Adoption", d: "Business · Y2", r: "88 / 120", p: "32" },
        { s: "Campus Food Quality", d: "All depts · Y1", r: "311 / 500", p: "189" },
      ].map((r, i) => (
        <motion.div
          key={r.s}
          variants={fadeUp}
          custom={2 + i}
          className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr] border-t px-5 py-4 text-[15px]"
          style={{ borderColor: C.lineDark, color: C.green, fontFamily: SANS }}
        >
          <div className="font-semibold">{r.s}</div>
          <div>{r.d}</div>
          <div style={{ color: C.limeDeep, fontWeight: 600 }}>{r.r}</div>
          <div>{r.p}</div>
        </motion.div>
      ))}
    </div>
    <motion.p
      variants={fadeUp}
      custom={6}
      className="mt-6 text-sm italic"
      style={{ color: C.mutedDark, fontFamily: SERIF }}
    >
      Identities are visible only to authorized supervisors. Answer content stays anonymous to
      everyone, including faculty.
    </motion.p>
  </SlideShell>
);

/* ============ 11. Lecturer evaluations ============ */
const SlideLecturer = () => (
  <SlideShell bg="green">
    <Kicker>For students evaluating teaching</Kicker>
    <H>Evaluate lecturers honestly — anonymously by default.</H>
    <Sub>
      The Lecturers directory lists every lecturer in your university. Open a profile, fill out the
      standard evaluation template (clarity, fairness, engagement, materials, overall), and submit.
      Your identity is never shown to the lecturer or to faculty. Aggregate results help the school
      improve teaching quality term over term.
    </Sub>
    <div className="mt-10 grid w-full grid-cols-3 gap-5">
      {[
        {
          icon: ClipboardList,
          t: "Standard template",
          d: "Same form for every lecturer — fair, comparable, term over term.",
        },
        {
          icon: Lock,
          t: "Anonymous by default",
          d: "Lecturers and supervisors see scores, never your name or index.",
        },
        {
          icon: Star,
          t: "Builds reputation scores",
          d: "Aggregated ratings power lecturer pages and faculty reviews.",
        },
      ].map((x, i) => (
        <motion.div
          key={x.t}
          variants={fadeUp}
          custom={2 + i}
          className="rounded-2xl border p-6"
          style={{ borderColor: C.line, background: "rgba(245,240,232,0.04)" }}
        >
          <x.icon className="h-7 w-7" style={{ color: C.lime }} />
          <div className="mt-3 text-xl" style={{ fontFamily: SERIF, color: C.cream }}>
            {x.t}
          </div>
          <p className="mt-2 text-[15px]" style={{ color: C.muted, fontFamily: SANS }}>
            {x.d}
          </p>
        </motion.div>
      ))}
    </div>
  </SlideShell>
);

/* ============ 12. Privacy & safety ============ */
const SlidePrivacy = () => {
  const points = [
    {
      icon: ShieldCheck,
      t: "Verified, but anonymous",
      d: "We verify you're a real student. Survey publishers never see your name or email — only that you matched their targeting.",
    },
    {
      icon: Lock,
      t: "Answer content is private",
      d: "Open-ended answers are visible to the survey owner only. Faculty supervisors see participation, never content.",
    },
    {
      icon: UserCheck,
      t: "You control your profile",
      d: "Update department, year, interests, or delete your account anytime from Profile settings.",
    },
    {
      icon: XCircle,
      t: "Report bad surveys",
      d: "Found a survey that looks like spam or harassment? Tap report — moderation reviews within 24 hours.",
    },
  ];
  return (
    <SlideShell bg="cream">
      <Kicker dark>Your privacy</Kicker>
      <H dark>Verified identity. Confidential answers.</H>
      <div className="mt-10 grid w-full grid-cols-2 gap-5">
        {points.map((p, i) => (
          <motion.div
            key={p.t}
            variants={fadeUp}
            custom={2 + i}
            className="flex gap-5 rounded-2xl border p-6"
            style={{ borderColor: C.lineDark, background: "rgba(255,255,255,0.5)" }}
          >
            <p.icon className="h-7 w-7 shrink-0" style={{ color: C.limeDeep }} />
            <div>
              <div className="text-xl" style={{ fontFamily: SERIF, color: C.green }}>
                {p.t}
              </div>
              <p className="mt-2 text-[15px]" style={{ color: C.mutedDark, fontFamily: SANS }}>
                {p.d}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
};

/* ============ 13. Offline & mobile ============ */
const SlideOffline = () => (
  <SlideShell bg="green">
    <Kicker>Built for campus reality</Kicker>
    <H>Works offline. Installs like an app.</H>
    <Sub>
      Lost signal walking between lecture halls? Keep answering. Responses queue locally and sync
      the moment you reconnect. Install CampusVerify as a Progressive Web App from your browser — it
      lives on your home screen, no app-store download needed.
    </Sub>
    <div className="mt-10 grid w-full grid-cols-3 gap-5">
      {[
        {
          icon: WifiOff,
          t: "Offline-first",
          d: "Answer surveys without internet. Auto-syncs when back online.",
        },
        {
          icon: Smartphone,
          t: "Installable PWA",
          d: "Add to home screen on Android and iOS — opens fullscreen like a native app.",
        },
        {
          icon: Bell,
          t: "Notifications",
          d: "Get pinged when a targeted survey lands or a response milestone is hit.",
        },
      ].map((x, i) => (
        <motion.div
          key={x.t}
          variants={fadeUp}
          custom={2 + i}
          className="rounded-2xl border p-6"
          style={{ borderColor: C.line, background: "rgba(245,240,232,0.04)" }}
        >
          <x.icon className="h-7 w-7" style={{ color: C.lime }} />
          <div className="mt-3 text-xl" style={{ fontFamily: SERIF, color: C.cream }}>
            {x.t}
          </div>
          <p className="mt-2 text-[15px]" style={{ color: C.muted, fontFamily: SANS }}>
            {x.d}
          </p>
        </motion.div>
      ))}
    </div>
  </SlideShell>
);

/* ============ 14. Tips & best practices ============ */
const SlideTips = () => {
  const tips = [
    "Answer thoughtfully — quality scores affect how many credits you earn.",
    "Target precisely. A Basic survey to the whole campus rarely beats a Targeted survey to the right 200 students.",
    "Keep surveys under 12 questions. Completion rates drop sharply after that.",
    "Use the report drawer to read short open-ended answers first — they're the most actionable.",
    "Refresh your interest tags each semester so the feed stays relevant.",
    "If you're running a thesis study, ask your supervisor to co-sign for bonus credits early.",
  ];
  return (
    <SlideShell bg="cream">
      <Kicker dark>Pro tips</Kicker>
      <H dark>Six habits of successful CampusVerify users.</H>
      <div className="mt-10 grid w-full grid-cols-2 gap-x-10 gap-y-4">
        {tips.map((t, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            custom={2 + i * 0.4}
            className="flex items-start gap-4 border-l-4 py-2 pl-5"
            style={{ borderColor: C.lime }}
          >
            <div
              className="text-3xl leading-none"
              style={{ fontFamily: SERIF, color: C.green, opacity: 0.4 }}
            >
              0{i + 1}
            </div>
            <p className="text-[16px] leading-snug" style={{ color: C.green, fontFamily: SANS }}>
              {t}
            </p>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
};

/* ============ 15. FAQ ============ */
const SlideFAQ = () => {
  const faqs = [
    {
      q: "Is it really free?",
      a: "Yes. You earn credits by answering — no card required. Bonus credits available from the admin for accredited studies.",
    },
    {
      q: "What if my school email isn't recognized?",
      a: "Email support from the login page. We allow-list new institutions weekly.",
    },
    {
      q: "Can lecturers see my answers?",
      a: "No. Only the survey owner sees the responses to their survey. Supervisors see who participated, never what they wrote.",
    },
    {
      q: "How do I delete my account?",
      a: "Profile → Settings → Delete account. We wipe your personal data within 30 days.",
    },
  ];
  return (
    <SlideShell bg="green">
      <Kicker>FAQ</Kicker>
      <H>The questions everyone asks first.</H>
      <div className="mt-10 grid w-full grid-cols-2 gap-5">
        {faqs.map((f, i) => (
          <motion.div
            key={f.q}
            variants={fadeUp}
            custom={2 + i}
            className="rounded-2xl border p-6"
            style={{ borderColor: C.line, background: "rgba(245,240,232,0.04)" }}
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5" style={{ color: C.lime }} />
              <div className="text-lg" style={{ fontFamily: SERIF, color: C.cream }}>
                {f.q}
              </div>
            </div>
            <p className="mt-3 text-[15px]" style={{ color: C.muted, fontFamily: SANS }}>
              {f.a}
            </p>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
};

/* ============ 16. Get started CTA ============ */
const SlideStart = () => (
  <SlideShell bg="cream" align="center">
    <Kicker dark>You're ready.</Kicker>
    <motion.h1
      variants={fadeUp}
      custom={1}
      className="mt-8 max-w-[1100px] text-[80px] leading-[0.98] tracking-tight"
      style={{ fontFamily: SERIF, color: C.green }}
    >
      Now go <em style={{ color: C.limeDeep }}>get the data</em> your research deserves.
    </motion.h1>
    <motion.p
      variants={fadeUp}
      custom={2}
      className="mt-8 max-w-2xl text-xl"
      style={{ color: C.mutedDark, fontFamily: SANS }}
    >
      Sign up · verify · answer five surveys · publish your first study. That's the whole journey.
    </motion.p>
    <motion.div
      variants={fadeUp}
      custom={3}
      className="mt-10 flex flex-wrap items-center justify-center gap-4"
    >
      {[
        { icon: LayoutGrid, t: "Open your feed", d: "/feed" },
        { icon: PenLine, t: "Create a survey", d: "/create" },
        { icon: Compass, t: "Get help", d: "/about" },
      ].map((c, i) => (
        <div
          key={c.t}
          className="flex items-center gap-3 rounded-full border px-5 py-3"
          style={{ borderColor: C.lineDark, background: "rgba(255,255,255,0.6)" }}
        >
          <c.icon className="h-5 w-5" style={{ color: C.green }} />
          <div className="text-left">
            <div className="text-sm font-semibold" style={{ color: C.green, fontFamily: SANS }}>
              {c.t}
            </div>
            <div
              className="text-[11px] uppercase tracking-[0.22em]"
              style={{ color: C.mutedDark, fontFamily: SANS }}
            >
              {c.d}
            </div>
          </div>
        </div>
      ))}
    </motion.div>
    <motion.div
      variants={fadeUp}
      custom={5}
      className="mt-16 flex items-center justify-between gap-10 w-full max-w-3xl"
    >
      <Wordmark dark />
      <span
        className="text-xs uppercase tracking-[0.3em] italic"
        style={{ color: C.mutedDark, fontFamily: SERIF }}
      >
        Made on campus. For campus.
      </span>
    </motion.div>
  </SlideShell>
);

/* ---------- deck ---------- */
const SLIDES = [
  { id: "welcome", render: SlideWelcome },
  { id: "why", render: SlideWhyNotForms },
  { id: "accounts", render: SlideAccountTypes },
  { id: "signup", render: SlideSignup },
  { id: "feed", render: SlideFeed },
  { id: "credits", render: SlideCredits },
  { id: "bonus", render: SlideBonusCredits },
  { id: "create", render: SlideCreate },
  { id: "analyze", render: SlideAnalyze },
  { id: "faculty", render: SlideFaculty },
  { id: "lecturer", render: SlideLecturer },
  { id: "privacy", render: SlidePrivacy },
  { id: "offline", render: SlideOffline },
  { id: "tips", render: SlideTips },
  { id: "faq", render: SlideFAQ },
  { id: "start", render: SlideStart },
];

function GuideDeck() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = SLIDES.length;

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(total - 1, next));
      setDirection(clamped > index ? 1 : -1);
      setIndex(clamped);
    },
    [index, total],
  );

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Home") go(0);
      else if (e.key === "End") go(total - 1);
      else if (e.key.toLowerCase() === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, total, toggleFullscreen]);

  const Current = useMemo(() => SLIDES[index].render, [index]);
  const progress = ((index + 1) / total) * 100;

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-screen overflow-hidden"
      style={{ background: C.greenDeep, fontFamily: SANS }}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={SLIDES[index].id}
          custom={direction}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <motion.div initial="hidden" animate="show" variants={fadeIn} className="h-full w-full">
            <Current />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div
        className="pointer-events-none absolute right-8 top-7 z-20 text-xs font-bold uppercase tracking-[0.3em]"
        style={{
          color: index % 2 === 0 ? C.cream : C.green,
          mixBlendMode: "difference",
          opacity: 0.85,
        }}
      >
        {String(index + 1).padStart(2, "0")}{" "}
        <span style={{ opacity: 0.5 }}>/ {String(total).padStart(2, "0")}</span>
      </div>

      <button
        onClick={() => go(index - 1)}
        disabled={index === 0}
        aria-label="Previous slide"
        className="absolute left-6 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-md transition hover:scale-105 disabled:opacity-20"
        style={{
          borderColor: "rgba(245,240,232,0.4)",
          background: "rgba(13,31,21,0.4)",
          color: C.cream,
        }}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => go(index + 1)}
        disabled={index === total - 1}
        aria-label="Next slide"
        className="absolute right-6 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full transition hover:scale-105 disabled:opacity-20"
        style={{ background: C.lime, color: C.green }}
      >
        <ArrowRight className="h-5 w-5" />
      </button>

      <button
        onClick={toggleFullscreen}
        aria-label="Fullscreen"
        className="absolute right-8 bottom-8 z-20 flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition hover:scale-105"
        style={{
          borderColor: "rgba(245,240,232,0.4)",
          background: "rgba(13,31,21,0.4)",
          color: C.cream,
        }}
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      <div
        className="absolute inset-x-0 bottom-0 z-20 h-1"
        style={{ background: "rgba(245,240,232,0.12)" }}
      >
        <motion.div
          className="h-full"
          style={{ background: C.lime, boxShadow: `0 0 12px ${C.lime}` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* unused-import suppressor (kept for icon library tree-shake clarity) */}
      <span className="hidden">
        <Users />
        <ListChecks />
      </span>
    </div>
  );
}
