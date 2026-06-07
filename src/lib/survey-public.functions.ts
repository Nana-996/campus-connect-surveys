import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";

const inputSchema = z.object({ id: z.string().uuid() });

// Public share-card metadata (no auth). Returns only safe-to-expose fields.
// Uses a public-safe database RPC rather than supabaseAdmin to avoid
// service-role enumeration risk.
export const getSurveyPublic = createServerFn({ method: "GET" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return { survey: null as null, ownerName: null as string | null };
    }
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: result, error } = await client.rpc("get_survey_share_card", {
      _survey_id: data.id,
    });
    if (error || !result) {
      console.error("[getSurveyPublic] rpc error", error);
      return { survey: null, ownerName: null };
    }
    const s = result as Record<string, any>;
    return {
      survey: {
        id: s.id,
        creator_id: s.creator_id,
        title: s.title,
        description: s.description,
        response_count: s.response_count,
        response_goal: s.response_goal,
        expires_at: s.expires_at,
        target_department: s.target_department,
        target_year: s.target_year,
        is_active: s.is_active,
      },
      ownerName: s.owner_name || null,
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
