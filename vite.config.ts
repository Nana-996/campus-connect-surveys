// @lovable.dev/vite-tanstack-config already includes: tanstackStart, viteReact,
// tailwindcss, tsConfigPaths, cloudflare (build), componentTagger (dev), VITE_*
// injection, @ alias, dedupe, error logger, sandbox detection.
// Pass extra config via defineConfig({ vite: { ... } }).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null, // we register from src/lib/pwa-register.ts under guards
        devOptions: { enabled: false },
        filename: "sw.js",
        includeAssets: ["favicon.ico", "icons/icon-192.png", "icons/icon-512.png"],
        manifest: {
          name: "CampusVerify — Verified student research",
          short_name: "CampusVerify",
          description:
            "Verified student surveys. Cache surveys and answer offline — they sync when you reconnect.",
          theme_color: "#1f4d33",
          background_color: "#f7f3e8",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        },
        workbox: {
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/api\//, /^\/~oauth/, /^\/_server/],
          globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
          runtimeCaching: [
            {
              // HTML navigations — NetworkFirst so updates ship fast.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "cv-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // Google fonts stylesheet
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "StaleWhileRevalidate",
              options: { cacheName: "google-fonts-css" },
            },
            {
              // Google font files
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-files",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
});
