import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { bootstrapFirstAdmin, checkAdminExists } from "@/lib/admin.functions";
import { Shield, ArrowRight, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-setup")({
  component: AdminSetupPage,
  head: () => ({
    meta: [
      { title: "Admin Setup — CampusVerify" },
      { name: "description", content: "Claim the first admin role on CampusVerify." },
    ],
  }),
});

function AdminSetupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const bootstrap = useServerFn(bootstrapFirstAdmin);

  const { data: hasAdmin, isLoading: checking } = useQuery({
    queryKey: ["admin-setup", "check"],
    queryFn: async () => {
      try {
        await bootstrap();
        return false; // succeeded → no admin existed before
      } catch (e: any) {
        if (e.message?.includes("already exists")) return true;
        throw e;
      }
    },
    retry: false,
    enabled: !loading && !!user,
  });

  const claim = useMutation({
    mutationFn: async () => {
      const res = await bootstrap();
      return res;
    },
    onSuccess: () => {
      toast.success("You are now the admin.");
      navigate({ to: "/admin" });
    },
    onError: (err: any) => {
      toast.error(err.message ?? "Could not claim admin role.");
    },
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 font-serif text-3xl">Sign in first.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            You need to be logged in to claim the admin role.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Log in <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking admin status…
      </div>
    );
  }

  if (hasAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-serif text-3xl">Admin already exists.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            An admin has already been set up. Contact them if you need access.
          </p>
          <Link
            to="/feed"
            className="mt-5 inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Go to Feed <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <Shield className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 font-serif text-3xl">Claim admin.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          No admin exists yet. As the first user, you can claim this role and
          start managing the platform.
        </p>
        <Button
          className="mt-5 h-11 w-full rounded-full text-base"
          onClick={() => claim.mutate()}
          disabled={claim.isPending}
        >
          {claim.isPending ? "Claiming…" : "Claim admin role"}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          After claiming, go to{" "}
          <Link to="/admin" className="underline">
            /admin
          </Link>{" "}
          to manage users and surveys.
        </p>
      </div>
    </div>
  );
}
