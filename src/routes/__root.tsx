import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { registerPwa } from "@/lib/pwa-register";
import { installAutoSync } from "@/lib/offline-sync";
import { captureReferralFromUrl } from "@/lib/referral";
import { SpeedInsights } from "@vercel/speed-insights/react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist. The link may be old or mistyped.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/feed" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Go to the feed
          </Link>
          <Link to="/guide" className="inline-flex rounded-md border border-border px-4 py-2 text-sm font-medium">
            Read the guide
          </Link>
          <Link to="/" className="inline-flex rounded-md border border-border px-4 py-2 text-sm font-medium">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: import("@tanstack/react-router").ErrorComponentProps) {
  const router = useRouter();
  // Log full error for developers; never render raw message to users.
  // eslint-disable-next-line no-console
  console.error("[root-error]", error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">We hit an unexpected error. Please try again.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1f4d33" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "CampusVerify" },
      { title: "CampusVerify — Verified research and surveys" },
      { name: "description", content: "Create surveys, reach relevant respondents, and exchange thoughtful answers for research credits." },
      { property: "og:title", content: "CampusVerify — Verified research and surveys" },
      { name: "twitter:title", content: "CampusVerify — Verified research and surveys" },
      { property: "og:description", content: "A survey platform for students, professional researchers, organisations, and community respondents." },
      { name: "twitter:description", content: "A survey platform for students, professional researchers, organisations, and community respondents." },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "CampusVerify" },
      { name: "google-site-verification", content: "XgYr-RNk68m2cU199kJzvgcweFYbPvQuBUnTK2yPzsg" },
    ],
    links: [
      ...(import.meta.env.PROD ? [{ rel: "manifest", href: "/manifest.webmanifest" }] : []),
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://vwrhclqxuabltajcbmno.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://vwrhclqxuabltajcbmno.supabase.co" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600;700;800&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": "https://campus-verify.live/#organization",
          name: "CampusVerify",
          url: "https://campus-verify.live",
          logo: {
            "@type": "ImageObject",
            url: "https://campus-verify.live/logo-mark.png",
          },
          description: "A credit-powered survey platform for academic, professional, organisational, and community research.",
          parentOrganization: {
            "@type": "Organization",
            name: "Vibe Tribe Organisation",
            address: {
              "@type": "PostalAddress",
              addressCountry: "GH",
            },
          },
          areaServed: "Worldwide",
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "campusverify996@gmail.com",
            availableLanguage: "English",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": "https://campus-verify.live/#website",
          name: "CampusVerify",
          url: "https://campus-verify.live",
          description: "Verified research surveys for students, researchers, organisations, and community respondents.",
          publisher: { "@id": "https://campus-verify.live/#organization" },
          inLanguage: "en",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    captureReferralFromUrl();
    installAutoSync();
    void registerPwa();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <OfflineIndicator />
        <Toaster />
        <SpeedInsights />
      </AuthProvider>
    </QueryClientProvider>
  );
}
