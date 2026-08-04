import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_survey_responses",
  title: "List survey responses",
  description:
    "List the answers collected for a survey the signed-in member owns or is allowed to review. Returns anonymous answer payloads with submission times.",
  inputSchema: {
    survey_id: z.string().describe("The survey id (UUID)."),
    limit: z.number().int().default(50).describe("Maximum number of responses to return (1-200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ survey_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const take = Math.min(Math.max(limit ?? 50, 1), 200);
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("survey_responses")
      .select("id, survey_id, answers, created_at")
      .eq("survey_id", survey_id)
      .order("created_at", { ascending: false })
      .limit(take);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const responses = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(responses, null, 2) }],
      structuredContent: { responses, count: responses.length },
    };
  },
});
