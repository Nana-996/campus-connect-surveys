import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>;
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
