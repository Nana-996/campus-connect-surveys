// WebMCP Challenge — added after competition start.
// Not part of pre-existing CampusVerify functionality.
//
// Browser-facing WebMCP surface.
//
// The challenge targets the W3C Web Model Context API (`navigator.modelContext`,
// the WebMCP proposal): a page registers tools with the *browser*, and an AI
// browser agent (extension / agentic browser) discovers and calls them in the
// user's authenticated tab.
//
// Dependency note: we deliberately add NO npm dependency for this. The API is
// a small, well-defined interface, browsers that support it expose it natively,
// and agents that do not have a native implementation inject their own shim
// before page scripts run. So we only install a local, spec-shaped fallback
// when `navigator.modelContext` is absent — which also makes the tools callable
// from Playwright/unit tests. If a native or agent-provided implementation is
// present we use it untouched.

export type JsonSchema = Record<string, unknown>;

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
};

export type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<ToolResult> | ToolResult;
};

export type ModelContext = {
  registerTool: (tool: WebMcpTool) => { unregister: () => void };
  provideContext?: (ctx: { tools: WebMcpTool[] }) => void;
};

type FallbackModelContext = ModelContext & {
  readonly __campusverifyFallback: true;
  listTools: () => Array<Pick<WebMcpTool, "name" | "description" | "inputSchema" | "annotations">>;
  callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>;
};

const TOOLS_CHANGED = "webmcp:tools-changed";

function createFallback(): FallbackModelContext {
  const tools = new Map<string, WebMcpTool>();
  const changed = () => {
    try {
      window.dispatchEvent(new CustomEvent(TOOLS_CHANGED, { detail: { count: tools.size } }));
    } catch {
      /* non-browser */
    }
  };
  return {
    __campusverifyFallback: true,
    registerTool(tool) {
      tools.set(tool.name, tool);
      changed();
      return {
        unregister() {
          tools.delete(tool.name);
          changed();
        },
      };
    },
    provideContext({ tools: list }) {
      tools.clear();
      for (const t of list) tools.set(t.name, t);
      changed();
    },
    listTools: () =>
      Array.from(tools.values()).map(({ name, description, inputSchema, annotations }) => ({
        name,
        description,
        inputSchema,
        annotations,
      })),
    async callTool(name, args = {}) {
      const tool = tools.get(name);
      if (!tool) return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
      return await tool.execute(args);
    },
  };
}

/**
 * Returns the page's model context, installing a local fallback if needed.
 *
 * The current WebMCP proposal exposes the API on `document.modelContext`.
 * Earlier drafts (and some agent-injected shims) used `navigator.modelContext`,
 * so that location is still accepted as a compatibility fallback — but it is
 * never preferred over `document.modelContext`.
 */
export function getModelContext(): { ctx: ModelContext; native: boolean } | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const doc = document as Document & { modelContext?: ModelContext };
  const nav = (typeof navigator !== "undefined" ? navigator : undefined) as
    | (Navigator & { modelContext?: ModelContext })
    | undefined;

  const existing =
    doc.modelContext && typeof doc.modelContext.registerTool === "function"
      ? doc.modelContext
      : nav?.modelContext && typeof nav.modelContext.registerTool === "function"
        ? nav.modelContext
        : null;

  if (existing) {
    const native = !(existing as Partial<FallbackModelContext>).__campusverifyFallback;
    return { ctx: existing, native };
  }

  const fallback = createFallback();
  let installed = false;
  try {
    Object.defineProperty(doc, "modelContext", { value: fallback, configurable: true, writable: true });
    installed = true;
  } catch {
    /* ignore */
  }
  // Mirror onto navigator for legacy agents/tests that still look there.
  if (nav) {
    try {
      Object.defineProperty(nav, "modelContext", { value: fallback, configurable: true, writable: true });
    } catch {
      /* ignore */
    }
  }
  void installed;
  return { ctx: fallback, native: false };
}


export const TOOLS_CHANGED_EVENT = TOOLS_CHANGED;

/** Convenience helper for building tool results. */
export function textResult(payload: unknown, structured?: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: "text", text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2) }],
    ...(structured ? { structuredContent: structured } : {}),
  };
}

export function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
