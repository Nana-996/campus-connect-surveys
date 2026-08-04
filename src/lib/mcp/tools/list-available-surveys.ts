import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_available_surveys",
  title: "List available surveys",
  description:
    "List active surveys the signed-in member is currently eligible to answer, newest first, with their credit reward.",
  inputSchema: {
    limit: z.number().int().default(25).describe("Maximum number of surveys to return (1-100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("surveys")
      .select(
        "id, title, description, respondent_bonus, response_count, response_goal, expires_at, university_domain, target_department, target_year, is_evaluation",
      )
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .neq("creator_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(take);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const surveys = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(surveys, null, 2) }],
      structuredContent: { surveys, count: surveys.length },
    };
  },
});
