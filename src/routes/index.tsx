import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GraduationCap, ShieldCheck, BarChart3, Coins } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-bold text-primary">
          <GraduationCap className="h-6 w-6" />
          CampusVerify
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost">Log in</Button></Link>
          <Link to="/auth" search={{ mode: "signup" }}><Button>Sign up</Button></Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-16 sm:py-24">
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-6xl">
            Verified student research, <span className="text-primary">made for your campus.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            CampusVerify lets university students run surveys for projects and dissertations — and collect responses
            only from other verified students at their own university.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="h-12 px-6 text-base">Get started — 5 free credits</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="h-12 px-6 text-base">I already have an account</Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-3">
          <Feature icon={<ShieldCheck />} title="Verified students only">
            Sign up with your university email. Surveys are visible only to students on the same campus.
          </Feature>
          <Feature icon={<BarChart3 />} title="Target the right people">
            Filter your audience by department or year group so your data is actually useful.
          </Feature>
          <Feature icon={<Coins />} title="Fair credit system">
            Spend 2 credits to publish, earn 1 credit for every survey you answer. Everyone contributes.
          </Feature>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CampusVerify
      </footer>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
