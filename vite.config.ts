import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { VitePWA } from "vite-plugin-pwa";

const __dirname_ = path.dirname(fileURLToPath(import.meta.url));

const isVercelBuild = process.env.VERCEL === "1" || process.env.VERCEL === "true";

export default defineConfig({
  // React Email pulls htmlparser2 -> entities; pin every import to the hoisted
  // v4.5.0 copy (v5+ removed ./lib/decode.js and breaks SSR).
  vite: {
    resolve: {
      alias: {
      "entities/lib/decode.js": path.resolve(__dirname_, "node_modules/entities/lib/decode.js"),
      "entities/lib/encode.js": path.resolve(__dirname_, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname_, "node_modules/entities"),
      },
    },
  },
  nitro: isVercelBuild
    ? { preset: "vercel" }
    : {
        preset: process.env.NITRO_PRESET || "cloudflare-module",
        output: { dir: "dist", serverDir: "dist/server", publicDir: "dist/client" },
        cloudflare: { nodeCompat: true, deployConfig: true },
      },
  plugins: [
    mcpPlugin(),
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
      navigateFallbackDenylist: [/^\/api\//, /^\/~oauth/, /^\/_server/, /^\/lovable\//, /^\/mcp/, /^\/\.mcp/, /^\/\.well-known\//, /^\/\.lovable\//],
      globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
      runtimeCaching: [
        {
          urlPattern: ({ request }) => request.mode === "navigate",
          handler: "NetworkFirst",
          options: {
            cacheName: "cv-pages",
            networkTimeoutSeconds: 4,
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: "StaleWhileRevalidate",
          options: { cacheName: "google-fonts-css" },
        },
        {
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
});
