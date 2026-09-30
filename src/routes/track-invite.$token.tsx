import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { acceptTrackingInvite, getTrackingInvite } from "@/lib/survey-access.functions";

export const Route = createFileRoute("/track-invite/$token")({
  loader: async ({ params }) => {
    if (!/^[a-f0-9]{48}$/.test(params.token)) return { invite: null };
    return { invite: await getTrackingInvite({ data: { token: params.token } }) };
  },
  head: () => ({
    meta: [
      { title: "Survey progress invitation · CampusVerify" },
      { name: "description", content: "Accept an invitation to follow a survey's progress on CampusVerify." },
      { property: "og:title", content: "Survey progress invitation · CampusVerify" },
      { property: "og:description", content: "Accept an invitation to follow a survey's progress on CampusVerify." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => <Shell><p>Something went wrong loading this invitation.</p></Shell>,
  notFoundComponent: () => <Shell><p>Invitation not found.</p></Shell>,
  component: TrackInvite,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-foreground/15 bg-card p-8 text-center shadow-paper">
        <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
        <div className="mt-4 space-y-3 text-sm">{children}</div>
      </div>
    </div>
  );
}

function TrackInvite() {
  const { token } = Route.useParams();
  const { invite } = Route.useLoaderData();
  const { user, loading } = useAuth();
  const accept = useServerFn(acceptTrackingInvite);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const next = `/track-invite/${token}`;

  if (!invite) return <Shell><h1 className="font-serif text-3xl">Invitation unavailable</h1><p className="text-muted-foreground">This link is invalid or has been cancelled.</p></Shell>;
  if (invite.status === "revoked") return <Shell><h1 className="font-serif text-3xl">Invitation cancelled</h1><p className="text-muted-foreground">Ask the survey owner to send a new one.</p></Shell>;
  if (invite.status === "expired") return <Shell><h1 className="font-serif text-3xl">Invitation expired</h1><p className="text-muted-foreground">Ask the survey owner to send a new one.</p></Shell>;

  const onAccept = async () => {
    setBusy(true);
    try {
      const res = await accept({ data: { token } });
      toast.success("Access confirmed.");
      navigate({ to: "/manage/$surveyId", params: { surveyId: res.surveyId } });
    } catch (e: any) {
      toast.error(e?.message || "Could not accept the invitation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <h1 className="font-serif text-3xl leading-tight">Follow “{invite.surveyTitle}”</h1>
      <p className="text-muted-foreground"><strong className="text-foreground">{invite.ownerName}</strong> invited <strong className="text-foreground">{invite.maskedEmail}</strong> to view this survey's progress.</p>
      {invite.status === "accepted" && user ? (
        <Link to="/manage/$surveyId" params={{ surveyId: invite.surveyId }}><Button className="w-full rounded-full">Open survey progress</Button></Link>
      ) : loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : user ? (
        <Button className="w-full rounded-full" disabled={busy} onClick={onAccept}>{busy ? "Confirming…" : "Accept invitation"}</Button>
      ) : (
        <>
          <p className="text-muted-foreground">You need a CampusVerify account with the invited email to accept.</p>
          <a href={`/auth?next=${encodeURIComponent(next)}`}><Button className="w-full rounded-full">Sign in to accept</Button></a>
          <a href={`/signup?next=${encodeURIComponent(next)}`} className="block text-xs text-primary underline">New here? Create an account</a>
        </>
      )}
    </Shell>
  );
}
