import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  BadgeCheck,
  BarChart3,
  Scale,
  NotebookPen,
  BookOpen,
  ArrowUpRight,
  GraduationCap,
  MessageCircleQuestion,
  Send,
  Inbox,
  Trophy,
  Menu,
} from "lucide-react";


export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "CampusVerify — Real research, real classmates, real fast" },
      { name: "description", content: "Run surveys with verified students from your campus or the wider public. Free to use — earn credits by answering surveys, spend them to publish your own." },
      { property: "og:title", content: "CampusVerify — Surveys for verified students" },
      { property: "og:description", content: "A credit-powered survey feed for verified university students. Publish in seconds, get real answers from your campus." },
      { property: "og:url", content: "https://campus-verify.live/" },
    ],
    links: [{ rel: "canonical", href: "https://campus-verify.live/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "Who can sign up?", acceptedAnswer: { "@type": "Answer", text: "Anyone with a valid academic email (.edu, .edu.xx, .ac.xx, .uni.xx) can create a student account. Non-students can sign up as general accounts and reach the wider public audience." } },
            { "@type": "Question", name: "How do credits work?", acceptedAnswer: { "@type": "Answer", text: "You spend credits to publish a survey and earn 1 credit for each quality response you submit. CampusVerify is free to use — every credit you spend comes from answering other people's surveys." } },
            { "@type": "Question", name: "Can I target specific departments?", acceptedAnswer: { "@type": "Answer", text: "Yes — pick the Targeted tier or higher to filter by department, year, country, age range, and interests." } },
            { "@type": "Question", name: "Is my data private?", acceptedAnswer: { "@type": "Answer", text: "Survey creators see responses, not respondent identities beyond what your questions ask. See the Privacy Policy for the full picture." } },
            { "@type": "Question", name: "What if I forgot my password?", acceptedAnswer: { "@type": "Answer", text: "Use the Forgot password link on the login screen. We'll email a secure reset link." } },
          ],
        }),
      },
    ],
  }),
});

