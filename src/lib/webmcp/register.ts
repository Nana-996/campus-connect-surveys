// WebMCP Challenge — added after competition start.
// Not part of pre-existing CampusVerify functionality.
//
// Registers the `cv_*` tools with the page's model context for as long as the
// Agent Workspace is mounted, and unregisters them on unmount so an agent can
// never call CampusVerify tools from a page the human has navigated away from.

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getOwnerSurveyResults } from "@/lib/survey-owner.functions";
import { useAuth } from "@/lib/auth";
import { getModelContext } from "./model-context";
import { buildTools } from "./tools";
import { workspaceStore } from "./store";

export type WebMcpStatus = {
  ready: boolean;
  native: boolean;
  toolCount: number;
  toolNames: string[];
};

export function useWebMcpTools(): WebMcpStatus {
  const { user, profile } = useAuth();
  const fetchOwnerResults = useServerFn(getOwnerSurveyResults);
  const [status, setStatus] = useState<WebMcpStatus>({ ready: false, native: false, toolCount: 0, toolNames: [] });

  useEffect(() => {
    const host = getModelContext();
    if (!host) return;
    const tools = buildTools({
      user: user ? { id: user.id } : null,
      profile,
      fetchOwnerResults: fetchOwnerResults as never,
    });
    const handles = tools.map((t) => host.ctx.registerTool(t));
    setStatus({ ready: true, native: host.native, toolCount: tools.length, toolNames: tools.map((t) => t.name) });
    workspaceStore.setAgentPresence(host.native, tools.length);
    return () => {
      handles.forEach((h) => h.unregister());
      workspaceStore.setAgentPresence(false, 0);
    };
  }, [user?.id, profile?.id, profile?.earned_credits, profile?.paid_credits, fetchOwnerResults]);

  return status;
}
