// WebMCP Challenge — added after competition start.
// Not part of pre-existing CampusVerify functionality.
//
// The `cv_*` browser tools an AI agent can call inside the researcher's own
// authenticated CampusVerify tab. Every tool:
//   - runs as the signed-in user (never accepts a user_id from the agent),
//   - reads only through existing RLS-protected paths / owner-verified server
//     functions,
//   - validates its input with zod,
//   - returns minimised, aggregate-only data with untrusted text wrapped.

import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/auth";
import { errorResult, textResult, type ToolResult, type WebMcpTool } from "./model-context";
import { draftHash, draftPublishConfig, newDraftId, workspaceStore } from "./store";
import { configHash } from "./hash";
import { questionsOf, subgroupCompare, aggregateQuestion, type Dimension } from "./analysis";
import { sanitizeText, untrusted, UNTRUSTED_NOTE } from "./untrusted";
import { DEFAULT_TARGETING, questionSchema, targetingSchema, type DraftQuestion, type WorkspaceDraft } from "./types";
import { publishDraftAsUser, writeDraftToStudio } from "./publish";

export type OwnerResults = Awaited<ReturnType<typeof import("@/lib/survey-owner.functions").getOwnerSurveyResults>>;

export type ToolDeps = {
  user: { id: string } | null;
  profile: Profile | null;
  fetchOwnerResults: (opts: { data: { surveyId: string } }) => Promise<OwnerResults>;
};

type Kind = "read" | "proposal" | "consequential";

const uuid = z.string().uuid();

function ok(kind: Kind, tool: string, summary: string, payload: unknown, structured?: Record<string, unknown>): ToolResult {
  workspaceStore.log({ tool, kind, summary, status: "ok" });
  return textResult(payload, structured);
}

function fail(kind: Kind, tool: string, message: string): ToolResult {
  workspaceStore.log({ tool, kind, summary: message, status: "error" });
  return errorResult(message);
}

function requireAuth(deps: ToolDeps, tool: string, kind: Kind) {
  if (!deps.user || !deps.profile) return fail(kind, tool, "Not signed in to CampusVerify — no research data is available.");
  return null;
}

function parse<T extends z.ZodTypeAny>(schema: T, args: unknown): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const res = schema.safeParse(args ?? {});
  if (res.success) return { ok: true, data: res.data };
  const msg = res.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
  return { ok: false, error: `Invalid input — ${msg}` };
}

function toDraftQuestions(list: Array<z.infer<typeof questionSchema>>): DraftQuestion[] {
  return list.map((q) => ({
    ...q,
    id: q.id ?? newDraftId(),
    text: sanitizeText(q.text, 300),
    options: q.type === "choice" ? (q.options ?? []).map((o) => sanitizeText(o, 120)) : undefined,
  }));
}

function targetingPatch(input: z.infer<typeof targetingSchema>, current = DEFAULT_TARGETING) {
  return {
    ...current,
    ...(input.department !== undefined ? { department: sanitizeText(input.department, 80) } : {}),
    ...(input.year !== undefined ? { year: sanitizeText(input.year, 40) } : {}),
    ...(input.country !== undefined ? { country: sanitizeText(input.country, 60) } : {}),
    ...(input.age_range !== undefined ? { age_range: sanitizeText(input.age_range, 20) } : {}),
    ...(input.interests !== undefined ? { interests: input.interests.map((i) => sanitizeText(i, 40)) } : {}),
    ...(input.universities !== undefined ? { universities: input.universities.map((u) => sanitizeText(u, 120)) } : {}),
    ...(input.required_criteria !== undefined ? { required_criteria: input.required_criteria } : {}),
    ...(input.response_goal !== undefined ? { response_goal: input.response_goal } : {}),
    ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
    ...(input.expires_at !== undefined ? { expires_at: input.expires_at } : {}),
  };
}

const draftSchema = z.object({
  objective: z.string().trim().min(5).max(600),
  title: z.string().trim().min(4).max(140),
  description: z.string().trim().max(600).default(""),
  questions: z.array(questionSchema).min(1).max(25),
  tier: z.enum(["basic", "targeted", "boosted", "pro"]).default("pro"),
});

