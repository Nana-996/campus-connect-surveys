// WebMCP Challenge — added after competition start.
// Not part of pre-existing CampusVerify functionality.

import { createFileRoute } from "@tanstack/react-router";
import { AgentWorkspace } from "@/components/webmcp/AgentWorkspace";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({
    meta: [
      { title: "Research Workspace — Human + Agent research on CampusVerify" },
      {
        name: "description",
        content:
          "Collaborate with an AI browser agent on your CampusVerify research: draft surveys, estimate reach, analyse subgroups and approve every publication yourself.",
      },
      { property: "og:title", content: "CampusVerify Research Workspace" },
      {
        property: "og:description",
        content: "Human + agent survey research with explicit approval gates for every consequential action.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentWorkspace,
});
