import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Coins, GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSchoolPartnership } from "@/lib/school-partnership.functions";
import { siteUrl } from "@/lib/site";

export const Route = createFileRoute("/join/$schoolSlug")({
  loader: ({ params }) => getSchoolPartnership({ data: { slug: params.schoolSlug } }),
  head: ({ params, loaderData }) => {
    const title = loaderData ? `${loaderData.name} × CampusVerify` : "School partnership unavailable — CampusVerify";
    const description = loaderData
      ? `Join the official ${loaderData.name} student community on CampusVerify with your verified academic email.`
      : "This CampusVerify school partnership link is unavailable.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: siteUrl(`/join/${params.schoolSlug}`) },
        { name: "twitter:card", content: "summary" },
        ...(!loaderData ? [{ name: "robots", content: "noindex" }] : []),
      ],
      links: [{ rel: "canonical", href: siteUrl(`/join/${params.schoolSlug}`) }],
    };
  },
  component: SchoolJoinPage,
});

function SchoolJoinPage() {
  const school = Route.useLoaderData();
  if (!school) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="max-w-lg text-center">
          <img src="/logo-mark.png" alt="CampusVerify" className="mx-auto h-14 w-14" />
          <h1 className="mt-5 font-serif text-5xl">This partnership link is unavailable.</h1>
          <p className="mt-3 text-muted-foreground">The school may not be active yet, or its joining link may have changed. Ask your school manager for the current link.</p>
          <Button asChild className="mt-6"><Link to="/">Visit CampusVerify</Link></Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-primary text-primary-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-primary-foreground/20 pb-5">
          <Link to="/" className="flex items-center gap-3 font-serif text-2xl"><img src="/logo-mark.png" alt="CampusVerify" className="h-10 w-10 rounded-md bg-background p-1" />CampusVerify</Link>
          <span className="text-right text-xs font-semibold uppercase tracking-wider opacity-80">Official school partnership</span>
        </header>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:py-16">
          <section>
            <div className="inline-flex items-center gap-2 border border-primary-foreground/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wider"><BadgeCheck className="h-4 w-4" /> Verified partnership</div>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] opacity-75">{school.name} × CampusVerify</p>
            <h1 className="mt-3 max-w-3xl font-serif text-6xl leading-[0.92] sm:text-7xl lg:text-8xl">Your campus research community is here.</h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed opacity-85 sm:text-lg">Join with your {school.name} academic email to answer trusted surveys, earn credits and run research with verified participants.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 bg-highlight px-7 text-highlight-foreground hover:bg-highlight/90"><Link to="/signup" search={{ school: school.slug }}>Create student account</Link></Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-primary-foreground/40 bg-transparent px-7 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/auth" search={{ as: "student", next: "/feed" }}>Already registered? Log in</Link></Button>
            </div>
            <p className="mt-4 text-xs opacity-65">Academic email ending in @{school.domain} required.</p>
          </section>

          <aside className="border border-primary-foreground/25 bg-primary-foreground/8 p-6 sm:p-8">
            <p className="font-serif text-3xl">Your student access includes</p>
            <ul className="mt-6 space-y-5">
              <li className="flex gap-4"><Coins className="mt-0.5 h-6 w-6 shrink-0 text-highlight" /><div><p className="font-semibold">50 welcome credits</p><p className="mt-1 text-sm opacity-75">Start publishing surveys through your school's active plan.</p></div></li>
              <li className="flex gap-4"><ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-highlight" /><div><p className="font-semibold">Verified participation</p><p className="mt-1 text-sm opacity-75">Academic email checks reduce duplicate and unreliable responses.</p></div></li>
              <li className="flex gap-4"><GraduationCap className="mt-0.5 h-6 w-6 shrink-0 text-highlight" /><div><p className="font-semibold">Research built for campus</p><p className="mt-1 text-sm opacity-75">Create studies, reach eligible students and monitor your responses.</p></div></li>
            </ul>
          </aside>
        </div>
        <footer className="border-t border-primary-foreground/20 pt-5 text-xs opacity-65">Verified people. Better research. · campus-verify.live</footer>
      </div>
    </main>
  );
}