import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { runScheduledRefresh } from "@/lib/search-console.functions";

export const Route = createFileRoute("/api/public/cron/search-console-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const provided = request.headers.get("x-cron-secret") ?? "";
        if (!secret || provided.length !== secret.length ||
            !timingSafeEqual(Buffer.from(provided), Buffer.from(secret))) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const result = await runScheduledRefresh();
          return Response.json(result);
        } catch (error) {
          console.error("[search-console-cron]", error);
          return Response.json({ error: "Refresh failed" }, { status: 500 });
        }
      },
    },
  },
});
