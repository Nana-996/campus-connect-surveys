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
      throw new Error("Survey preview temporarily unavailable.");
    }
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: result, error } = await client.rpc("get_survey_share_card", {
      _survey_id: data.id,
    });
    if (error) {
      console.error("[getSurveyPublic] rpc error", error);
      throw new Error("Survey preview temporarily unavailable.");
    }
    if (!result) return { survey: null, ownerName: null };
    const s = result as Record<string, any>;
    const questions = s.is_evaluation
      ? sanitizeEvaluationQuestions(s.questions ?? [])
      : (s.questions ?? []);
    return {
      survey: {
        id: s.id,
        creator_id: s.creator_id,
        title: s.title,
        description: s.description,
        questions,
        is_evaluation: s.is_evaluation ?? false,
        response_count: s.response_count,
        response_goal: s.response_goal,
        expires_at: s.expires_at,
        target_department: s.target_department,
        target_year: s.target_year,
        is_active: s.is_active,
        visibility: s.visibility ?? "everyone",
      },
      ownerName: s.owner_name || null,
    };
  });


// Internal metadata keys that must never reach respondents on evaluations.
// Stripped from each question and from each option (when options are objects).
const EVAL_INTERNAL_KEYS = new Set([
  "correct_answer",
  "correctAnswer",
  "correct",
  "answer_key",
  "answerKey",
  "rubric",
  "scoring",
  "score",
  "weight",
  "points",
  "explanation",
  "feedback",
  "is_correct",
  "isCorrect",
  "marks",
  "grading",
  "grader_notes",
  "internal_notes",
]);

function stripInternalKeys<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (EVAL_INTERNAL_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out as T;
}

// Sanitize the questions payload for evaluation surveys before it leaves the
// server. Respondents must never see scoring rubrics, correct answers, or
// other grader-only metadata authors may have stashed on each question.
export function sanitizeEvaluationQuestions(questions: unknown): unknown {
  if (!Array.isArray(questions)) return questions;
  return questions.map((q) => {
    if (!q || typeof q !== "object") return q;
    const cleaned = stripInternalKeys(q as Record<string, any>);
    if (Array.isArray(cleaned.options)) {
      cleaned.options = cleaned.options.map((opt: any) =>
        opt && typeof opt === "object" && !Array.isArray(opt)
          ? stripInternalKeys(opt)
          : opt,
      );
    }
    return cleaned;
  });
}

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
        "id, creator_id, title, description, questions, response_count, response_goal, expires_at, target_department, target_year, is_active, university_domain, allow_general_respondents, is_evaluation, allow_response_download",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) {
      console.error("[getSurveyForRespondent] error", error);
      return { survey: null as null, ownerName: null as string | null };
    }
    if (!s) return { survey: null, ownerName: null };

    // Evaluation surveys carry grader-only metadata on each question (correct
    // answers, rubrics, point values). Strip it before returning to the
    // respondent — they should only see question text, type, and options.
    if ((s as any).is_evaluation) {
      (s as any).questions = sanitizeEvaluationQuestions((s as any).questions);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

// Resolves a survey link key (readable slug or legacy UUID) to its id and slug.
export const resolveSurveyLink = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ key: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return { id: null as string | null, slug: null as string | null };
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: rows, error } = await client.rpc("resolve_survey_link", { _key: data.key });
    if (error) {
      console.error("[resolveSurveyLink] rpc error", error);
      return { id: null, slug: null };
    }
    const row = Array.isArray(rows) ? rows[0] : rows;
    return { id: (row?.id as string) ?? null, slug: (row?.slug as string) ?? null };
  });
