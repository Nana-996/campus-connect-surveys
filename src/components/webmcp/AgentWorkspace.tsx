// WebMCP Challenge — added after competition start.
// Not part of pre-existing CampusVerify functionality.
//
// The Human + Agent Research Workspace. The human always stays in control:
// they set the objective, edit anything the agent proposes, and are the only
// party that can approve a consequential action.

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  BadgeCheck,
  Ban,
  BookOpen,
  CircleСheckPlaceholder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWebMcpTools } from "@/lib/webmcp/register";
import { useWorkspace, workspaceStore, draftHash } from "@/lib/webmcp/store";
import { writeDraftToStudio } from "@/lib/webmcp/publish";
import type { Approval, LogEntry } from "@/lib/webmcp/types";

export function AgentWorkspace() {
  return null;
}

export type { Approval, LogEntry };
