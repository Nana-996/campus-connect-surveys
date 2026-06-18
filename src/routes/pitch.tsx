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
  FileBarChart,
  GraduationCap,
  Sparkles,
  Maximize2,
  Database,
  Target,
  Layers,
  Building2,
  FlaskConical,
  Smartphone,
  CheckCircle2,
  TrendingUp,
  Handshake,
  Rocket,
  DollarSign,
  Filter,
  Send,
  PenLine,
  ArrowDownToLine,
  ClipboardList,
  UserCheck,
  Settings,
  Star,
  Link2,
  Bell,
  Award,
  Trophy,
} from "lucide-react";

export const Route = createFileRoute("/pitch")({
  component: PitchDeck,
  head: () => ({
    meta: [
      { title: "CampusVerify — Pitch Deck" },
      { name: "description", content: "The verified student research network. A premium pitch deck for CampusVerify." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/* ---------- brand tokens ---------- */
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
    transition: { delay: 0.12 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: (i: number = 0) => ({
    opacity: 1,
    transition: { delay: 0.1 + i * 0.1, duration: 0.7, ease: "easeOut" },
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
      {/* grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.6) 1px, transparent 0)",
          backgroundSize: "3px 3px",
        }}
      />
      {/* geometric corner shape */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rotate-12 opacity-[0.08]"
        style={{ background: isGreen ? C.lime : C.green, borderRadius: "30%" }}
      />
      <div
        className={`relative flex h-full w-full flex-col px-16 py-14 ${
          align === "center" ? "items-center justify-center text-center" : "items-start justify-start"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/* ============ SLIDE 1 — Hook ============ */
const Slide1 = () => (
  <SlideShell bg="green" align="center">
    <div className="absolute left-12 top-10"><Wordmark /></div>
    <Kicker>A pitch · 2026</Kicker>
    <motion.h1
      variants={fadeUp}
      custom={1}
      className="mt-10 max-w-[1100px] text-[88px] leading-[0.98] tracking-tight"
      style={{ fontFamily: SERIF, color: C.cream }}
    >
      Thesis season shouldn't mean{" "}
      <span style={{ color: C.lime, fontStyle: "italic" }}>DMing strangers</span>{" "}
      on WhatsApp.
    </motion.h1>
    <motion.p
      variants={fadeUp}
      custom={2}
      className="mt-10 text-2xl"
      style={{ color: C.muted, fontFamily: SANS, fontWeight: 300 }}
    >
      CampusVerify — the verified student research network.
    </motion.p>
    <motion.div
      variants={fadeUp}
      custom={3}
      className="mt-16 h-px w-32"
      style={{ background: C.lime }}
    />
  </SlideShell>
);

/* ============ SLIDE 2 — Problem ============ */
const Slide2 = () => {
  const points = [
    "Students post surveys to WhatsApp groups and get responses from bots, friends, and people who don't fit their target sample.",
    "There is no way to verify a respondent is actually a university student, in the right department, in the right year.",
    "Survey panels like SurveyMonkey Audience cost $200–$500 per study — completely inaccessible to students.",
  ];
  return (
    <SlideShell bg="cream">
      <Kicker dark>The problem</Kicker>
      <motion.h2
        variants={fadeUp}
        custom={1}
        className="mt-6 max-w-4xl text-[68px] leading-[1.02] tracking-tight"
        style={{ fontFamily: SERIF, color: C.green }}
      >
        The undergraduate research data crisis.
      </motion.h2>
      <div className="mt-12 grid w-full max-w-5xl gap-5">
        {points.map((p, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            custom={2 + i}
            className="flex items-start gap-6 border-l-4 py-3 pl-6"
            style={{ borderColor: C.lime }}
          >
            <div
              className="text-5xl font-light leading-none"
              style={{ fontFamily: SERIF, color: C.green, opacity: 0.4 }}
            >
              0{i + 1}
            </div>
            <p
              className="text-xl leading-[1.45]"
              style={{ color: C.green, fontFamily: SANS, fontWeight: 400 }}
            >
              {p}
            </p>
          </motion.div>
        ))}
      </div>
      <motion.p
        variants={fadeUp}
        custom={6}
        className="mt-10 text-base italic"
        style={{ color: C.mutedDark, fontFamily: SERIF }}
      >
        The result: low-quality data, failed peer review, and wasted semesters.
      </motion.p>
    </SlideShell>
  );
};

/* ============ SLIDE 3 — What it is ============ */
const Slide3 = () => (
  <SlideShell bg="green">
    <Kicker>What it is</Kicker>
    <motion.h2
      variants={fadeUp}
      custom={1}
      className="mt-6 max-w-5xl text-[60px] leading-[1.02] tracking-tight"
      style={{ fontFamily: SERIF, color: C.cream }}
    >
      A <span style={{ color: C.lime }}>credit-powered</span> survey network — verified, scoped, and free.
    </motion.h2>

    <div className="mt-12 grid w-full grid-cols-2 gap-8">
      {[
        {
          icon: GraduationCap,
          tag: "Student account",
          credits: "10 free credits on join",
          details: [
            "Verified .edu / .ac.xx university email",
            "Department (searchable), year of study",
            "Student index number, interest tags",
          ],
          summary: "Publish surveys to verified peers, answer surveys to earn credits, and export dissertation-ready reports.",
        },
        {
          icon: Users,
          tag: "General public account",
          credits: "5 free credits on join",
          details: [
            "Any email address",
            "Country and age range",
            "No academic verification required",
          ],
          summary: "Participate in public-audience surveys and lightweight campus polls — extending sample reach beyond a single university.",
        },
      ].map((c, i) => (
        <motion.div
          key={c.tag}
          variants={fadeUp}
          custom={2 + i}
          className="rounded-2xl border p-7"
          style={{ borderColor: C.line, background: "rgba(245,240,232,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <c.icon className="h-6 w-6" style={{ color: C.lime }} />
            <h3 className="text-xl font-semibold uppercase tracking-[0.18em]" style={{ color: C.cream, fontFamily: SANS }}>
              {c.tag}
            </h3>
          </div>
          <div
            className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]"
            style={{ background: C.lime, color: C.green, fontFamily: SANS }}
          >
            {c.credits}
          </div>
          <ul className="mt-5 space-y-2">
            {c.details.map((d) => (
              <li key={d} className="flex items-start gap-2 text-base" style={{ color: C.muted, fontFamily: SANS }}>
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ background: C.lime }} />
                {d}
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t pt-5 text-base leading-relaxed" style={{ borderColor: C.line, color: C.cream, fontFamily: SERIF, fontStyle: "italic" }}>
            {c.summary}
          </p>
        </motion.div>
      ))}
    </div>

    <motion.p
      variants={fadeUp}
      custom={5}
      className="mt-8 text-sm uppercase tracking-[0.3em]"
      style={{ color: C.lime, fontFamily: SANS }}
    >
      Every account is tied to a verified identity. No bots. No randoms.
    </motion.p>
  </SlideShell>
);

/* ============ SLIDE 4 — Credit economy ============ */
const Slide4 = () => {
  const stages = [
    { n: 1, t: "Sign up", d: "Receive 10 free credits" },
    { n: 2, t: "Answer surveys", d: "Earn 1 credit per response" },
    { n: 3, t: "Publish", d: "Spend credits, choose a tier" },
    { n: 4, t: "Export", d: "Real-time responses → PDF report" },
  ];
  const tiers = [
    { name: "Basic", desc: "Campus-wide, lowest cost" },
    { name: "Targeted", desc: "Filter by department & year" },
    { name: "Boosted", desc: "Priority placement in the feed" },
    { name: "Pro", desc: "Maximum reach + full analytics" },
  ];
  return (
    <SlideShell bg="cream">
      <Kicker dark>The economy</Kicker>
      <motion.h2
        variants={fadeUp}
        custom={1}
        className="mt-6 max-w-4xl text-[60px] leading-[1.02] tracking-tight"
        style={{ fontFamily: SERIF, color: C.green }}
      >
        A self-sustaining research ecosystem.
      </motion.h2>

      {/* circular flow */}
      <div className="mt-10 grid w-full grid-cols-4 gap-4">
        {stages.map((s, i) => (
          <motion.div
            key={s.n}
            variants={fadeUp}
            custom={2 + i}
            className="relative rounded-2xl border p-5"
            style={{ borderColor: C.lineDark, background: "rgba(26,58,42,0.04)" }}
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
              className="absolute -right-2 -top-2 h-3 w-3 rounded-full"
              style={{ background: C.lime }}
            />
            <div className="text-4xl font-light" style={{ fontFamily: SERIF, color: C.green }}>0{s.n}</div>
            <div className="mt-3 text-base font-semibold uppercase tracking-[0.14em]" style={{ color: C.green, fontFamily: SANS }}>
              {s.t}
            </div>
            <div className="mt-1 text-sm" style={{ color: C.mutedDark, fontFamily: SANS }}>{s.d}</div>
            {i < 3 && (
              <ArrowRight
                className="absolute -right-4 top-1/2 hidden h-5 w-5 -translate-y-1/2 md:block"
                style={{ color: C.green, opacity: 0.4 }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* tiers */}
      <div className="mt-8 grid w-full grid-cols-4 gap-4">
        {tiers.map((t, i) => (
          <motion.div
            key={t.name}
            variants={fadeUp}
            custom={6 + i}
            className="rounded-xl p-4"
            style={{ background: C.green, color: C.cream }}
          >
            <div className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: C.lime, fontFamily: SANS }}>Tier</div>
            <div className="mt-1 text-2xl font-semibold" style={{ fontFamily: SERIF }}>{t.name}</div>
            <div className="mt-1 text-sm" style={{ color: C.muted, fontFamily: SANS }}>{t.desc}</div>
          </motion.div>
        ))}
      </div>

      <motion.p variants={fadeUp} custom={11} className="mt-8 text-sm uppercase tracking-[0.3em]" style={{ color: C.green, fontFamily: SANS }}>
        Everyone gives. Everyone gets. No one pays cash.
      </motion.p>
    </SlideShell>
  );
};

/* ============ SLIDE 5 — Survey feed ============ */
const Slide5 = () => (
  <SlideShell bg="green">
    <Kicker>The feed</Kicker>
    <motion.h2
      variants={fadeUp}
      custom={1}
      className="mt-6 max-w-4xl text-[60px] leading-[1.02] tracking-tight"
      style={{ fontFamily: SERIF, color: C.cream }}
    >
      Surveys that actually match you.
    </motion.h2>

    <div className="mt-10 grid w-full grid-cols-2 gap-10">
      {/* mockup */}
      <motion.div variants={fadeUp} custom={2} className="relative">
        <div
          className="mx-auto w-full max-w-sm rounded-3xl border p-6 shadow-2xl"
          style={{ background: C.cream, borderColor: C.line, color: C.green }}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: C.mutedDark }}>Survey feed</div>
            <div className="text-xs" style={{ color: C.mutedDark }}>1 of 12</div>
          </div>
          <div
            className="mt-4 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ background: C.lime, color: C.green }}
          >
            Targeted
          </div>
          <h3 className="mt-3 text-2xl leading-tight" style={{ fontFamily: SERIF }}>
            Drug adherence among Health Sciences students
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Pharmacy", "Year 3–4", "12 questions"].map((t) => (
              <span key={t} className="rounded-md border px-2 py-0.5 text-xs" style={{ borderColor: C.lineDark, color: C.green }}>{t}</span>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Coins className="h-4 w-4" style={{ color: C.limeDeep }} /> +1 credit
            </div>
            <button
              className="rounded-full px-5 py-2 text-sm font-bold uppercase tracking-[0.18em]"
              style={{ background: C.green, color: C.cream, fontFamily: SANS }}
            >
              Answer
            </button>
          </div>
          <div className="mt-5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.28em]" style={{ color: C.mutedDark }}>
            ← swipe →
          </div>
        </div>
      </motion.div>

      {/* bullets */}
      <div className="flex flex-col justify-center">
        {[
          { icon: Filter, t: "Matched to you", d: "By department, year, and interests — you only see what's relevant." },
          { icon: Building2, t: "Campus-scoped", d: "Surveys stay inside your university unless the creator opts in to a public audience." },
          { icon: Coins, t: "Earn instantly", d: "Answering earns 1 credit, credited to your account in real time." },
        ].map((b, i) => (
          <motion.div key={b.t} variants={fadeUp} custom={3 + i} className="flex items-start gap-4 py-5 border-b last:border-0" style={{ borderColor: C.line }}>
            <b.icon className="mt-1 h-6 w-6 shrink-0" style={{ color: C.lime }} />
            <div>
              <div className="text-lg font-semibold" style={{ color: C.cream, fontFamily: SANS }}>{b.t}</div>
              <div className="mt-1 text-base" style={{ color: C.muted, fontFamily: SANS }}>{b.d}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>

    <motion.p variants={fadeUp} custom={7} className="mt-6 text-xs uppercase tracking-[0.28em]" style={{ color: C.muted, fontFamily: SANS }}>
      + Polls — a separate lightweight tab for quick campus opinions.
    </motion.p>
  </SlideShell>
);

/* ============ SLIDE 6 — Creation ============ */
const Slide6 = () => {
  const steps = [
    { n: 1, icon: PenLine, t: "Write", d: "Closed-ended (multiple choice, rating scales) or open-ended (free text)." },
    { n: 2, icon: Layers, t: "Choose tier", d: "Basic, Targeted, Boosted, or Pro." },
    { n: 3, icon: Target, t: "Target", d: "Filter respondents by department and year of study." },
    { n: 4, icon: Send, t: "Publish", d: "Spend credits, go live instantly." },
  ];
  return (
    <SlideShell bg="cream">
      <Kicker dark>Creation</Kicker>
      <motion.h2
        variants={fadeUp}
        custom={1}
        className="mt-6 max-w-4xl text-[60px] leading-[1.02] tracking-tight"
        style={{ fontFamily: SERIF, color: C.green }}
      >
        Publish in minutes. Reach exactly who you need.
      </motion.h2>

      <div className="mt-12 grid w-full grid-cols-4 gap-4">
        {steps.map((s, i) => (
          <motion.div key={s.n} variants={fadeUp} custom={2 + i} className="relative">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold"
              style={{ background: C.green, color: C.lime, fontFamily: SERIF }}
            >
              {s.n}
            </div>
            <s.icon className="mt-5 h-6 w-6" style={{ color: C.green }} />
            <div className="mt-3 text-xl font-semibold uppercase tracking-[0.12em]" style={{ color: C.green, fontFamily: SANS }}>
              {s.t}
            </div>
            <div className="mt-2 text-base leading-relaxed" style={{ color: C.mutedDark, fontFamily: SANS }}>
              {s.d}
            </div>
            {i < 3 && (
              <div
                className="absolute right-0 top-7 hidden h-px w-12 md:block"
                style={{ background: C.green, opacity: 0.25 }}
              />
            )}
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={fadeUp}
        custom={7}
        className="mt-12 flex w-full items-start gap-5 rounded-2xl p-7"
        style={{ background: C.green, color: C.cream }}
      >
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
          style={{ background: C.lime, color: C.green }}
        >
          <Target className="h-7 w-7" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: C.lime }}>The differentiator</div>
          <p className="mt-2 text-2xl leading-snug" style={{ fontFamily: SERIF }}>
            Targeted tier is the core differentiator — a Psychology Year 3 student's survey only reaches Psychology Year 3 students.{" "}
            <span style={{ color: C.lime, fontStyle: "italic" }}>No noise.</span>
          </p>
        </div>
      </motion.div>
    </SlideShell>
  );
};

/* ============ SLIDE 7 — Analytics ============ */
const Slide7 = () => {
  const left = [
    "Real-time response count & response rate",
    "Overview and per-question views",
    "Sentiment analysis per open-ended question — computed entirely client-side, no API cost",
    "Word-frequency counter showing top keywords from free-text responses",
    "Representative quotes: one per sentiment bucket, shown inline",
    "Paginated drawer for all raw responses (20 at a time, searchable, filter by sentiment)",
  ];
  const right = [
    "Editable report title and executive summary",
    "Per-question sections — toggle-able inclusion & reorderable sequence",
    "\"Suggest from data\" button auto-fills interpretation notes from computed stats",
    "Raw responses moved to an optional PDF appendix (off by default)",
    "Export PDF — one click, browser print API, no third-party service",
  ];
  return (
    <SlideShell bg="green">
      <Kicker>Analytics</Kicker>
      <motion.h2
        variants={fadeUp}
        custom={1}
        className="mt-6 max-w-4xl text-[58px] leading-[1.02] tracking-tight"
        style={{ fontFamily: SERIF, color: C.cream }}
      >
        From raw data to dissertation-ready PDF.
      </motion.h2>

      <div className="mt-8 grid w-full grid-cols-2 gap-6">
        {[
          { icon: FileBarChart, title: "Analytics Dashboard", items: left },
          { icon: ArrowDownToLine, title: "Report Builder", items: right },
        ].map((panel, i) => (
          <motion.div
            key={panel.title}
            variants={fadeUp}
            custom={2 + i}
            className="rounded-2xl border p-6"
            style={{ borderColor: C.line, background: "rgba(245,240,232,0.04)" }}
          >
            <div className="flex items-center gap-3">
              <panel.icon className="h-6 w-6" style={{ color: C.lime }} />
              <h3 className="text-2xl" style={{ fontFamily: SERIF, color: C.cream }}>{panel.title}</h3>
            </div>
            <ul className="mt-5 space-y-3">
              {panel.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] leading-relaxed" style={{ color: C.muted, fontFamily: SANS }}>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: C.lime }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      <motion.p variants={fadeUp} custom={5} className="mt-6 text-base italic" style={{ color: C.lime, fontFamily: SERIF }}>
        The only survey platform that takes you from "survey published" to "PDF submitted" without leaving the app.
      </motion.p>
    </SlideShell>
  );
};

/* ============ SLIDE 8 — Security ============ */
const Slide8 = () => {
  const items = [
    "Row-Level Security (RLS) on every single database table — no accidental data leaks",
    "University email verification required before any access — enforced at the auth layer",
    "Student index numbers visible only to university admins and faculty managers — never to other students",
    "email_hash stored instead of raw emails in cross-table references — pseudonymisation by design",
    "Survey responses pseudonymised for cross-campus audiences — respondent identity protected from creators",
    "Review-flag system automated by database trigger — cannot be manipulated by users",
  ];
  return (
    <SlideShell bg="cream">
      <Kicker dark>Security</Kicker>
      <motion.h2
        variants={fadeUp}
        custom={1}
        className="mt-6 max-w-4xl text-[58px] leading-[1.02] tracking-tight"
        style={{ fontFamily: SERIF, color: C.green }}
      >
        Defense-in-depth — built for institutional trust.
      </motion.h2>

      <div className="mt-10 grid w-full grid-cols-2 gap-x-10 gap-y-4">
        {items.map((it, i) => (
          <motion.div key={i} variants={fadeUp} custom={2 + i} className="flex items-start gap-4 border-b py-4" style={{ borderColor: C.lineDark }}>
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: C.lime }}
            >
              <CheckCircle2 className="h-4 w-4" style={{ color: C.green }} />
            </div>
            <p className="text-[15px] leading-relaxed" style={{ color: C.green, fontFamily: SANS }}>{it}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={fadeUp}
        custom={9}
        className="mt-8 w-full rounded-2xl p-6"
        style={{ background: C.green, color: C.cream }}
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6" style={{ color: C.lime }} />
          <p className="text-lg" style={{ fontFamily: SERIF, fontStyle: "italic" }}>
            100% verified accounts. 0 third-party ad trackers. Built to meet GDPR-adjacent standards from day one.
          </p>
        </div>
      </motion.div>
    </SlideShell>
  );
};

/* ============ SLIDE 9 — Offline PWA ============ */
const Slide9 = () => {
  const items = [
    { icon: Smartphone, t: "Offline-first PWA", d: "Installs to the home screen like a native app — no app store needed." },
    { icon: WifiOff, t: "Answer offline", d: "Responses are saved locally when there's no connection and sync automatically when reconnected." },
    { icon: Database, t: "Service-worker caching", d: "Core UI loads even with zero connectivity — students never lose progress mid-survey." },
  ];
  return (
    <SlideShell bg="green">
      <Kicker>Built for the field</Kicker>
      <motion.h2
        variants={fadeUp}
        custom={1}
        className="mt-6 max-w-4xl text-[60px] leading-[1.02] tracking-tight"
        style={{ fontFamily: SERIF, color: C.cream }}
      >
        Works where your students actually are.
      </motion.h2>
      <motion.p variants={fadeUp} custom={2} className="mt-4 max-w-3xl text-xl" style={{ color: C.muted, fontFamily: SANS }}>
        Campus Wi-Fi in West Africa is unreliable. CampusVerify is built for it.
      </motion.p>

      <div className="mt-12 grid w-full grid-cols-3 gap-6">
        {items.map((it, i) => (
          <motion.div
            key={it.t}
            variants={fadeUp}
            custom={3 + i}
            className="rounded-2xl border p-6"
            style={{ borderColor: C.line, background: "rgba(245,240,232,0.04)" }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: C.lime, color: C.green }}
            >
              <it.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-2xl" style={{ fontFamily: SERIF, color: C.cream }}>{it.t}</h3>
            <p className="mt-2 text-base leading-relaxed" style={{ color: C.muted, fontFamily: SANS }}>{it.d}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={fadeUp}
        custom={7}
        className="mt-10 flex items-center gap-3 text-sm uppercase tracking-[0.28em]"
        style={{ color: C.lime, fontFamily: SANS }}
      >
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: C.lime }} />
        Launch region: Ghana · West Africa
      </motion.div>
    </SlideShell>
  );
};

/* ============ SLIDE 10 — Users ============ */
const Slide10 = () => {
  const users = [
    {
      icon: FlaskConical,
      tag: "The researcher",
      role: "Student creator",
      story: "A final-year Pharmacy student at a Ghanaian university needs 80 verified responses for their dissertation on drug adherence among peers. They publish a Targeted survey scoped to Health Sciences, Years 3–4. 80 responses in 48 hours. PDF report exported. Supervisor approves.",
    },
    {
      icon: Smartphone,
      tag: "The respondent",
      role: "Student answerer",
      story: "A Business Year 2 student answers 10 surveys over a month — earns 10 credits — and uses them to publish their own mini-survey for a class project. Zero cash spent.",
    },
    {
      icon: Building2,
      tag: "The institution",
      role: "University / faculty",
      story: "Faculty managers access the /manage panel to track survey activity, view completion rates by department, and ensure research integrity across the student body. Index numbers allow audit trails.",
    },
  ];
  return (
    <SlideShell bg="cream">
      <Kicker dark>Who it's for</Kicker>
      <motion.h2
        variants={fadeUp}
        custom={1}
        className="mt-6 max-w-4xl text-[58px] leading-[1.02] tracking-tight"
        style={{ fontFamily: SERIF, color: C.green }}
      >
        One platform. Three stakeholders. Every campus.
      </motion.h2>

      <div className="mt-10 grid w-full grid-cols-3 gap-5">
        {users.map((u, i) => (
          <motion.div
            key={u.tag}
            variants={fadeUp}
            custom={2 + i}
            className="flex flex-col rounded-2xl border p-6"
            style={{ borderColor: C.lineDark, background: "rgba(26,58,42,0.04)" }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl"
              style={{ background: C.green, color: C.lime }}
            >
              <u.icon className="h-7 w-7" />
            </div>
            <div className="mt-5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: C.limeDeep, fontFamily: SANS }}>
              {u.tag}
            </div>
            <h3 className="mt-1 text-2xl" style={{ fontFamily: SERIF, color: C.green }}>{u.role}</h3>
            <p className="mt-4 text-[15px] leading-relaxed" style={{ color: C.green, fontFamily: SANS }}>{u.story}</p>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
};

/* ============ SLIDE — Faculty Tracking ============ */
const SlideFaculty = () => {
  const rows = [
    { name: "Ama Mensah", dept: "Pharmacy · Y4", idx: "PHA/2021/0142", status: "Responded", when: "2h ago" },
    { name: "Kwame Boateng", dept: "Pharmacy · Y4", idx: "PHA/2021/0157", status: "Responded", when: "5h ago" },
    { name: "Akosua Nyarko", dept: "Pharmacy · Y4", idx: "PHA/2021/0166", status: "Pending", when: "—" },
    { name: "Yaw Ofori", dept: "Pharmacy · Y3", idx: "PHA/2022/0089", status: "Pending", when: "—" },
    { name: "Esi Adjei", dept: "Pharmacy · Y4", idx: "PHA/2021/0178", status: "Responded", when: "1d ago" },
  ];
  return (
    <SlideShell bg="cream">
      <Kicker dark>Faculty supervisor mode</Kicker>
      <motion.h2
        variants={fadeUp}
        custom={1}
        className="mt-6 max-w-5xl text-[58px] leading-[1.02] tracking-tight"
        style={{ fontFamily: SERIF, color: C.green }}
      >
        Lecturers see <em style={{ color: C.limeDeep }}>exactly</em> who has — and hasn't — responded.
      </motion.h2>
      <p className="mt-4 max-w-3xl text-lg" style={{ color: C.mutedDark, fontFamily: SANS }}>
        University-scoped tracking by department, year, and index number. Answer content stays confidential — only participation is visible. Chase the gaps, not every student.
      </p>

      <div className="mt-8 grid w-full grid-cols-5 gap-6">
        {/* mock tracking table */}
        <motion.div variants={fadeUp} custom={2} className="col-span-3 overflow-hidden rounded-2xl border" style={{ borderColor: C.lineDark, background: "rgba(255,255,255,0.6)" }}>
          <div className="flex items-center justify-between px-5 py-3 text-xs font-bold uppercase tracking-[0.22em]" style={{ background: C.green, color: C.lime, fontFamily: SANS }}>
            <span>Survey · Drug Adherence Y3–Y4</span>
            <span>62 / 80 responded</span>
          </div>
          <table className="w-full text-[13px]" style={{ fontFamily: SANS }}>
            <thead style={{ background: "rgba(26,58,42,0.06)" }}>
              <tr className="text-left uppercase tracking-wider" style={{ color: C.green }}>
                <th className="px-4 py-2">Student</th>
                <th className="px-4 py-2">Dept · Year</th>
                <th className="px-4 py-2">Index</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.idx} className="border-t" style={{ borderColor: C.lineDark, color: C.green }}>
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2 opacity-75">{r.dept}</td>
                  <td className="px-4 py-2 opacity-60">{r.idx}</td>
                  <td className="px-4 py-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{
                        background: r.status === "Responded" ? C.lime : "rgba(26,58,42,0.12)",
                        color: r.status === "Responded" ? C.green : C.green,
                      }}
                    >
                      {r.status === "Responded" ? <CheckCircle2 className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                      {r.status} {r.status === "Responded" && <span className="opacity-60">· {r.when}</span>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* benefits */}
        <motion.div variants={fadeUp} custom={3} className="col-span-2 flex flex-col gap-4">
          {[
            { icon: UserCheck, t: "Live participation map", d: "Filter by department, year, or index — instantly see who is missing." },
            { icon: Bell, t: "Targeted follow-up", d: "Contact only the non-respondents. No more group-blast spam." },
            { icon: ShieldCheck, t: "Answers stay private", d: "Supervisors see participation, never individual responses." },
          ].map((b, i) => (
            <div key={b.t} className="flex items-start gap-3 rounded-xl border p-4" style={{ borderColor: C.lineDark, background: "rgba(26,58,42,0.04)" }}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: C.green, color: C.lime }}>
                <b.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[15px] font-semibold" style={{ color: C.green, fontFamily: SANS }}>{b.t}</div>
                <div className="text-[13px]" style={{ color: C.mutedDark, fontFamily: SANS }}>{b.d}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </SlideShell>
  );
};

/* ============ SLIDE — Admin Console ============ */
const SlideAdmin = () => {
  const tools = [
    { icon: Coins, t: "Grant bonus credits", d: "Reward power users, run campus campaigns, or top-up researchers running large studies — all from one panel." },
    { icon: ShieldCheck, t: "Flag & moderate users", d: "Lock suspicious accounts, surface low-quality respondents, resolve review flags from the community." },
    { icon: Settings, t: "Role management", d: "Promote faculty as managers, grant admins by email, revoke access with one click." },
    { icon: Filter, t: "Domain blocklist", d: "Auto-reject disposable email domains so only real .edu / .ac inboxes get verified." },
    { icon: FileBarChart, t: "Live platform metrics", d: "Users, active surveys, 24h responses, open flags — a real-time pulse of the network." },
    { icon: Database, t: "Survey takedown", d: "One-click deactivate or delete any survey violating policy. Audit-logged." },
  ];
  return (
    <SlideShell bg="green">
      <Kicker>Owner controls</Kicker>
      <motion.h2
        variants={fadeUp}
        custom={1}
        className="mt-6 max-w-5xl text-[58px] leading-[1.02] tracking-tight"
        style={{ fontFamily: SERIF, color: C.cream }}
      >
        A purpose-built <span style={{ color: C.lime, fontStyle: "italic" }}>admin console</span> — not a database editor.
      </motion.h2>
      <p className="mt-4 max-w-3xl text-lg" style={{ color: C.muted, fontFamily: SANS }}>
        Every operational lever the platform owner needs lives in <code style={{ color: C.lime }}>/admin</code>. Secured by row-level policies + a security-definer <code style={{ color: C.lime }}>has_role()</code> check on every action.
      </p>
      <div className="mt-10 grid w-full grid-cols-3 gap-5">
        {tools.map((t, i) => (
          <motion.div
            key={t.t}
            variants={fadeUp}
            custom={2 + i}
            className="rounded-2xl border p-6"
            style={{ borderColor: C.line, background: "rgba(245,240,232,0.04)" }}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: C.lime, color: C.green }}>
              <t.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl" style={{ fontFamily: SERIF, color: C.cream }}>{t.t}</h3>
            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: C.muted, fontFamily: SANS }}>{t.d}</p>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
};

/* ============ SLIDE — Lecturer Evaluations ============ */
const SlideLecturer = () => (
  <SlideShell bg="cream">
    <Kicker dark>Built-in templates</Kicker>
    <motion.h2
      variants={fadeUp}
      custom={1}
      className="mt-6 max-w-5xl text-[58px] leading-[1.02] tracking-tight"
      style={{ fontFamily: SERIF, color: C.green }}
    >
      Lecturer evaluations, <em style={{ color: C.limeDeep }}>standardised</em> and campus-scoped.
    </motion.h2>
    <p className="mt-4 max-w-3xl text-lg" style={{ color: C.mutedDark, fontFamily: SANS }}>
      A first-class lecturers directory plus a pre-loaded evaluation template means quality-assurance offices can launch a faculty-wide review in minutes — not weeks.
    </p>
    <div className="mt-10 grid w-full grid-cols-2 gap-8">
      <motion.div variants={fadeUp} custom={2} className="rounded-2xl border p-7" style={{ borderColor: C.lineDark, background: "rgba(26,58,42,0.04)" }}>
        <div className="flex items-center gap-3">
          <Star className="h-6 w-6" style={{ color: C.limeDeep }} />
          <h3 className="text-xl font-semibold uppercase tracking-[0.18em]" style={{ color: C.green, fontFamily: SANS }}>Two creation paths</h3>
        </div>
        <ul className="mt-5 space-y-3 text-[15px]" style={{ color: C.green, fontFamily: SANS }}>
          {[
            "Admin: launch evaluations across an entire faculty",
            "Faculty manager: launch within their own department",
            "Pre-filled standard form — teaching clarity, fairness, engagement, materials, overall rating",
            "Visibility rules: only the rated lecturer + admin see results",
          ].map((x) => (
            <li key={x} className="flex gap-2"><span style={{ color: C.limeDeep }}>›</span>{x}</li>
          ))}
        </ul>
      </motion.div>
      <motion.div variants={fadeUp} custom={3} className="rounded-2xl p-7" style={{ background: C.green, color: C.cream }}>
        <div className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: C.lime, fontFamily: SANS }}>Sample question</div>
        <p className="mt-4 text-2xl leading-tight" style={{ fontFamily: SERIF }}>
          "How would you rate the clarity of Dr. Owusu's lectures this semester?"
        </p>
        <div className="mt-6 flex gap-2">
          {[1,2,3,4,5].map((n) => (
            <div key={n} className="flex h-12 w-12 items-center justify-center rounded-full border" style={{ borderColor: C.lime, color: C.lime, fontFamily: SANS, fontWeight: 600 }}>{n}</div>
          ))}
        </div>
        <p className="mt-6 text-sm" style={{ color: C.muted, fontFamily: SANS }}>
          Aggregated, anonymised, and exportable as a semester report.
        </p>
      </motion.div>
    </div>
  </SlideShell>
);

/* ============ SLIDE — Quality & Integrity ============ */
const SlideQuality = () => {
  const items = [
    { icon: Award, t: "Quality score per response", d: "Auto-computed from completion time, straight-lining, open-text length. Low-quality responses can be excluded from analysis." },
    { icon: ShieldCheck, t: "Anonymous by default", d: "Respondents opt in to share identity. Identified respondents are visible to faculty trackers but never to peers." },
    { icon: Link2, t: "Shareable referral links", d: "Each survey gets a private link with a token. Off-platform recipients verify before answering — no spoofing." },
    { icon: Trophy, t: "Earned vs purchased credits", d: "Two-wallet ledger keeps the economy honest. Expiry on bonus grants prevents hoarding." },
  ];
  return (
    <SlideShell bg="green">
      <Kicker>Trust layer</Kicker>
      <motion.h2
        variants={fadeUp}
        custom={1}
        className="mt-6 max-w-5xl text-[58px] leading-[1.02] tracking-tight"
        style={{ fontFamily: SERIF, color: C.cream }}
      >
        Real responses. <span style={{ color: C.lime, fontStyle: "italic" }}>Honest</span> data.
      </motion.h2>
      <div className="mt-10 grid w-full grid-cols-2 gap-6">
        {items.map((it, i) => (
          <motion.div key={it.t} variants={fadeUp} custom={2 + i} className="flex gap-5 rounded-2xl border p-6" style={{ borderColor: C.line, background: "rgba(245,240,232,0.04)" }}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: C.lime, color: C.green }}>
              <it.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl" style={{ fontFamily: SERIF, color: C.cream }}>{it.t}</h3>
              <p className="mt-1 text-[14px] leading-relaxed" style={{ color: C.muted, fontFamily: SANS }}>{it.d}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
};

/* ============ SLIDE — Why we win ============ */
const SlideAdvantage = () => {
  const rows = [
    { f: "Verified university respondents", cv: true, sm: false, gf: false },
    { f: "Department + year targeting", cv: true, sm: "Paid panel only", gf: false },
    { f: "Free to publish (credits, no cash)", cv: true, sm: false, gf: true },
    { f: "Faculty participation tracking", cv: true, sm: false, gf: false },
    { f: "Built-in sentiment + keyword analytics", cv: true, sm: "Enterprise tier", gf: false },
    { f: "Offline-first for low connectivity", cv: true, sm: false, gf: false },
    { f: "Lecturer evaluation templates", cv: true, sm: false, gf: false },
  ];
  const cell = (v: any) => v === true
    ? <CheckCircle2 className="mx-auto h-5 w-5" style={{ color: C.limeDeep }} />
    : v === false
      ? <span className="text-2xl" style={{ color: C.green, opacity: 0.2 }}>—</span>
      : <span className="text-xs" style={{ color: C.mutedDark, fontFamily: SANS }}>{v}</span>;
  return (
    <SlideShell bg="cream">
      <Kicker dark>Why we win</Kicker>
      <motion.h2
        variants={fadeUp}
        custom={1}
        className="mt-6 max-w-4xl text-[58px] leading-[1.02] tracking-tight"
        style={{ fontFamily: SERIF, color: C.green }}
      >
        Built for campus. <em style={{ color: C.limeDeep }}>Nothing else comes close.</em>
      </motion.h2>
      <motion.div variants={fadeUp} custom={2} className="mt-10 w-full overflow-hidden rounded-2xl border" style={{ borderColor: C.lineDark, background: "rgba(255,255,255,0.5)" }}>
        <table className="w-full text-[15px]" style={{ fontFamily: SANS }}>
          <thead style={{ background: C.green, color: C.cream }}>
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.2em]">Feature</th>
              <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.2em]" style={{ color: C.lime }}>CampusVerify</th>
              <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.2em]">SurveyMonkey</th>
              <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.2em]">Google Forms</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.f} className="border-t" style={{ borderColor: C.lineDark, color: C.green }}>
                <td className="px-6 py-3 font-medium">{r.f}</td>
                <td className="px-6 py-3 text-center" style={{ background: "rgba(184,224,74,0.12)" }}>{cell(r.cv)}</td>
                <td className="px-6 py-3 text-center">{cell(r.sm)}</td>
                <td className="px-6 py-3 text-center">{cell(r.gf)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </SlideShell>
  );
};

/* ============ SLIDE 11 — Vision ============ */
const Slide11 = () => {
  const roadmap = [
    { when: "Now · 2026", what: "Closed beta — single-institution pilot, Ghana" },
    { when: "Q4 · 2026", what: "Multi-university rollout — Ghana-first expansion" },
    { when: "2027", what: "Pan-African network — lecturer evaluations, peer polls, institutional API" },
    { when: "2028", what: "Open research platform — white-label for university research departments" },
  ];
  const ctas = [
    { icon: Handshake, t: "Partner with us", d: "Bring CampusVerify to your university." },
    { icon: DollarSign, t: "Invest", d: "Help us scale across West Africa." },
    { icon: Rocket, t: "Try it", d: "your-domain.com" },
  ];
  return (
    <SlideShell bg="green">
      <div className="absolute right-12 top-10"><Wordmark /></div>
      <Kicker>The road</Kicker>
      <motion.h2
        variants={fadeUp}
        custom={1}
        className="mt-6 max-w-4xl text-[64px] leading-[1.0] tracking-tight"
        style={{ fontFamily: SERIF, color: C.cream }}
      >
        From <span style={{ color: C.lime, fontStyle: "italic" }}>one campus</span> to <span style={{ color: C.lime, fontStyle: "italic" }}>every campus</span>.
      </motion.h2>

      {/* roadmap */}
      <div className="relative mt-10 grid w-full grid-cols-4 gap-4">
        <div className="absolute left-0 right-0 top-6 h-px" style={{ background: C.lime, opacity: 0.3 }} />
        {roadmap.map((r, i) => (
          <motion.div key={r.when} variants={fadeUp} custom={2 + i} className="relative">
            <div
              className="relative z-10 mx-0 h-3 w-3 rounded-full"
              style={{ background: C.lime, boxShadow: `0 0 12px ${C.lime}`, marginTop: "18px", marginLeft: 0 }}
            />
            <div className="mt-5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: C.lime, fontFamily: SANS }}>{r.when}</div>
            <div className="mt-2 text-[15px] leading-snug" style={{ color: C.cream, fontFamily: SANS }}>{r.what}</div>
          </motion.div>
        ))}
      </div>

      {/* CTAs */}
      <div className="mt-10 grid w-full grid-cols-3 gap-5">
        {ctas.map((c, i) => (
          <motion.div
            key={c.t}
            variants={fadeUp}
            custom={6 + i}
            className="flex items-start gap-4 rounded-2xl p-6"
            style={{ background: i === 2 ? C.lime : "rgba(245,240,232,0.06)", color: i === 2 ? C.green : C.cream, border: `1px solid ${i === 2 ? "transparent" : C.line}` }}
          >
            <c.icon className="h-7 w-7 shrink-0" style={{ color: i === 2 ? C.green : C.lime }} />
            <div>
              <div className="text-xl font-semibold" style={{ fontFamily: SANS }}>{c.t}</div>
              <div className="mt-1 text-sm" style={{ fontFamily: SANS, opacity: i === 2 ? 0.85 : 0.7 }}>{c.d}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={fadeUp} custom={10} className="mt-auto flex w-full items-center justify-between pt-10">
        <Wordmark />
        <span className="text-sm uppercase tracking-[0.3em] italic" style={{ color: C.muted, fontFamily: SERIF }}>
          Made on campus. For campus.
        </span>
      </motion.div>
    </SlideShell>
  );
};

/* ---------- deck ---------- */
const SLIDES = [
  { id: "hook", render: Slide1 },
  { id: "problem", render: Slide2 },
  { id: "what", render: Slide3 },
  { id: "economy", render: Slide4 },
  { id: "feed", render: Slide5 },
  { id: "creation", render: Slide6 },
  { id: "analytics", render: Slide7 },
  { id: "quality", render: SlideQuality },
  { id: "faculty", render: SlideFaculty },
  { id: "lecturer", render: SlideLecturer },
  { id: "admin", render: SlideAdmin },
  { id: "security", render: Slide8 },
  { id: "offline", render: Slide9 },
  { id: "advantage", render: SlideAdvantage },
  { id: "users", render: Slide10 },
  { id: "vision", render: Slide11 },
];

function PitchDeck() {
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
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(index + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(index - 1); }
      else if (e.key === "Home") go(0);
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
      {/* full viewport slide */}
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

      {/* slide counter */}
      <div
        className="pointer-events-none absolute right-8 top-7 z-20 text-xs font-bold uppercase tracking-[0.3em]"
        style={{ color: index % 2 === 0 ? C.cream : C.green, mixBlendMode: "difference", opacity: 0.85 }}
      >
        {String(index + 1).padStart(2, "0")} <span style={{ opacity: 0.5 }}>/ {String(total).padStart(2, "0")}</span>
      </div>

      {/* prev / next buttons */}
      <button
        onClick={() => go(index - 1)}
        disabled={index === 0}
        aria-label="Previous slide"
        className="absolute left-6 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-md transition hover:scale-105 disabled:opacity-20"
        style={{ borderColor: "rgba(245,240,232,0.4)", background: "rgba(13,31,21,0.4)", color: C.cream }}
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

      {/* fullscreen */}
      <button
        onClick={toggleFullscreen}
        aria-label="Fullscreen"
        className="absolute right-8 bottom-8 z-20 flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition hover:scale-105"
        style={{ borderColor: "rgba(245,240,232,0.4)", background: "rgba(13,31,21,0.4)", color: C.cream }}
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      {/* progress bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 h-1" style={{ background: "rgba(245,240,232,0.12)" }}>
        <motion.div
          className="h-full"
          style={{ background: C.lime, boxShadow: `0 0 12px ${C.lime}` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
