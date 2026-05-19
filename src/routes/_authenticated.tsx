import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

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
    <div className="min-h-screen pb-20 sm:pb-0">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
