import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Building2, BadgeCheck, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
  head: () => ({
    meta: [
      { title: "School invitation — CampusVerify" },
      { name: "description", content: "Accept your CampusVerify invitation to join your school as faculty or a lecturer." },
      { property: "og:title", content: "School invitation — CampusVerify" },
      { property: "og:description", content: "Accept your CampusVerify invitation to join your school." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Invite = {
  found: boolean;
  role: "faculty" | "lecturer";
  school_name: string;
  school_domain: string;
  school_active: boolean;
  accepted: boolean;
  revoked: boolean;
  expired: boolean;
};

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data }, { data: session }] = await Promise.all([
        supabase.rpc("get_school_invite" as any, { _token: token }),
        supabase.auth.getSession(),
      ]);
      if (cancelled) return;
      setInvite((data as Invite) ?? null);
      setSignedIn(!!session.session);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const problem = !invite?.found
    ? "This invitation link is not valid."
    : invite.revoked
      ? "This invitation has been revoked."
      : invite.accepted
        ? "This invitation has already been used."
        : invite.expired
          ? "This invitation has expired."
          : !invite.school_active
            ? "This school is not active on CampusVerify right now."
            : null;

  async function accept() {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("accept_school_invite" as any, { _token: token });
      if (error) throw error;
      toast.success(`Welcome to ${invite?.school_name}`);
      navigate({ to: invite?.role === "faculty" ? "/faculty" : "/feed" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not accept this invitation");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-foreground/15 bg-card p-8 text-center">
        {loading ? (
          <p className="text-sm text-muted-foreground">Checking your invitation…</p>
        ) : problem ? (
          <>
            <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-3 font-serif text-3xl">Invitation unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{problem}</p>
            <Link to="/" className="mt-5 inline-block text-sm font-semibold text-primary underline">Back home</Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              {invite!.role === "faculty" ? "Faculty invitation" : "Lecturer invitation"}
            </p>
            <h1 className="mt-1 font-serif text-4xl leading-tight">{invite!.school_name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {invite!.role === "faculty"
                ? "Accepting gives you faculty tracking access for your school's students."
                : "Accepting adds you to your school's lecturer directory for course evaluations."}
            </p>

            {signedIn ? (
              <Button className="mt-6 w-full rounded-full" disabled={busy} onClick={accept}>
                <BadgeCheck className="mr-1.5 h-4 w-4" /> Accept invitation
              </Button>
            ) : (
              <div className="mt-6 space-y-2">
                <p className="text-sm text-muted-foreground">Sign in or create an account to accept.</p>
                <div className="flex gap-2">
                  <Link to="/auth" className="flex-1">
                    <Button variant="outline" className="w-full rounded-full">Sign in</Button>
                  </Link>
                  <Link to="/signup" className="flex-1">
                    <Button className="w-full rounded-full">Create account</Button>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
