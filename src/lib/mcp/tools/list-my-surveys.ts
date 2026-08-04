import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_surveys",
  title: "List my surveys",
  description:
    "List surveys created by the signed-in member, with response counts, goals, status and expiry. Optionally filter to active surveys only.",
  inputSchema: {
    active_only: z.boolean().default(false).describe("Only return surveys that are currently active."),
    limit: z.number().int().default(25).describe("Maximum number of surveys to return (1-100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ active_only, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("surveys")
      .select(
        "id, title, description, is_active, is_evaluation, tier, response_count, response_goal, expires_at, created_at, university_domain, target_department, target_year",
      )
      .eq("creator_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(take);

    if (active_only) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const surveys = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(surveys, null, 2) }],
      structuredContent: { surveys, count: surveys.length },
    };
  },
});
