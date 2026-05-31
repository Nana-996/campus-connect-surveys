import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const inputSchema = z.object({ id: z.string().uuid() });

// Public preview of a survey (no auth). Returns only metadata safe to expose
// on a share link — NO questions, NO inactive surveys. Used to render the
// "Verify to view the questions" landing card.
export const getSurveyPublic = createServerFn({ method: "GET" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: s, error } = await supabaseAdmin
      .from("surveys")
      .select(
        "id, creator_id, title, description, response_count, response_goal, expires_at, target_department, target_year, is_active",
      )
      .eq("id", data.id)
      .eq("is_active", true)
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

// Authenticated fetch — returns the full survey including questions.
// RLS is enforced via the user-scoped supabase client from auth middleware,
// so targeting (university domain, dept, year, etc.) is honored.
export const getSurveyForRespondent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: s, error } = await supabase
      .from("surveys")
      .select(
        "id, creator_id, title, description, questions, response_count, response_goal, expires_at, target_department, target_year, is_active, university_domain, allow_general_respondents",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) {
      console.error("[getSurveyForRespondent] error", error);
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
