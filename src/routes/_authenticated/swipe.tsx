import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, Zap, Star } from "lucide-react";

type Question = { id: string; type: "text" | "choice" | "rating"; text: string; options?: string[] };
type Survey = {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  questions: Question[];
  target_department: string | null;
  target_year: string | null;
};

export const Route = createFileRoute("/_authenticated/swipe")({
  component: SwipePage,
});

const TONES = [
  "bg-primary text-primary-foreground",
  "bg-highlight text-highlight-foreground",
  "bg-accent text-accent-foreground",
  "bg-card text-foreground",
];

// Only single-question choice/rating surveys are "swipeable" (true 5-sec micro-surveys)
function isSwipeable(s: Survey) {
  if (!Array.isArray(s.questions) || s.questions.length !== 1) return false;
  const q = s.questions[0];
  if (!q) return false;
  if (q.type === "rating") return true;
  if (q.type === "choice" && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 4) return true;
  return false;
}

function SwipePage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [skipCount, setSkipCount] = useState(0);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let active = true;
    (async () => {
      const [{ data, error }, { data: resps, error: rerr }] = await Promise.all([
        supabase.from("surveys").select("*").eq("is_active", true).gt("expires_at", new Date().toISOString()).neq("creator_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("survey_responses").select("survey_id").eq("respondent_id", user.id),
      ]);
      if (!active) return;
      if (error) console.warn("Swipe feed failed.", error);
      if (rerr) console.warn("Answered lookup failed.", rerr);
      const answered = new Set((resps ?? []).map((r: any) => r.survey_id));
      const rows = ((data as unknown as Survey[]) ?? []).filter((s) => !answered.has(s.id) && isSwipeable(s));
      setQueue(rows);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const top = queue[0];

  const advance = () => setQueue((q) => q.slice(1));

  const submit = async (survey: Survey, answer: string, startedAt: number) => {
    if (!user) return;
    const duration = Date.now() - startedAt;
    const { error } = await supabase.from("survey_responses").insert({
      survey_id: survey.id,
      respondent_id: user.id,
      answers: { [survey.questions[0].id]: answer } as any,
      duration_ms: duration,
    });
    if (error) {
      toast.error(error.message ?? "Couldn't save");
      return;
    }
    setAnsweredCount((n) => n + 1);
    toast.success("Answered ✓", { duration: 1200 });
  };

  // Record server-side start time when a new top card is shown so the
  // response trigger can compute trustworthy duration_ms.
  useEffect(() => {
    if (!user || !top) return;
    supabase.rpc("begin_survey_response", { _survey_id: top.id }).then(({ error }) => {
      if (error) console.warn("begin_survey_response failed", error);
    });
  }, [user, top?.id]);


  return (
    <div>
      <Link to="/feed" className="mb-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to feed
      </Link>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">5-second micro-surveys</p>
          <h1 className="mt-1 font-serif text-5xl leading-[0.95] sm:text-6xl">
            <em className="text-primary">Swipe.</em> Decide.
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            One question, one tap. Drag right to answer, left to skip. Each card earns up to <span className="font-semibold text-foreground">+1 credit</span>.
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Answered <span className="text-primary">{answeredCount}</span></span>
          <span>Skipped {skipCount}</span>
        </div>
      </div>

      <div className="relative mx-auto h-[520px] max-w-md">
        {loading ? (
          <CenterMsg>Loading cards…</CenterMsg>
        ) : !top ? (
          <EmptyState answered={answeredCount} />
        ) : (
          queue.slice(0, 3).map((s, i) => (
            <SwipeCard
              key={s.id}
              survey={s}
              depth={i}
              isTop={i === 0}
              tone={TONES[i % TONES.length]}
              onAnswer={(answer, startedAt) => { submit(s, answer, startedAt); advance(); }}
              onSkip={() => { setSkipCount((n) => n + 1); advance(); }}
            />
          )).reverse()
        )}
      </div>
    </div>
  );
}

function CenterMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-foreground/20 bg-card text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function EmptyState({ answered }: { answered: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-foreground/30 bg-card p-8 text-center shadow-paper">
      <Sparkles className="h-10 w-10 text-primary" />
      <p className="mt-4 font-serif text-3xl">All caught up.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {answered > 0 ? `You answered ${answered} cards today.` : "No micro-surveys waiting."}
      </p>
      <Link to="/feed" className="mt-5 inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
        Back to feed
      </Link>
    </div>
  );
}

type SwipeCardProps = {
  survey: Survey;
  depth: number;
  isTop: boolean;
  tone: string;
  onAnswer: (answer: string, startedAt: number) => void;
  onSkip: () => void;
};

function SwipeCard({ survey, depth, isTop, tone, onAnswer, onSkip }: SwipeCardProps) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [leaving, setLeaving] = useState<null | "left" | "right">(null);
  const startedAt = useRef(Date.now());
  const dragRef = useRef<{ id: number | null; sx: number; sy: number } | null>(null);
  const q = survey.questions[0];

  const settle = (dir: "left" | "right" | "none", answer?: string) => {
    if (dir === "none") { setDrag({ x: 0, y: 0 }); return; }
    setLeaving(dir);
    setTimeout(() => {
      if (dir === "right" && answer != null) onAnswer(answer, startedAt.current);
      else onSkip();
    }, 220);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isTop) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || dragRef.current.id !== e.pointerId) return;
    setDrag({ x: e.clientX - dragRef.current.sx, y: e.clientY - dragRef.current.sy });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current || dragRef.current.id !== e.pointerId) return;
    const x = e.clientX - dragRef.current.sx;
    dragRef.current = null;
    if (q.type === "rating" || (q.type === "choice" && q.options && q.options.length > 2)) {
      // For multi-option questions, swiping just skips (use buttons to answer)
      if (x < -110) settle("left");
      else settle("none");
    } else if (q.type === "choice" && q.options && q.options.length === 2) {
      // Binary choice: left = first option, right = second option, small = none
      if (x > 110) settle("right", q.options[1]);
      else if (x < -110) settle("right", q.options[0]);
      else settle("none");
    } else {
      settle("none");
    }
  };

  const rotate = drag.x / 18;
  const opacity = leaving ? 0 : 1;
  const translate = leaving === "left" ? "-120%" : leaving === "right" ? "120%" : `${drag.x}px`;
  const yTranslate = leaving ? "10%" : `${drag.y * 0.3}px`;

  const stackOffset = depth * 10;
  const stackScale = 1 - depth * 0.04;

  const intent = drag.x > 60 ? "right" : drag.x < -60 ? "left" : null;

  return (
    <div
      className={`absolute inset-0 select-none touch-none ${isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
      style={{
        transform: isTop
          ? `translate(${translate}, ${yTranslate}) rotate(${leaving ? (leaving === "left" ? -25 : 25) : rotate}deg)`
          : `translateY(${stackOffset}px) scale(${stackScale})`,
        opacity: isTop ? opacity : 1,
        transition: leaving || !dragRef.current ? "transform 220ms ease-out, opacity 220ms ease-out" : "none",
        zIndex: 10 - depth,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className={`flex h-full flex-col rounded-[2rem] border border-foreground/15 p-7 shadow-paper ${tone}`}>
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">
          <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3" /> Micro-survey</span>
          <span>{survey.target_department ?? "Open"}</span>
        </div>
        <p className="mt-4 line-clamp-1 font-serif text-xl opacity-80">{survey.title}</p>
        <h2 className="mt-3 font-serif text-4xl leading-[1] sm:text-5xl">
          {q.text}
        </h2>

        <div className="mt-auto flex flex-col gap-2">
          {q.type === "rating" ? (
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => isTop && settle("right", String(n))}
                  className="flex h-12 flex-1 items-center justify-center gap-1 rounded-2xl border border-foreground/15 bg-background/15 font-serif text-xl hover:bg-background/30"
                >
                  {n} <Star className="h-3 w-3" />
                </button>
              ))}
            </div>
          ) : (
            (q.options ?? []).map((opt, oi) => (
              <button
                key={oi}
                type="button"
                onClick={() => isTop && settle("right", opt)}
                className="rounded-2xl border border-foreground/15 bg-background/15 px-4 py-3 text-left text-sm font-semibold hover:bg-background/30"
              >
                {opt}
              </button>
            ))
          )}
          <button
            type="button"
            onClick={() => isTop && settle("left")}
            className="mt-1 rounded-full border border-foreground/20 px-4 py-2 text-[11px] font-bold uppercase tracking-widest opacity-70 hover:opacity-100"
          >
            Skip
          </button>
        </div>

        {isTop && intent === "right" && q.type === "choice" && q.options?.length === 2 && (
          <Badge label={`→ ${q.options[1]}`} tint="bg-primary text-primary-foreground" position="right" />
        )}
        {isTop && intent === "left" && q.type === "choice" && q.options?.length === 2 && (
          <Badge label={`← ${q.options[0]}`} tint="bg-highlight text-highlight-foreground" position="left" />
        )}
        {isTop && intent === "left" && !(q.type === "choice" && q.options?.length === 2) && (
          <Badge label="Skip" tint="bg-destructive text-destructive-foreground" position="left" />
        )}
      </div>
    </div>
  );
}

function Badge({ label, tint, position }: { label: string; tint: string; position: "left" | "right" }) {
  return (
    <span
      className={`absolute top-6 ${position === "left" ? "left-6 -rotate-12" : "right-6 rotate-12"} rounded-full ${tint} px-4 py-1 text-xs font-bold uppercase tracking-widest shadow-paper`}
    >
      {label}
    </span>
  );
}
