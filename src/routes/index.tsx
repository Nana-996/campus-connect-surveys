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
      { property: "og:url", content: "https://your-domain.com/" },
    ],
    links: [{ rel: "canonical", href: "https://your-domain.com/" }],
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
        <Link to="/" className="font-serif text-3xl text-primary">CampusVerify</Link>

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
                <SheetTitle className="font-serif text-2xl text-primary text-left">CampusVerify</SheetTitle>
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
        {/* Bento hero */}
        <section className="grid gap-4 sm:grid-cols-6 sm:grid-rows-[auto_auto]">
          <div className="sm:col-span-4 sm:row-span-2 rounded-3xl border border-foreground/15 bg-card p-8 sm:p-12 shadow-paper">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-highlight-foreground">
              <BookOpen className="h-3 w-3" /> for curious students
            </span>
            <h1 className="mt-5 font-serif text-5xl leading-[0.95] tracking-tight sm:text-7xl">
              Real research,<br />
              <em className="text-primary">real classmates,</em><br />
              real fast.
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              Run dissertations and side-projects on a feed of verified students from your own campus.
              No bots. No randoms. Just your people answering your questions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
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
                      Claim free credits <ArrowUpRight className="ml-1 h-4 w-4" />
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
          </div>

          <div className="sm:col-span-2 rounded-3xl bg-primary p-6 text-primary-foreground shadow-paper">
            <p className="font-serif text-6xl leading-none">10</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] opacity-80">free credits for students on join</p>
            <div className="mt-6 h-px bg-primary-foreground/20" />
            <p className="mt-4 font-serif text-2xl italic leading-tight">
              "Got 80 responses in two days."
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-wider opacity-70">— psych student, year 3</p>
          </div>

          <div className="sm:col-span-2 rounded-3xl border border-foreground/15 bg-highlight p-6 text-highlight-foreground shadow-paper">
            <BarChart3 className="h-7 w-7" />
            <p className="mt-3 font-serif text-2xl leading-tight">Target by department or year.</p>
            <p className="mt-2 text-sm opacity-80">Your data is finally usable.</p>
          </div>
        </section>

        {/* feature row */}
        <section className="mt-4 grid gap-4 sm:grid-cols-3">
          <Tile icon={<BadgeCheck />} title="Verified-only" tone="card">
            Sign in with your university email. Surveys never leave campus unless you say so.
          </Tile>
          <Tile icon={<Scale />} title="Fair credit economy" tone="accent">
            Earn 1 by answering. Spend to publish. Everyone gives, everyone gets.
          </Tile>
          <Tile icon={<NotebookPen />} title="Built for thesis season" tone="card">
            Clean export, no setup. Hit publish, watch responses land.
          </Tile>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mt-20 scroll-mt-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">How it works</p>
          <h2 className="mt-2 font-serif text-4xl sm:text-5xl leading-[0.95]">Four steps. <em className="text-primary">No friction.</em></h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            <Step n="01" icon={<GraduationCap />} title="Verify">Sign up with your university email. Students get 10 free credits; general accounts get 5.</Step>
            <Step n="02" icon={<Send />} title="Publish">Pick a tier (Basic, Targeted, Boosted, Pro), write questions, hit publish.</Step>
            <Step n="03" icon={<Inbox />} title="Earn">Answer surveys in your feed to earn credits — fund your own research at no cost.</Step>
            <Step n="04" icon={<Trophy />} title="Export">Watch responses land in real time. Export clean data when you're ready.</Step>
          </div>
        </section>

        {/* About */}
        <section id="about" className="mt-20 scroll-mt-20 rounded-3xl border border-foreground/15 bg-card p-8 sm:p-12 shadow-paper">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">About</p>
              <h2 className="mt-2 font-serif text-4xl sm:text-5xl leading-[0.95]">Built on campus, <em className="text-primary">for campus.</em></h2>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                CampusVerify started because thesis season shouldn't mean DMing strangers on WhatsApp. We give university researchers a clean,
                fair way to reach verified peers — and reward respondents for showing up with real answers.
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Every account is tied to a verified email. Every credit moves through a transparent ledger. No bots, no troll farms,
                no third-party advertisers staring over your shoulder.
              </p>
            </div>
            <div className="grid gap-3">
              <Stat n="100%" label="Verified accounts" />
              <Stat n="0" label="Third-party ad trackers" />
              <Stat n="30 days" label="Credit-earn freshness window" />
              <Stat n="Free" label="To join and to use" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-20 scroll-mt-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">FAQ</p>
          <h2 className="mt-2 font-serif text-4xl sm:text-5xl leading-[0.95]">Quick <em className="text-primary">answers.</em></h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Faq q="Who can sign up?">
              Anyone with a valid academic email (.edu, .edu.xx, .ac.xx, .uni.xx) can create a student account. Non-students can sign up as
              general accounts and reach the wider public audience.
            </Faq>
            <Faq q="How do credits work?">
              You spend credits to publish a survey and earn 1 credit for each quality response you submit. CampusVerify is free to use —
              every credit you spend comes from answering other people's surveys.
            </Faq>
            <Faq q="Can I target specific departments?">
              Yes — pick the Targeted tier or higher to filter by department, year, country, age range, and interests.
            </Faq>
            <Faq q="How do I get more credits?">
              Open your feed and answer surveys from other people. Each quality response earns you 1 credit — fuel for your own research.
            </Faq>
            <Faq q="Is my data private?">
              Survey creators see responses, not respondent identities beyond what your questions ask. See the{" "}
              <Link to="/privacy" className="font-semibold underline">Privacy Policy</Link> for the full picture.
            </Faq>
            <Faq q="What if I forgot my password?">
              Use the <Link to="/forgot-password" className="font-semibold underline">Forgot password</Link> link on the login screen.
              We'll email a secure reset link.
            </Faq>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-20 rounded-3xl bg-primary p-10 text-center text-primary-foreground shadow-paper">
          <MessageCircleQuestion className="mx-auto h-8 w-8" />
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl leading-[0.95]">Ready to ask <em>better questions?</em></h2>
          <p className="mx-auto mt-3 max-w-md text-sm opacity-80">
            Sign up in under a minute. Start with free credits. Publish your first survey today.
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
              <li><Link to="/terms" className="hover:text-primary">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
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
      <h3 className="mt-4 font-serif text-2xl leading-tight">{title}</h3>
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
      <h3 className="mt-3 font-serif text-2xl leading-tight">{title}</h3>
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
