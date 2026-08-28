// WebMCP Challenge — added after competition start.
// Not part of pre-existing CampusVerify functionality.
//
// Session-scoped, in-memory workspace state shared between the WebMCP tools
// and the Agent Workspace UI. Nothing here is persisted to a server; approvals
// live only for the lifetime of the tab so they can never be replayed later.

import { useSyncExternalStore } from "react";
import { configHash } from "./hash";
import { DEFAULT_TARGETING, type Approval, type ApprovalKind, type LogEntry, type WorkspaceDraft } from "./types";

export type AnalysisResult = {
  id: string;
  at: number;
  surveyId: string;
  surveyTitle: string;
  dimension: string;
  groups: Array<{ group: string; n: number; suppressed?: boolean }>;
  summary: string;
  payload: unknown;
};

export type WorkspaceState = {
  objective: string;
  draft: WorkspaceDraft | null;
  approvals: Approval[];
  log: LogEntry[];
  analyses: AnalysisResult[];
  reportRequest: { surveyId: string; surveyTitle: string; kind: string; at: number } | null;
  agentConnected: boolean;
  toolCount: number;
};

const initial: WorkspaceState = {
  objective: "",
  draft: null,
  approvals: [],
  log: [],
  analyses: [],
  reportRequest: null,
  agentConnected: false,
  toolCount: 0,
};

let state: WorkspaceState = initial;
const listeners = new Set<() => void>();

function set(patch: Partial<WorkspaceState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export const workspaceStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  reset() {
    state = { ...initial, log: [], approvals: [], analyses: [] };
    listeners.forEach((l) => l());
  },

  setObjective(objective: string) {
    set({ objective });
  },

  setAgentPresence(agentConnected: boolean, toolCount: number) {
    set({ agentConnected, toolCount });
  },

  log(entry: Omit<LogEntry, "id" | "at">) {
    const item: LogEntry = { ...entry, id: uid(), at: Date.now() };
    set({ log: [item, ...state.log].slice(0, 120) });
    return item;
  },

  setDraft(draft: WorkspaceDraft | null) {
    // Any draft mutation invalidates pending publish approvals: an approval is
    // bound to the exact configuration the human saw.
    const approvals = state.approvals.map((a) =>
      a.kind === "publish" && (a.status === "pending" || a.status === "approved")
        ? { ...a, status: "invalidated" as const }
        : a,
    );
    set({ draft, approvals });
  },

  patchDraft(patch: Partial<WorkspaceDraft>) {
    if (!state.draft) return null;
    const next: WorkspaceDraft = { ...state.draft, ...patch, updatedAt: Date.now() };
    workspaceStore.setDraft(next);
    return next;
  },

  markPublished(surveyId: string) {
    if (!state.draft) return;
    set({ draft: { ...state.draft, publishedSurveyId: surveyId } });
  },

  requestApproval(input: {
    kind: ApprovalKind;
    hash: string;
    summary: string;
    details: Array<{ label: string; value: string }>;
    payload?: Record<string, unknown>;
  }): Approval {
    const approval: Approval = { ...input, id: uid(), status: "pending", createdAt: Date.now() };
    // Only one live approval per kind.
    const approvals = state.approvals.map((a) =>
      a.kind === input.kind && (a.status === "pending" || a.status === "approved")
        ? { ...a, status: "invalidated" as const }
        : a,
    );
    set({ approvals: [approval, ...approvals] });
    return approval;
  },

  decide(id: string, decision: "approved" | "declined") {
    set({ approvals: state.approvals.map((a) => (a.id === id && a.status === "pending" ? { ...a, status: decision } : a)) });
  },

  /**
   * Single-use consumption: the approval must be approved, unconsumed, and its
   * bound hash must still match the current configuration.
   */
  consumeApproval(id: string, currentHash: string): { ok: true; approval: Approval } | { ok: false; reason: string } {
    const approval = state.approvals.find((a) => a.id === id);
    if (!approval) return { ok: false, reason: "Unknown approval id." };
    if (approval.status === "consumed") return { ok: false, reason: "This approval was already used." };
    if (approval.status === "declined") return { ok: false, reason: "The human declined this action." };
    if (approval.status === "invalidated")
      return { ok: false, reason: "The configuration changed after approval — ask for approval again." };
    if (approval.status !== "approved") return { ok: false, reason: "Still waiting for human approval." };
    if (approval.hash !== currentHash)
      return { ok: false, reason: "The configuration changed after approval — ask for approval again." };
    set({ approvals: state.approvals.map((a) => (a.id === id ? { ...a, status: "consumed" as const } : a)) });
    return { ok: true, approval };
  },

  addAnalysis(result: Omit<AnalysisResult, "id" | "at">) {
    const item: AnalysisResult = { ...result, id: uid(), at: Date.now() };
    set({ analyses: [item, ...state.analyses].slice(0, 20) });
    return item;
  },

  setReportRequest(req: WorkspaceState["reportRequest"]) {
    set({ reportRequest: req });
  },
};

export function useWorkspace<T>(select: (s: WorkspaceState) => T): T {
  return useSyncExternalStore(
    workspaceStore.subscribe,
    () => select(workspaceStore.get()),
    () => select(initial),
  );
}

/** Canonical publish payload used for both the approval hash and the insert. */
export function draftPublishConfig(draft: WorkspaceDraft) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    tier: draft.tier,
    questions: draft.questions.map((q) => ({
      type: q.type,
      text: q.text.trim(),
      options: q.options ?? [],
      required: q.required !== false,
    })),
    targeting: draft.targeting,
  };
}

export function draftHash(draft: WorkspaceDraft) {
  return configHash(draftPublishConfig(draft));
}

export const newDraftId = uid;
export { DEFAULT_TARGETING };
