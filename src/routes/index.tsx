import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ShieldCheck, BarChart3, Coins, Sparkles, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/feed" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-serif text-3xl text-primary">CampusVerify</Link>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" className="rounded-full">Log in</Button></Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button className="rounded-full bg-primary px-5">Get started</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* Bento hero */}
        <section className="grid gap-4 sm:grid-cols-6 sm:grid-rows-[auto_auto]">
          <div className="sm:col-span-4 sm:row-span-2 rounded-3xl border border-foreground/15 bg-card p-8 sm:p-12 shadow-paper">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-highlight-foreground">
              <Sparkles className="h-3 w-3" /> for curious students
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
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="h-12 rounded-full bg-primary px-7 text-base">
                  Claim 5 free credits <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="h-12 rounded-full border-foreground/30 px-7 text-base">
                  I already belong here
                </Button>
              </Link>
            </div>
          </div>

          <div className="sm:col-span-2 rounded-3xl bg-primary p-6 text-primary-foreground shadow-paper">
            <p className="font-serif text-6xl leading-none">5</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] opacity-80">free credits on join</p>
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
        <section className="mt-4 grid gap-4 pb-16 sm:grid-cols-3">
          <Tile icon={<ShieldCheck />} title="Verified-only" tone="card">
            Sign in with your university email. Surveys never leave campus.
          </Tile>
          <Tile icon={<Coins />} title="Fair credit economy" tone="accent">
            Earn 1 by answering. Spend 2 to publish. Everyone gives, everyone gets.
          </Tile>
          <Tile icon={<Sparkles />} title="Built for thesis season" tone="card">
            Clean export, no setup. Hit publish, watch responses land.
          </Tile>
        </section>
      </main>

      <footer className="border-t border-foreground/15 py-8 text-center">
        <p className="font-serif text-2xl text-primary">CampusVerify</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          © {new Date().getFullYear()} — made on campus
        </p>
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
