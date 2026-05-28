import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const inputSchema = z.object({ id: z.string().uuid() });

// Public preview of a survey, accessible without auth (share links are public).
// Returns only fields safe to display publicly — no respondent data.
export const getSurveyPublic = createServerFn({ method: "GET" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: s, error } = await supabaseAdmin
      .from("surveys")
      .select(
        "id, creator_id, title, description, questions, response_count, response_goal, expires_at, target_department, target_year, is_active, university_domain, allow_general_respondents",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) {
      console.error("[getSurveyPublic] error", error);
      return { survey: null as null, ownerName: null as string | null };
    }
    if (!s) return { survey: null, ownerName: null };

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name, university_name")
      .eq("id", s.creator_id)
      .maybeSingle();

    return {
      survey: s,
      ownerName: prof?.full_name || prof?.university_name || null,
    };
  });
