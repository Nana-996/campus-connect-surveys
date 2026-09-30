import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Shield, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin-setup")({
  component: AdminSetupPage,
  head: () => ({
    meta: [
      { title: "Admin Setup — CampusVerify" },
      { name: "description", content: "Private CampusVerify administration notice." },
      { property: "og:title", content: "Private administration — CampusVerify" },
      { property: "og:description", content: "CampusVerify platform administration is reserved for the app owner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminSetupPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <Shield className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 font-serif text-3xl">Private administration area.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Platform administration is reserved for the CampusVerify app owner. Admin access cannot be claimed or requested here.
        </p>
        <Link
          to={user ? "/feed" : "/auth"}
          className="mt-5 inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {user ? "Go to feed" : "Log in"} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