function Landing() {
  const { user, loading } = useAuth();
  const isSignedIn = !loading && !!user;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2 font-serif text-3xl text-primary">
          <img
            src="/logo-mark.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8"
          />
          CampusVerify
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:flex">
          <a href="#how-it-works" className="hover:text-foreground">How it works</a>
          <Link to="/about" className="hover:text-foreground">About</Link>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>

        <div className="flex items-center gap-2">
          {/* Desktop auth buttons */}
          <div className="hidden sm:flex items-center gap-2">
            {isSignedIn ? (
              <Link to="/feed">
                <Button className="rounded-full bg-primary px-5">Go to feed <ArrowUpRight className="ml-1 h-4 w-4" /></Button>
              </Link>
            ) : (
              <>
                <Link to="/auth"><Button variant="ghost" className="rounded-full">Log in</Button></Link>
                <Link to="/signup">
                  <Button className="rounded-full bg-primary px-5">Get started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden rounded-full" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-3/4 sm:max-w-sm">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 font-serif text-2xl text-primary text-left">
                  <img
                    src="/logo-mark.png"
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7"
                  />
                  CampusVerify
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <SheetClose asChild>
                  <a href="#how-it-works" className="py-2 hover:text-foreground">How it works</a>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/about" className="py-2 hover:text-foreground">About</Link>
                </SheetClose>
                <SheetClose asChild>
                  <a href="#faq" className="py-2 hover:text-foreground">FAQ</a>
                </SheetClose>
                <div className="my-2 h-px bg-border" />
                {isSignedIn ? (
                  <SheetClose asChild>
                    <Link to="/feed" className="py-2 hover:text-foreground">Go to feed</Link>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link to="/auth" className="py-2 hover:text-foreground">Log in</Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/signup" className="py-2 text-primary hover:text-primary/80">Get started</Link>
                    </SheetClose>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* Hero — one promise only */}
        <section className="flex flex-col items-center py-16 text-center sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shadow-paper">
            <BookOpen className="h-3 w-3" /> For students & researchers
          </span>
          <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[0.95] tracking-tight sm:text-7xl">
            This is where university students and researchers <em className="text-primary">help each other</em> get research responses.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Publish a survey, answer a few in return, and watch real responses roll in from verified classmates.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {isSignedIn ? (
              <Link to="/feed">
                <Button size="lg" className="h-12 rounded-full bg-primary px-7 text-base">
                  Open your feed <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/signup">
                  <Button size="lg" className="h-12 rounded-full bg-primary px-7 text-base">
                    Get started free <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="h-12 rounded-full border-foreground/30 px-7 text-base">
                    I already belong here
                  </Button>
                </Link>
              </>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Students get 10 free credits. General accounts get 5.
          </p>
        </section>

        {/* How it works — three simple steps */}
        <section id="how-it-works" className="scroll-mt-20 rounded-3xl border border-foreground/15 bg-card p-8 sm:p-12 shadow-paper">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">How it works</p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl leading-[0.95]">Give answers. Get answers.</h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <Step n="01" icon={<Send />} title="Publish your survey">
              Write your questions, set who can respond, and hit publish.
            </Step>
            <Step n="02" icon={<Inbox />} title="Answer a few surveys">
              Earn credits by helping other students with their research.
            </Step>
            <Step n="03" icon={<BarChart3 />} title="Collect real responses">
              Watch verified respondents fill your survey — no bots, no randoms.
            </Step>
          </div>
        </section>

        {/* Why this works — three proof points */}
        <section className="mt-4 grid gap-4 sm:grid-cols-3">
          <Tile icon={<BadgeCheck />} title="Verified students only" tone="card">
            Every student account is tied to a real university email.
          </Tile>
          <Tile icon={<Scale />} title="Fair credit exchange" tone="accent">
            Earn credits by answering. Spend them to publish your own surveys.
          </Tile>
          <Tile icon={<NotebookPen />} title="Built for real research" tone="card">
            Clean exports, targeting, and honest data you can actually use.
          </Tile>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-20 scroll-mt-20">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">FAQ</p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl leading-[0.95]">Quick answers</h2>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Faq q="Who can sign up?">
              Anyone with a valid academic email can create a student account. Non-students can join as general accounts.
            </Faq>
            <Faq q="How do credits work?">
              You spend credits to publish and earn 1 credit for each quality response you give.
            </Faq>
            <Faq q="Can I target specific students?">
              Yes — filter by department, year, country, age range, and interests.
            </Faq>
            <Faq q="Is my data private?">
              Creators see responses, not identities beyond what your questions ask. See our{" "}
              <Link to="/privacy" className="font-semibold underline">Privacy Policy</Link>.
            </Faq>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-20 rounded-3xl bg-primary p-10 text-center text-primary-foreground shadow-paper">
          <MessageCircleQuestion className="mx-auto h-8 w-8" />
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl leading-[0.95]">Ready to ask <em>better questions?</em></h2>
          <p className="mx-auto mt-3 max-w-md text-sm opacity-80">
            Join in under a minute and start collecting real responses today.
          </p>
          <div className="mt-6 flex justify-center">
            {isSignedIn ? (
              <Link to="/feed">
                <Button size="lg" className="h-12 rounded-full bg-highlight px-7 text-base text-highlight-foreground hover:bg-highlight/90">
                  Open your feed <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/signup">
                <Button size="lg" className="h-12 rounded-full bg-highlight px-7 text-base text-highlight-foreground hover:bg-highlight/90">
                  Create your account <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="mt-20 border-t border-foreground/15">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <p className="font-serif text-3xl text-primary">CampusVerify</p>
            <p className="mt-2 max-w-xs text-xs text-muted-foreground">
              A credit-powered survey feed for verified university students and the curious general public.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Product</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#how-it-works" className="hover:text-primary">How it works</a></li>
              <li><a href="#about" className="hover:text-primary">About</a></li>
              <li><a href="#faq" className="hover:text-primary">FAQ</a></li>
              <li><Link to="/signup" className="hover:text-primary">Sign up</Link></li>
              <li><Link to="/auth" className="hover:text-primary">Log in</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Legal</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/pricing" className="hover:text-primary">Pricing</Link></li>
              <li><Link to="/terms" className="hover:text-primary">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
              <li><Link to="/refund-policy" className="hover:text-primary">Refund Policy</Link></li>
              <li><Link to="/forgot-password" className="hover:text-primary">Forgot password</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Support</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="https://chat.whatsapp.com/IU9duPqSXvG7Qb2U9IIoR3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-[#25D366]"
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-[#25D366]" />
                  WhatsApp Support
                </a>
              </li>
              <li><Link to="/guide" className="hover:text-primary">User Guide</Link></li>
              <li><Link to="/pitch" className="hover:text-primary">About CampusVerify</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-foreground/10 py-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            © {new Date().getFullYear()} CampusVerify — made on campus
          </p>
        </div>
      </footer>
    </div>
  );
}

function Tile({ icon, title, children, tone }: { icon: React.ReactNode; title: string; children: React.ReactNode; tone: "card" | "accent" }) {
  const cls = tone === "accent"
    ? "bg-accent text-accent-foreground border-foreground/20"
    : "bg-card text-foreground border-foreground/15";
  return (
    <div className={`rounded-3xl border p-6 shadow-paper ${cls}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/60 [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <h2 className="mt-4 font-serif text-2xl leading-tight">{title}</h2>
      <p className="mt-1 text-sm opacity-80">{children}</p>
    </div>
  );
}

function Step({ n, icon, title, children }: { n: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-foreground/15 bg-card p-5 shadow-paper">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">{n}</p>
      <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <h2 className="mt-3 font-serif text-2xl leading-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-foreground/10 pb-3 last:border-0">
      <span className="font-serif text-3xl text-primary">{n}</span>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-foreground/15 bg-card p-5 shadow-paper">
      <summary className="cursor-pointer list-none font-serif text-lg flex items-center justify-between">
        {q}
        <span className="ml-2 text-xs text-muted-foreground transition group-open:rotate-45">＋</span>
      </summary>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{children}</p>
    </details>
  );
}