export function buildTools(deps: ToolDeps): WebMcpTool[] {
  const surveySummary = (s: Record<string, unknown>) => ({
    id: s.id,
    title: untrusted(s.title, 140),
    is_active: s.is_active,
    responses: s.response_count,
    goal: s.response_goal,
    visibility: s.visibility,
    expires_at: s.expires_at,
    created_at: s.created_at,
  });

  const tools: WebMcpTool[] = [
    // ---------------------------------------------------------------- READ
    {
      name: "cv_get_workspace_context",
      description:
        "Read the current CampusVerify research context: who is signed in, their campus and credit balance, the research objective the human typed, and the state of the working survey draft. Read-only.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, openWorldHint: false },
      execute: async () => {
        const guard = requireAuth(deps, "cv_get_workspace_context", "read");
        if (guard) return guard;
        const s = workspaceStore.get();
        const p = deps.profile!;
        const payload = {
          member: {
            name: untrusted(p.full_name, 80),
            account_type: p.user_type ?? "student",
            university: untrusted(p.university_name, 120),
            university_domain: p.university_domain,
            department: untrusted(p.department, 80),
            year: p.year,
            credits: { earned: p.earned_credits, paid: p.paid_credits },
          },
          research_objective: untrusted(s.objective, 600),
          draft: s.draft
            ? {
                id: s.draft.id,
                title: untrusted(s.draft.title, 140),
                question_count: s.draft.questions.length,
                targeting: s.draft.targeting,
                tier: s.draft.tier,
                published_survey_id: s.draft.publishedSurveyId ?? null,
                hash: draftHash(s.draft),
              }
            : null,
          pending_approvals: s.approvals.filter((a) => a.status === "pending" || a.status === "approved").map((a) => ({
            id: a.id,
            kind: a.kind,
            status: a.status,
          })),
          note: UNTRUSTED_NOTE,
        };
        return ok("read", "cv_get_workspace_context", "Read research context", payload, payload);
      },
    },

    {
      name: "cv_list_my_surveys",
      description:
        "List the surveys created by the signed-in researcher with response counts, goals, status and expiry. Read-only, scoped to the signed-in owner.",
      inputSchema: {
        type: "object",
        properties: {
          active_only: { type: "boolean", description: "Only surveys that are currently active." },
          limit: { type: "integer", description: "Maximum surveys to return (1-50)." },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
      execute: async (args) => {
        const guard = requireAuth(deps, "cv_list_my_surveys", "read");
        if (guard) return guard;
        const p = parse(z.object({ active_only: z.boolean().default(false), limit: z.number().int().min(1).max(50).default(20) }), args);
        if (!p.ok) return fail("read", "cv_list_my_surveys", p.error);
        let q = supabase
          .from("surveys")
          .select("id, title, is_active, response_count, response_goal, visibility, expires_at, created_at")
          .eq("creator_id", deps.user!.id)
          .order("created_at", { ascending: false })
          .limit(p.data.limit);
        if (p.data.active_only) q = q.eq("is_active", true);
        const { data, error } = await q;
        if (error) return fail("read", "cv_list_my_surveys", error.message);
        const surveys = (data ?? []).map(surveySummary);
        return ok("read", "cv_list_my_surveys", `Listed ${surveys.length} survey(s)`, { surveys }, { surveys });
      },
    },

    {
      name: "cv_get_survey_progress",
      description:
        "Report collection progress for one survey owned by the signed-in researcher: responses collected, share of the response goal, daily pace and time remaining. Read-only, aggregate only.",
      inputSchema: {
        type: "object",
        properties: { survey_id: { type: "string", description: "Survey id (UUID)." } },
        required: ["survey_id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
      execute: async (args) => {
        const guard = requireAuth(deps, "cv_get_survey_progress", "read");
        if (guard) return guard;
        const p = parse(z.object({ survey_id: uuid }), args);
        if (!p.ok) return fail("read", "cv_get_survey_progress", p.error);
        const { data, error } = await supabase
          .from("surveys")
          .select("id, title, is_active, response_count, response_goal, created_at, expires_at")
          .eq("id", p.data.survey_id)
          .eq("creator_id", deps.user!.id)
          .maybeSingle();
        if (error) return fail("read", "cv_get_survey_progress", error.message);
        if (!data) return fail("read", "cv_get_survey_progress", "Survey not found, or you do not own it.");
        const created = new Date(data.created_at).getTime();
        const days = Math.max(1, (Date.now() - created) / 86_400_000);
        const payload = {
          survey_id: data.id,
          title: untrusted(data.title, 140),
          is_active: data.is_active,
          responses: data.response_count,
          goal: data.response_goal,
          pct_of_goal: data.response_goal ? Number(((data.response_count / data.response_goal) * 100).toFixed(1)) : null,
          responses_per_day: Number((data.response_count / days).toFixed(2)),
          expires_at: data.expires_at,
          goal_met: data.response_count >= data.response_goal,
        };
        return ok("read", "cv_get_survey_progress", `Progress: ${data.response_count}/${data.response_goal}`, payload, payload);
      },
    },

    {
      name: "cv_estimate_audience_reach",
      description:
        "Estimate how many verified CampusVerify members match a proposed targeting configuration. Read-only aggregate counts; no member identities.",
      inputSchema: {
        type: "object",
        properties: {
          department: { type: "string" },
          year: { type: "string" },
          country: { type: "string" },
          age_range: { type: "string" },
          interests: { type: "array", items: { type: "string" } },
          universities: { type: "array", items: { type: "string" } },
          required_criteria: {
            type: "array",
            items: { enum: ["department", "year", "country", "age_range", "interests", "universities"] },
          },
          allow_general: { type: "boolean" },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
      execute: async (args) => {
        const guard = requireAuth(deps, "cv_estimate_audience_reach", "read");
        if (guard) return guard;
        const p = parse(targetingSchema.extend({ allow_general: z.boolean().default(true) }), args);
        if (!p.ok) return fail("read", "cv_estimate_audience_reach", p.error);
        const t = targetingPatch(p.data);
        const { data, error } = await supabase.rpc("estimate_survey_reach" as never, {
          _allow_general: p.data.allow_general,
          _department: t.department || null,
          _year: t.year || null,
          _country: t.country || null,
          _age_range: t.age_range || null,
          _interests: t.interests,
          _required: t.required_criteria,
          _universities: t.universities,
        } as never);
        if (error) return fail("read", "cv_estimate_audience_reach", error.message);
        const payload = { reach: data ?? null, targeting: t };
        return ok("read", "cv_estimate_audience_reach", "Estimated audience reach", payload, payload);
      },
    },

    {
      name: "cv_get_question_results",
      description:
        "Aggregate results for one question of a survey the signed-in researcher owns: choice distributions or rating means. Free-text verbatims are never returned.",
      inputSchema: {
        type: "object",
        properties: {
          survey_id: { type: "string" },
          question_id: { type: "string" },
        },
        required: ["survey_id", "question_id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
      execute: async (args) => {
        const guard = requireAuth(deps, "cv_get_question_results", "read");
        if (guard) return guard;
        const p = parse(z.object({ survey_id: uuid, question_id: z.string().min(1).max(80) }), args);
        if (!p.ok) return fail("read", "cv_get_question_results", p.error);
        const res = await deps.fetchOwnerResults({ data: { surveyId: p.data.survey_id } });
        if (!res.survey) return fail("read", "cv_get_question_results", "Survey not found, or you do not own it.");
        const question = questionsOf(res.survey).find((q) => q.id === p.data.question_id);
        if (!question) return fail("read", "cv_get_question_results", "No such question on that survey.");
        const payload = aggregateQuestion(question, res.responses as never);
        return ok("read", "cv_get_question_results", `Aggregated question results (n=${payload.n})`, payload, { result: payload });
      },
    },

    {
      name: "cv_analyze_subgroups",
      description:
        "Compare answer patterns between respondent subgroups (for example first-year vs final-year students) for a survey the signed-in researcher owns. Returns per-group aggregates only; groups smaller than 3 respondents are suppressed.",
      inputSchema: {
        type: "object",
        properties: {
          survey_id: { type: "string" },
          dimension: { enum: ["department", "year", "country", "age_range"] },
          groups: { type: "array", items: { type: "string" }, description: "Optional subset of group values to compare." },
          question_ids: { type: "array", items: { type: "string" } },
        },
        required: ["survey_id", "dimension"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
      execute: async (args) => {
        const guard = requireAuth(deps, "cv_analyze_subgroups", "read");
        if (guard) return guard;
        const p = parse(
          z.object({
            survey_id: uuid,
            dimension: z.enum(["department", "year", "country", "age_range"]),
            groups: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
            question_ids: z.array(z.string().min(1).max(80)).max(25).optional(),
          }),
          args,
        );
        if (!p.ok) return fail("read", "cv_analyze_subgroups", p.error);
        const res = await deps.fetchOwnerResults({ data: { surveyId: p.data.survey_id } });
        if (!res.survey) return fail("read", "cv_analyze_subgroups", "Survey not found, or you do not own it.");
        const analysis = subgroupCompare({
          questions: questionsOf(res.survey),
          rows: res.responses as never,
          profiles: res.profiles as never,
          dimension: p.data.dimension as Dimension,
          groups: p.data.groups,
          questionIds: p.data.question_ids,
        });
        const title = sanitizeText((res.survey as { title?: string }).title, 140);
        workspaceStore.addAnalysis({
          surveyId: p.data.survey_id,
          surveyTitle: title,
          dimension: p.data.dimension,
          groups: analysis.groups.map((g) => ({ group: g.group, n: g.n, suppressed: "suppressed" in g ? true : undefined })),
          summary: `${p.data.dimension} comparison across ${analysis.groups.length} group(s), n=${analysis.total_responses}`,
          payload: analysis,
        });
        return ok(
          "read",
          "cv_analyze_subgroups",
          `Compared ${analysis.groups.length} group(s) by ${p.data.dimension}`,
          analysis,
          { analysis },
        );
      },
    },

    // ------------------------------------------------------------ PROPOSAL
    {
      name: "cv_propose_survey_draft",
      description:
        "Propose a survey draft (title, description and questions) for the human researcher to review and edit in the Agent Workspace. This only fills the on-screen draft — nothing is published and no credits are spent.",
      inputSchema: {
        type: "object",
        properties: {
          objective: { type: "string", description: "The research objective this survey serves." },
          title: { type: "string" },
          description: { type: "string" },
          tier: { enum: ["basic", "targeted", "boosted", "pro"] },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { enum: ["text", "choice", "rating"] },
                text: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                required: { type: "boolean" },
              },
              required: ["text"],
              additionalProperties: false,
            },
          },
        },
        required: ["objective", "title", "questions"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      execute: async (args) => {
        const guard = requireAuth(deps, "cv_propose_survey_draft", "proposal");
        if (guard) return guard;
        const p = parse(draftSchema, args);
        if (!p.ok) return fail("proposal", "cv_propose_survey_draft", p.error);
        const existing = workspaceStore.get().draft;
        const draft: WorkspaceDraft = {
          id: existing?.id ?? newDraftId(),
          objective: sanitizeText(p.data.objective, 600),
          title: sanitizeText(p.data.title, 140),
          description: sanitizeText(p.data.description, 600),
          questions: toDraftQuestions(p.data.questions),
          targeting: existing?.targeting ?? { ...DEFAULT_TARGETING },
          tier: p.data.tier,
          updatedAt: Date.now(),
        };
        workspaceStore.setDraft(draft);
        if (!workspaceStore.get().objective) workspaceStore.setObjective(draft.objective);
        const payload = {
          status: "draft_proposed_for_human_review",
          draft_id: draft.id,
          draft_hash: draftHash(draft),
          question_count: draft.questions.length,
          next: "The human can edit this draft in the Agent Workspace. Call cv_request_publication_approval when it looks right.",
        };
        return ok("proposal", "cv_propose_survey_draft", `Proposed draft with ${draft.questions.length} question(s)`, payload, payload);
      },
    },

    {
      name: "cv_propose_targeting",
      description:
        "Propose targeting criteria and a response goal for the current draft, and return the estimated reach. Nothing is published; the human can change any of it.",
      inputSchema: {
        type: "object",
        properties: {
          department: { type: "string" },
          year: { type: "string" },
          country: { type: "string" },
          age_range: { type: "string" },
          interests: { type: "array", items: { type: "string" } },
          universities: { type: "array", items: { type: "string" } },
          required_criteria: {
            type: "array",
            items: { enum: ["department", "year", "country", "age_range", "interests", "universities"] },
          },
          response_goal: { type: "integer" },
          visibility: { enum: ["campus", "students", "everyone", "private"] },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      execute: async (args) => {
        const guard = requireAuth(deps, "cv_propose_targeting", "proposal");
        if (guard) return guard;
        const draft = workspaceStore.get().draft;
        if (!draft) return fail("proposal", "cv_propose_targeting", "No draft yet — call cv_propose_survey_draft first.");
        const p = parse(targetingSchema, args);
        if (!p.ok) return fail("proposal", "cv_propose_targeting", p.error);
        const targeting = targetingPatch(p.data, draft.targeting);
        workspaceStore.patchDraft({ targeting });
        const { data } = await supabase.rpc("estimate_survey_reach" as never, {
          _allow_general: targeting.visibility === "everyone",
          _department: targeting.department || null,
          _year: targeting.year || null,
          _country: targeting.country || null,
          _age_range: targeting.age_range || null,
          _interests: targeting.interests,
          _required: targeting.required_criteria,
          _universities: targeting.universities,
        } as never);
        const payload = { status: "targeting_proposed_for_human_review", targeting, estimated_reach: data ?? null };
        return ok("proposal", "cv_propose_targeting", "Proposed targeting + reach estimate", payload, payload);
      },
    },

    {
      name: "cv_revise_draft",
      description:
        "Apply a partial revision to the current draft (title, description, or the full question list). Any revision invalidates a previously granted publication approval.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { enum: ["text", "choice", "rating"] },
                text: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                required: { type: "boolean" },
              },
              required: ["text"],
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      execute: async (args) => {
        const guard = requireAuth(deps, "cv_revise_draft", "proposal");
        if (guard) return guard;
        const draft = workspaceStore.get().draft;
        if (!draft) return fail("proposal", "cv_revise_draft", "No draft to revise.");
        const p = parse(
          z.object({
            title: z.string().trim().min(4).max(140).optional(),
            description: z.string().trim().max(600).optional(),
            questions: z.array(questionSchema).min(1).max(25).optional(),
          }),
          args,
        );
        if (!p.ok) return fail("proposal", "cv_revise_draft", p.error);
        const next = workspaceStore.patchDraft({
          ...(p.data.title !== undefined ? { title: sanitizeText(p.data.title, 140) } : {}),
          ...(p.data.description !== undefined ? { description: sanitizeText(p.data.description, 600) } : {}),
          ...(p.data.questions ? { questions: toDraftQuestions(p.data.questions) } : {}),
        });
        const payload = { status: "draft_revised", draft_hash: next ? draftHash(next) : null };
        return ok("proposal", "cv_revise_draft", "Revised the draft", payload, payload);
      },
    },

    // ------------------------------------------------------- CONSEQUENTIAL
    {
      name: "cv_request_publication_approval",
      description:
        "Ask the human to approve publishing the current draft. Shows a publication summary (questions, targeting, goal, tier, credit cost) in the Agent Workspace and returns an approval id. This does NOT publish anything.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      execute: async () => {
        const guard = requireAuth(deps, "cv_request_publication_approval", "consequential");
        if (guard) return guard;
        const draft = workspaceStore.get().draft;
        if (!draft) return fail("consequential", "cv_request_publication_approval", "No draft to publish.");
        if (draft.publishedSurveyId)
          return fail("consequential", "cv_request_publication_approval", "This draft has already been published.");
        if (!draft.title.trim() || draft.questions.some((q) => !q.text.trim()))
          return fail("consequential", "cv_request_publication_approval", "The draft needs a title and non-empty questions.");
        const t = draft.targeting;
        const approval = workspaceStore.requestApproval({
          kind: "publish",
          hash: draftHash(draft),
          summary: `Publish “${draft.title}”`,
          details: [
            { label: "Questions", value: String(draft.questions.length) },
            { label: "Tier", value: draft.tier },
            { label: "Response goal", value: String(t.response_goal) },
            { label: "Visibility", value: t.visibility },
            {
              label: "Targeting",
              value:
                [t.department, t.year, t.country, t.age_range, t.universities.join(", "), t.interests.join(", ")]
                  .filter(Boolean)
                  .join(" · ") || "No filters",
            },
            { label: "Required criteria", value: t.required_criteria.join(", ") || "None" },
          ],
          payload: { config: draftPublishConfig(draft) },
        });
        workspaceStore.log({
          tool: "cv_request_publication_approval",
          kind: "consequential",
          summary: `Awaiting human approval to publish “${draft.title}”`,
          status: "pending-approval",
        });
        return textResult({
          status: "pending_human_approval",
          approval_id: approval.id,
          draft_hash: approval.hash,
          next: "The human must press Approve in the Agent Workspace. Then call cv_publish_survey with this approval_id.",
        });
      },
    },

    {
      name: "cv_publish_survey",
      description:
        "Publish the approved draft to CampusVerify. Only works with an approval id the human explicitly approved in this session, and only while the draft is byte-for-byte the one that was approved. Single use.",
      inputSchema: {
        type: "object",
        properties: { approval_id: { type: "string" } },
        required: ["approval_id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
      execute: async (args) => {
        const guard = requireAuth(deps, "cv_publish_survey", "consequential");
        if (guard) return guard;
        const p = parse(z.object({ approval_id: z.string().min(8).max(80) }), args);
        if (!p.ok) return fail("consequential", "cv_publish_survey", p.error);
        const draft = workspaceStore.get().draft;
        if (!draft) return fail("consequential", "cv_publish_survey", "No draft to publish.");
        if (draft.publishedSurveyId) return fail("consequential", "cv_publish_survey", "This draft is already published.");
        const consumed = workspaceStore.consumeApproval(p.data.approval_id, draftHash(draft));
        if (!consumed.ok) {
          workspaceStore.log({
            tool: "cv_publish_survey",
            kind: "consequential",
            summary: `Publication blocked — ${consumed.reason}`,
            status: "blocked",
          });
          return errorResult(consumed.reason);
        }
        const result = await publishDraftAsUser(draft, deps.user!, deps.profile!);
        if (!result.ok) return fail("consequential", "cv_publish_survey", result.error);
        workspaceStore.markPublished(result.surveyId);
        const payload = {
          status: "published",
          survey_id: result.surveyId,
          url: typeof window !== "undefined" ? `${window.location.origin}/survey/${result.surveyId}` : null,
        };
        return ok("consequential", "cv_publish_survey", `Published “${draft.title}”`, payload, payload);
      },
    },

    {
      name: "cv_save_analysis_view",
      description:
        "Save a named analysis view (filters + selected questions) on a survey the researcher owns, using CampusVerify's existing saved-views feature. Requires the human to approve it first; call it once to request approval, then again with the approval id.",
      inputSchema: {
        type: "object",
        properties: {
          survey_id: { type: "string" },
          name: { type: "string" },
          config: { type: "object", description: "Saved-view config: { view, filters, hiddenQs }." },
          approval_id: { type: "string" },
        },
        required: ["survey_id", "name"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      execute: async (args) => {
        const guard = requireAuth(deps, "cv_save_analysis_view", "consequential");
        if (guard) return guard;
        const p = parse(
          z.object({
            survey_id: uuid,
            name: z.string().trim().min(2).max(80),
            config: z.record(z.string(), z.unknown()).default({}),
            approval_id: z.string().min(8).max(80).optional(),
          }),
          args,
        );
        if (!p.ok) return fail("consequential", "cv_save_analysis_view", p.error);
        const name = sanitizeText(p.data.name, 80);
        const config = { view: "compare", filters: {}, hiddenQs: [], ...p.data.config };
        const hash = configHash({ survey_id: p.data.survey_id, name, config });

        if (!p.data.approval_id) {
          const approval = workspaceStore.requestApproval({
            kind: "save_view",
            hash,
            summary: `Save analysis view “${name}”`,
            details: [
              { label: "Survey", value: p.data.survey_id },
              { label: "View", value: String(config.view ?? "compare") },
            ],
            payload: { survey_id: p.data.survey_id, name, config },
          });
          workspaceStore.log({
            tool: "cv_save_analysis_view",
            kind: "consequential",
            summary: `Awaiting human approval to save view “${name}”`,
            status: "pending-approval",
          });
          return textResult({ status: "pending_human_approval", approval_id: approval.id });
        }

        const consumed = workspaceStore.consumeApproval(p.data.approval_id, hash);
        if (!consumed.ok) {
          workspaceStore.log({
            tool: "cv_save_analysis_view",
            kind: "consequential",
            summary: `Save view blocked — ${consumed.reason}`,
            status: "blocked",
          });
          return errorResult(consumed.reason);
        }
        const { error } = await supabase
          .from("survey_report_views")
          .insert({ survey_id: p.data.survey_id, creator_id: deps.user!.id, name, config: config as never });
        if (error) return fail("consequential", "cv_save_analysis_view", error.message);
        const payload = { status: "saved", name };
        return ok("consequential", "cv_save_analysis_view", `Saved analysis view “${name}”`, payload, payload);
      },
    },

    {
      name: "cv_prepare_report",
      description:
        "Prepare a research output for a survey the researcher owns by opening CampusVerify's existing export dialog pre-configured with the requested format. The human presses Export — nothing is downloaded or shared automatically.",
      inputSchema: {
        type: "object",
        properties: {
          survey_id: { type: "string" },
          format: { enum: ["report", "summary", "package", "csv"] },
        },
        required: ["survey_id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      execute: async (args) => {
        const guard = requireAuth(deps, "cv_prepare_report", "consequential");
        if (guard) return guard;
        const p = parse(z.object({ survey_id: uuid, format: z.enum(["report", "summary", "package", "csv"]).default("report") }), args);
        if (!p.ok) return fail("consequential", "cv_prepare_report", p.error);
        const { data, error } = await supabase
          .from("surveys")
          .select("id, title")
          .eq("id", p.data.survey_id)
          .eq("creator_id", deps.user!.id)
          .maybeSingle();
        if (error) return fail("consequential", "cv_prepare_report", error.message);
        if (!data) return fail("consequential", "cv_prepare_report", "Survey not found, or you do not own it.");
        workspaceStore.setReportRequest({
          surveyId: data.id,
          surveyTitle: sanitizeText(data.title, 140),
          kind: p.data.format,
          at: Date.now(),
        });
        const payload = {
          status: "export_prepared_for_human",
          survey_id: data.id,
          format: p.data.format,
          next: "The human opens the pre-configured export dialog from the Agent Workspace and downloads it themselves.",
        };
        return ok("consequential", "cv_prepare_report", `Prepared ${p.data.format} export for human review`, payload, payload);
      },
    },
  ];

  return tools;
}

export const TOOL_KINDS: Record<string, Kind> = {
  cv_get_workspace_context: "read",
  cv_list_my_surveys: "read",
  cv_get_survey_progress: "read",
  cv_estimate_audience_reach: "read",
  cv_get_question_results: "read",
  cv_analyze_subgroups: "read",
  cv_propose_survey_draft: "proposal",
  cv_propose_targeting: "proposal",
  cv_revise_draft: "proposal",
  cv_request_publication_approval: "consequential",
  cv_publish_survey: "consequential",
  cv_save_analysis_view: "consequential",
  cv_prepare_report: "consequential",
};
