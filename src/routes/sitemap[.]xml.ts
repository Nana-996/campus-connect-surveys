import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://your-domain.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/auth", changefreq: "monthly", priority: "0.5" },
          { path: "/signup", changefreq: "monthly", priority: "0.5" },
          { path: "/forgot-password", changefreq: "monthly", priority: "0.3" },
          { path: "/reset-password", changefreq: "monthly", priority: "0.3" },
          { path: "/privacy", changefreq: "monthly", priority: "0.4" },
          { path: "/terms", changefreq: "monthly", priority: "0.4" },
          { path: "/blog/student-survey-questions-guide", changefreq: "monthly", priority: "0.8" },
        ];

        // Fetch published surveys for dynamic /survey/$id entries
        const { data: surveys } = await supabaseAdmin
          .from("surveys")
          .select("id, created_at")
          .eq("is_active", true);

        if (surveys) {
          for (const s of surveys) {
            entries.push({
              path: `/survey/${s.id}`,
              changefreq: "weekly",
              priority: "0.7",
              lastmod: s.created_at ? new Date(s.created_at).toISOString().slice(0, 10) : undefined,
            });
          }
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
