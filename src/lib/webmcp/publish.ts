// WebMCP Challenge — added after competition start.
// Not part of pre-existing CampusVerify functionality.
//
// Publishing reuses CampusVerify's existing publish path exactly: the same
// authenticated `surveys` insert Survey Studio performs, as the signed-in user,
// under the same RLS policies and the same database triggers that charge
// credits and enforce targeting rules. No service role, no new endpoint, no
// bypass of any existing check.

import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/auth";
import type { WorkspaceDraft } from "./types";

export type PublishOutcome = { ok: true; surveyId: string } | { ok: false; error: string };

export async function publishDraftAsUser(
  draft: WorkspaceDraft,
  user: { id: string },
  profile: Profile,
): Promise<PublishOutcome> {
  const t = draft.targeting;
  const isGeneral = profile.user_type === "general";

  const required = t.required_criteria.filter((k) =>
    k === "interests"
      ? t.interests.length > 0
      : k === "universities"
        ? t.universities.length > 0
        : isGeneral
          ? k === "country" || k === "age_range"
          : k === "department" || k === "year",
  );

  const { data, error } = await supabase
    .from("surveys")
    .insert({
      creator_id: user.id,
      university_domain: profile.university_domain,
      title: draft.title.trim(),
      description: draft.description.trim(),
      questions: draft.questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text.trim(),
        ...(q.type === "choice" ? { options: q.options ?? [] } : {}),
        required: q.required !== false,
      })) as never,
      tier: draft.tier as never,
      target_department: isGeneral ? null : t.department || null,
      target_year: isGeneral ? null : t.year || null,
      target_country: isGeneral ? t.country || null : null,
      target_age_range: isGeneral ? t.age_range || null : null,
      target_interests: t.interests,
      target_universities: t.universities,
      required_criteria: required,
      response_goal: t.response_goal,
      respondent_bonus: 0,
      min_response_seconds: 15,
      visibility: t.visibility,
      ...(t.expires_at ? { expires_at: t.expires_at } : {}),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, surveyId: (data as { id: string }).id };
}

/** Hand the draft to the existing Survey Studio so the human can edit it there. */
export const STUDIO_DRAFT_KEY = "cv:create-draft:v1";

export function writeDraftToStudio(draft: WorkspaceDraft) {
  if (typeof window === "undefined") return;
  const t = draft.targeting;
  try {
    localStorage.setItem(
      STUDIO_DRAFT_KEY,
      JSON.stringify({
        tier: draft.tier,
        title: draft.title,
        description: draft.description,
        targetDept: t.department,
        targetYear: t.year,
        targetCountry: t.country,
        targetAge: t.age_range,
        targetInterests: t.interests.map((tag) => ({ tag, raw: tag })),
        requiredCriteria: t.required_criteria,
        targetUniversities: t.universities,
        responseGoal: String(t.response_goal),
        expiresAt: "",
        allowGeneral: t.visibility === "everyone",
        visibility: t.visibility,
        questions: draft.questions,
        respondentBonus: 0,
        minResponseSeconds: "15",
      }),
    );
  } catch {
    /* storage unavailable */
  }
}

export const EXPORT_REQUEST_KEY = "cv:webmcp:export-request";
