// WebMCP Challenge — added after competition start.
// Not part of pre-existing CampusVerify functionality.

import { z } from "zod";

export const QUESTION_TYPES = ["text", "choice", "rating"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const questionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(QUESTION_TYPES).default("text"),
  text: z.string().trim().min(3).max(300),
  options: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
  required: z.boolean().default(true),
});
export type DraftQuestion = z.infer<typeof questionSchema> & { id: string };

export const CRITERIA = ["department", "year", "country", "age_range", "interests", "universities"] as const;
export type CriterionKey = (typeof CRITERIA)[number];

export const targetingSchema = z.object({
  department: z.string().trim().max(80).optional(),
  year: z.string().trim().max(40).optional(),
  country: z.string().trim().max(60).optional(),
  age_range: z.string().trim().max(20).optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  universities: z.array(z.string().trim().min(1).max(120)).max(15).optional(),
  required_criteria: z.array(z.enum(CRITERIA)).max(6).optional(),
  response_goal: z.number().int().min(1).max(1000).optional(),
  visibility: z.enum(["campus", "students", "everyone", "private"]).optional(),
  expires_at: z.string().datetime().optional(),
});
export type Targeting = z.infer<typeof targetingSchema>;

export type DraftTargeting = {
  department: string;
  year: string;
  country: string;
  age_range: string;
  interests: string[];
  universities: string[];
  required_criteria: CriterionKey[];
  response_goal: number;
  visibility: "campus" | "students" | "everyone" | "private";
  expires_at: string | null;
};

export type WorkspaceDraft = {
  id: string;
  objective: string;
  title: string;
  description: string;
  questions: DraftQuestion[];
  targeting: DraftTargeting;
  tier: "basic" | "targeted" | "boosted" | "pro";
  updatedAt: number;
  /** Set once published through WebMCP. */
  publishedSurveyId?: string;
};

export type ApprovalKind = "publish" | "save_view";

export type Approval = {
  id: string;
  kind: ApprovalKind;
  /** Hash of the exact configuration being approved. */
  hash: string;
  summary: string;
  details: Array<{ label: string; value: string }>;
  status: "pending" | "approved" | "declined" | "consumed" | "invalidated";
  createdAt: number;
  payload?: Record<string, unknown>;
};

export type LogEntry = {
  id: string;
  at: number;
  tool: string;
  kind: "read" | "proposal" | "consequential";
  summary: string;
  status: "ok" | "error" | "pending-approval" | "blocked";
  detail?: string;
};

export const DEFAULT_TARGETING: DraftTargeting = {
  department: "",
  year: "",
  country: "",
  age_range: "",
  interests: [],
  universities: [],
  required_criteria: [],
  response_goal: 50,
  visibility: "everyone",
  expires_at: null,
};
