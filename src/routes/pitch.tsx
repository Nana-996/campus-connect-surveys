import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Coins,
  Wifi,
  Users,
  FileBarChart,
  GraduationCap,
  Lock,
  Sparkles,
  Maximize2,
  Database,
  MapPin,
  TrendingUp,
  Quote,
  Target,
  Layers,
  Globe2,
} from "lucide-react";

export const Route = createFileRoute("/pitch")({
  component: PitchDeck,
  head: () => ({
    meta: [
      { title: "CampusVerify — Pitch Deck" },
      { name: "description", content: "Animated pitch deck for CampusVerify, a campus-scoped survey platform for Ghanaian universities." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/* ---------- design tokens (scoped to this route) ---------- */
const PALETTE = {
  bg: "#0B1020",
  bgSoft: "#111733",
  ink: "#F7F4EC",
  inkSoft: "#C9C5B8",
  primary: "#E94F37", // Ghana-flag-inspired red
  gold: "#F2C14E",
  green: "#3DA35D",
  line: "rgba(247,244,236,0.12)",
};

/* ---------- slide content ---------- */
type Slide = {
  id: string;
  render: () => React.ReactElement;
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      variants={fadeUp}
      custom={0}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em]"
      style={{ borderColor: PALETTE.line, color: PALETTE.gold }}
    >
      <Sparkles className="h-3 w-3" /> {children}
    </motion.span>
  );
}

function SlideShell({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div
      className={`flex h-full w-full flex-col px-16 py-14 ${
        align === "center" ? "items-center justify-center text-center" : "items-start justify-center"
      }`}
    >
      {children}
    </div>
  );
}

/* Slide 1 — Title */
const SlideTitle = () => (
  <SlideShell>
    <Kicker>A pitch for the board</Kicker>
    <motion.h1
      variants={fadeUp}
      custom={1}
      className="mt-8 font-serif text-[120px] leading-[0.9] tracking-tight"
      style={{ color: PALETTE.ink }}
    >
      Campus<span style={{ color: PALETTE.primary }}>Verify</span>
    </motion.h1>
    <motion.p
      variants={fadeUp}
      custom={2}
      className="mt-8 max-w-3xl text-2xl"
      style={{ color: PALETTE.inkSoft }}
    >
      A verified, campus-scoped research platform built for Ghanaian universities — so student
      research is finally <em style={{ color: PALETTE.gold }}>honest, affordable, and ours.</em>
    </motion.p>
    <motion.div
      variants={fadeUp}
      custom={3}
      className="mt-12 flex items-center gap-3 text-sm uppercase tracking-[0.3em]"
      style={{ color: PALETTE.inkSoft }}
    >
      <MapPin className="h-4 w-4" style={{ color: PALETTE.green }} /> Made for Ghana · Built with care
    </motion.div>
  </SlideShell>
);

/* Slide 2 — The Problem */
const SlideProblem = () => (
  <SlideShell align="start">
    <Kicker>The problem</Kicker>
    <motion.h2 variants={fadeUp} custom={1} className="mt-6 font-serif text-7xl tracking-tight" style={{ color: PALETTE.ink }}>
      Student research is broken — in two ways.
    </motion.h2>
    <div className="mt-12 grid w-full grid-cols-2 gap-8">
      {[
        {
          n: "01",
          h: "Data you can't trust",
          p: "Free tools let anyone respond. A dissertation about engineering students in Kumasi can end up answered by bots, click-farms, or strangers from another continent.",
        },
        {
          n: "02",
          h: "Cost you can't afford",
          p: "Paid panels charge in dollars. Undergraduates fall back on WhatsApp groups — and students with smaller networks systematically get less data.",
        },
      ].map((c, i) => (
        <motion.div
          key={c.n}
          variants={fadeUp}
          custom={2 + i}
          className="rounded-2xl border p-8"
          style={{ borderColor: PALETTE.line, background: PALETTE.bgSoft }}
        >
          <div className="font-serif text-5xl" style={{ color: PALETTE.primary }}>{c.n}</div>
          <h3 className="mt-4 text-2xl font-semibold" style={{ color: PALETTE.ink }}>{c.h}</h3>
          <p className="mt-3 text-lg leading-relaxed" style={{ color: PALETTE.inkSoft }}>{c.p}</p>
        </motion.div>
      ))}
    </div>
  </SlideShell>
);

/* Slide 3 — The Solution */
const SlideSolution = () => (
  <SlideShell>
    <Kicker>Our answer</Kicker>
    <motion.h2 variants={fadeUp} custom={1} className="mt-6 max-w-5xl font-serif text-7xl leading-[1] tracking-tight" style={{ color: PALETTE.ink }}>
      A <span style={{ color: PALETTE.gold }}>credit-powered</span> feed of <span style={{ color: PALETTE.primary }}>verified classmates.</span>
    </motion.h2>
    <motion.p variants={fadeUp} custom={2} className="mt-8 max-w-3xl text-xl" style={{ color: PALETTE.inkSoft }}>
      Sign up with your academic email. Your domain decides your campus. Earn credits by answering,
      spend them to publish. No money changes hands — and every researcher is also a respondent.
    </motion.p>
    <motion.div variants={fadeUp} custom={3} className="mt-12 flex items-center gap-10">
      {[
        { icon: GraduationCap, label: "Verified academic email" },
        { icon: Users, label: "Scoped to your campus" },
        { icon: Coins, label: "Credit, not cash" },
      ].map(({ icon: Icon, label }, i) => (
        <motion.div key={label} variants={fadeUp} custom={4 + i} className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: PALETTE.bgSoft, border: `1px solid ${PALETTE.line}` }}>
            <Icon className="h-7 w-7" style={{ color: PALETTE.gold }} />
          </div>
          <span className="text-sm uppercase tracking-[0.18em]" style={{ color: PALETTE.inkSoft }}>{label}</span>
        </motion.div>
      ))}
    </motion.div>
  </SlideShell>
);

/* Slide 4 — Why this matters for Ghana */
const SlideGhana = () => (
  <SlideShell align="start">
    <Kicker>Why it matters here</Kicker>
    <motion.h2 variants={fadeUp} custom={1} className="mt-6 font-serif text-7xl tracking-tight" style={{ color: PALETTE.ink }}>
      Built for the realities of <span style={{ color: PALETTE.green }}>Ghanaian campuses.</span>
    </motion.h2>
    <div className="mt-12 grid w-full grid-cols-3 gap-6">
      {[
        { icon: Wifi, h: "Offline-first", p: "Campus Wi-Fi drops. Mobile data is precious. Surveys cache locally and sync when you're back online." },
        { icon: Globe2, h: "Local-domain aware", p: "Recognises .edu.gh, .ug.edu.gh, .knust.edu.gh, .ucc.edu.gh and more — so campus identity isn't guessed." },
        { icon: Coins, h: "Zero cost to students", p: "No subscriptions, no panel fees, no foreign-card requirement. Currency is participation." },
      ].map((c, i) => (
        <motion.div key={c.h} variants={fadeUp} custom={2 + i} className="rounded-2xl border p-6" style={{ borderColor: PALETTE.line, background: PALETTE.bgSoft }}>
          <c.icon className="h-7 w-7" style={{ color: PALETTE.primary }} />
          <h3 className="mt-4 text-xl font-semibold" style={{ color: PALETTE.ink }}>{c.h}</h3>
          <p className="mt-2 text-base leading-relaxed" style={{ color: PALETTE.inkSoft }}>{c.p}</p>
        </motion.div>
      ))}
    </div>
  </SlideShell>
);

/* Slide 5 — Features */
const SlideFeatures = () => (
  <SlideShell align="start">
    <Kicker>What students get</Kicker>
    <motion.h2 variants={fadeUp} custom={1} className="mt-6 font-serif text-7xl tracking-tight" style={{ color: PALETTE.ink }}>
      One platform. The whole research loop.
    </motion.h2>
    <div className="mt-12 grid w-full grid-cols-2 gap-6">
      {[
        { icon: Target, h: "Targeted recruitment", p: "Filter by department, year, interests — the precision a paid panel charges hundreds of dollars for." },
        { icon: FileBarChart, h: "One-click reports", p: "Cover page, executive summary, per-question analysis, owner commentary — exported as a clean PDF a supervisor can sign off on." },
        { icon: GraduationCap, h: "Lecturer evaluations", p: "A standardised, anonymous evaluation flow — so department heads get real signal, not coerced praise." },
        { icon: Users, h: "Public-good polls", p: "General-interest polls open beyond a single campus, for when the question really is national." },
      ].map((c, i) => (
        <motion.div key={c.h} variants={fadeUp} custom={2 + i} className="flex items-start gap-5 rounded-2xl border p-6" style={{ borderColor: PALETTE.line, background: PALETTE.bgSoft }}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(233,79,55,0.12)" }}>
            <c.icon className="h-6 w-6" style={{ color: PALETTE.primary }} />
          </div>
          <div>
            <h3 className="text-xl font-semibold" style={{ color: PALETTE.ink }}>{c.h}</h3>
            <p className="mt-1 text-base leading-relaxed" style={{ color: PALETTE.inkSoft }}>{c.p}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </SlideShell>
);

/* Slide 6 — Security & Trust */
const SlideSecurity = () => (
  <SlideShell align="start">
    <Kicker>Trust by design</Kicker>
    <motion.h2 variants={fadeUp} custom={1} className="mt-6 font-serif text-7xl tracking-tight" style={{ color: PALETTE.ink }}>
      Privacy is enforced in the database, not just the UI.
    </motion.h2>
    <div className="mt-12 grid w-full grid-cols-2 gap-6">
      {[
        { icon: ShieldCheck, h: "Row-level security on every table", p: "Even if our app code had a bug, the database itself refuses to leak data across users or campuses." },
        { icon: Lock, h: "Roles you can't escalate", p: "Permissions live in a separate, signed-off table — no hidden admin flag on a profile, no client-side privilege checks." },
        { icon: Quote, h: "Respondents stay anonymous", p: "Researchers see pseudonyms, never raw identities. Evaluation answer keys are stripped server-side before students see them." },
        { icon: Database, h: "Auditable migrations", p: "Every schema change is a numbered SQL file. The board can see exactly what changed, when, and why." },
      ].map((c, i) => (
        <motion.div key={c.h} variants={fadeUp} custom={2 + i} className="flex items-start gap-5 rounded-2xl border p-6" style={{ borderColor: PALETTE.line, background: PALETTE.bgSoft }}>
          <c.icon className="h-7 w-7 shrink-0" style={{ color: PALETTE.green }} />
          <div>
            <h3 className="text-xl font-semibold" style={{ color: PALETTE.ink }}>{c.h}</h3>
            <p className="mt-1 text-base leading-relaxed" style={{ color: PALETTE.inkSoft }}>{c.p}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </SlideShell>
);

/* Slide 7 — Value to the school */
const SlideValue = () => (
  <SlideShell align="start">
    <Kicker>For the school</Kicker>
    <motion.h2 variants={fadeUp} custom={1} className="mt-6 font-serif text-7xl tracking-tight" style={{ color: PALETTE.ink }}>
      What the institution gains.
    </motion.h2>
    <div className="mt-12 grid w-full grid-cols-4 gap-5">
      {[
        { stat: "100%", label: "of respondents are verified students of the campus" },
        { stat: "0₵", label: "cost to the student or department to participate" },
        { stat: "1 click", label: "from raw responses to a board-ready PDF report" },
        { stat: "Always", label: "anonymous evaluations — honest feedback for faculty" },
      ].map((s, i) => (
        <motion.div key={s.stat} variants={fadeUp} custom={2 + i} className="rounded-2xl border p-6" style={{ borderColor: PALETTE.line, background: PALETTE.bgSoft }}>
          <div className="font-serif text-5xl leading-none" style={{ color: PALETTE.gold }}>{s.stat}</div>
          <p className="mt-4 text-sm leading-relaxed" style={{ color: PALETTE.inkSoft }}>{s.label}</p>
        </motion.div>
      ))}
    </div>
    <motion.p variants={fadeUp} custom={6} className="mt-10 max-w-3xl text-xl" style={{ color: PALETTE.inkSoft }}>
      Better dissertations. Honest lecturer feedback. A research culture that doesn't depend on
      who has the biggest WhatsApp group.
    </motion.p>
  </SlideShell>
);

/* Slide 8 — How it works */
const SlideHow = () => (
  <SlideShell align="start">
    <Kicker>In 60 seconds</Kicker>
    <motion.h2 variants={fadeUp} custom={1} className="mt-6 font-serif text-7xl tracking-tight" style={{ color: PALETTE.ink }}>
      How a student uses it.
    </motion.h2>
    <div className="mt-12 grid w-full grid-cols-4 gap-5">
      {[
        { n: "1", t: "Sign up", p: "with your academic email and verify the link." },
        { n: "2", t: "Answer", p: "surveys from classmates and earn credits." },
        { n: "3", t: "Publish", p: "your own survey — spend credits, target by year or department." },
        { n: "4", t: "Report", p: "click once, download a clean PDF for your supervisor." },
      ].map((s, i) => (
        <motion.div key={s.n} variants={fadeUp} custom={2 + i} className="relative rounded-2xl border p-6" style={{ borderColor: PALETTE.line, background: PALETTE.bgSoft }}>
          <div className="font-serif text-6xl leading-none" style={{ color: PALETTE.primary }}>{s.n}</div>
          <h3 className="mt-4 text-xl font-semibold" style={{ color: PALETTE.ink }}>{s.t}</h3>
          <p className="mt-2 text-base leading-relaxed" style={{ color: PALETTE.inkSoft }}>{s.p}</p>
        </motion.div>
      ))}
    </div>
  </SlideShell>
);

/* Slide 9 — Tech foundation */
const SlideTech = () => (
  <SlideShell align="start">
    <Kicker>Engineering</Kicker>
    <motion.h2 variants={fadeUp} custom={1} className="mt-6 font-serif text-7xl tracking-tight" style={{ color: PALETTE.ink }}>
      A modern, low-cost, edge-deployed stack.
    </motion.h2>
    <div className="mt-12 grid w-full grid-cols-3 gap-6">
      {[
        { icon: Layers, h: "React + TanStack Start", p: "Server-rendered, type-safe routing, instant page loads even on weak networks." },
        { icon: Database, h: "Postgres + row-level security", p: "Industry-standard database with privacy enforced at the data layer." },
        { icon: Globe2, h: "Edge runtime", p: "Hosted on Cloudflare's network — geographically close to West African users, no cold starts." },
      ].map((c, i) => (
        <motion.div key={c.h} variants={fadeUp} custom={2 + i} className="rounded-2xl border p-6" style={{ borderColor: PALETTE.line, background: PALETTE.bgSoft }}>
          <c.icon className="h-7 w-7" style={{ color: PALETTE.gold }} />
          <h3 className="mt-4 text-xl font-semibold" style={{ color: PALETTE.ink }}>{c.h}</h3>
          <p className="mt-2 text-base leading-relaxed" style={{ color: PALETTE.inkSoft }}>{c.p}</p>
        </motion.div>
      ))}
    </div>
    <motion.p variants={fadeUp} custom={6} className="mt-10 max-w-3xl text-lg italic" style={{ color: PALETTE.inkSoft }}>
      Translation: the platform stays fast, stays cheap to run, and stays safe — even at university scale.
    </motion.p>
  </SlideShell>
);

/* Slide 10 — Roadmap */
const SlideRoadmap = () => (
  <SlideShell align="start">
    <Kicker>What's next</Kicker>
    <motion.h2 variants={fadeUp} custom={1} className="mt-6 font-serif text-7xl tracking-tight" style={{ color: PALETTE.ink }}>
      A path from pilot to national.
    </motion.h2>
    <div className="mt-12 w-full space-y-5">
      {[
        { tag: "Now", h: "Pilot with one department", p: "Roll out to a single department; measure response rates and dissertation outcomes vs. baseline." },
        { tag: "Term 2", h: "Campus-wide rollout", p: "Open to every verified student. Add SMS-based credit reminders for users with limited data." },
        { tag: "Year 2", h: "Inter-university network", p: "Federate across Ghanaian universities — collaborative research at a national scale." },
      ].map((s, i) => (
        <motion.div key={s.tag} variants={fadeUp} custom={2 + i} className="flex items-start gap-6 rounded-2xl border p-6" style={{ borderColor: PALETTE.line, background: PALETTE.bgSoft }}>
          <div className="w-28 shrink-0 text-sm font-bold uppercase tracking-[0.22em]" style={{ color: PALETTE.gold }}>{s.tag}</div>
          <div>
            <h3 className="text-2xl font-semibold" style={{ color: PALETTE.ink }}>{s.h}</h3>
            <p className="mt-1 text-base leading-relaxed" style={{ color: PALETTE.inkSoft }}>{s.p}</p>
          </div>
          <TrendingUp className="ml-auto h-6 w-6 shrink-0" style={{ color: PALETTE.green }} />
        </motion.div>
      ))}
    </div>
  </SlideShell>
);

/* Slide 11 — Closing */
const SlideClose = () => (
  <SlideShell>
    <Kicker>The ask</Kicker>
    <motion.h2
      variants={fadeUp}
      custom={1}
      className="mt-8 max-w-5xl font-serif text-[110px] leading-[0.95] tracking-tight"
      style={{ color: PALETTE.ink }}
    >
      Let our students <span style={{ color: PALETTE.primary }}>research</span>{" "}
      like the <span style={{ color: PALETTE.gold }}>world's best.</span>
    </motion.h2>
    <motion.p variants={fadeUp} custom={2} className="mt-10 max-w-2xl text-2xl" style={{ color: PALETTE.inkSoft }}>
      Endorse the pilot. We'll deliver verified data, anonymous feedback, and a research culture
      this campus can be proud of.
    </motion.p>
    <motion.div variants={fadeUp} custom={3} className="mt-14 flex items-center gap-3 text-sm uppercase tracking-[0.3em]" style={{ color: PALETTE.inkSoft }}>
      <span style={{ color: PALETTE.green }}>●</span> Thank you · Questions welcome
    </motion.div>
  </SlideShell>
);

/* ---------- the deck ---------- */
const SLIDES: Slide[] = [
  { id: "title", render: SlideTitle },
  { id: "problem", render: SlideProblem },
  { id: "solution", render: SlideSolution },
  { id: "ghana", render: SlideGhana },
  { id: "features", render: SlideFeatures },
  { id: "security", render: SlideSecurity },
  { id: "value", render: SlideValue },
  { id: "how", render: SlideHow },
  { id: "tech", render: SlideTech },
  { id: "roadmap", render: SlideRoadmap },
  { id: "close", render: SlideClose },
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Home") {
        go(0);
      } else if (e.key === "End") {
        go(total - 1);
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, total]);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const Current = useMemo(() => SLIDES[index].render, [index]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        background: `radial-gradient(1200px 600px at 15% 10%, rgba(233,79,55,0.15), transparent 60%), radial-gradient(900px 500px at 85% 90%, rgba(61,163,93,0.12), transparent 60%), ${PALETTE.bg}`,
        color: PALETTE.ink,
      }}
    >
      {/* subtle grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(247,244,236,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(247,244,236,0.5) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* slide viewport — 16:9 area */}
      <div className="relative mx-auto flex h-screen w-full max-w-[1600px] items-center justify-center">
        <div className="relative h-[min(85vh,900px)] w-[min(95vw,1600px)] overflow-hidden rounded-3xl border" style={{ borderColor: PALETTE.line, background: "rgba(11,16,32,0.55)", backdropFilter: "blur(6px)" }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={SLIDES[index].id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 60 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <motion.div initial="hidden" animate="show" className="h-full w-full">
                <Current />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-8 py-5 text-xs uppercase tracking-[0.25em]" style={{ color: PALETTE.inkSoft }}>
        <span>CampusVerify · Pitch Deck</span>
        <span>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
      </div>

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex items-center justify-between px-8 py-5">
        <button
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:bg-white/5 disabled:opacity-30"
          style={{ borderColor: PALETTE.line, color: PALETTE.ink }}
        >
          <ArrowLeft className="h-4 w-4" /> Prev
        </button>

        {/* progress dots */}
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => go(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? 28 : 8,
                background: i === index ? PALETTE.gold : "rgba(247,244,236,0.25)",
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:bg-white/5"
            style={{ borderColor: PALETTE.line, color: PALETTE.ink }}
            title="Fullscreen (F)"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => go(index + 1)}
            disabled={index === total - 1}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm transition disabled:opacity-30"
            style={{ background: PALETTE.primary, color: PALETTE.ink }}
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
