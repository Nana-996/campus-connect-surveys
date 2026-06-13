import { createFileRoute, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { SupportCard } from "@/components/SupportHelp";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
  errorComponent: AuthedError,
});

function AuthedError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const navigate = useNavigate();
  const msg = error?.message ?? "";
  const isAuth = /permission denied|jwt|unauthor|401|403|expired/i.test(msg);
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <p className="font-serif text-3xl">{isAuth ? "Your session expired." : "Something went wrong."}</p>
        <p className="mt-2 text-sm text-muted-foreground">{isAuth ? "Please log back in to continue." : msg}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full border border-foreground/30 px-5 py-2 text-sm font-semibold"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthedLayout() {
  const { user, loading, profile, profileError, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }
  if (profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <p className="font-serif text-3xl">We couldn't open your account.</p>
          <p className="mt-2 text-sm text-muted-foreground">{profileError}</p>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
            className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }
  if (!profile) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Setting up your profile...</div>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden pb-20 sm:pb-0">
      <AppHeader />
      <main className="mx-auto min-w-0 max-w-5xl px-4 py-8 sm:px-5 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
