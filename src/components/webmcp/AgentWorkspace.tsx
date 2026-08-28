// WebMCP Challenge — added after competition start.
// Not part of pre-existing CampusVerify functionality.
//
// The Human + Agent Research Workspace. The human always stays in control:
// they set the objective, may edit anything the agent proposes, and are the
// only party that can approve a consequential action. CampusVerify remains
// fully usable without an agent — this page is additive.

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  BadgeCheck,
  Ban,
  BookOpen,
  ClipboardList,
  FileDown,
  GraduationCap,
  Plug,
  ShieldCheck,
  Target,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWebMcpTools } from "@/lib/webmcp/register";
import { useWorkspace, workspaceStore } from "@/lib/webmcp/store";
import { draftHash } from "@/lib/webmcp/store";
import { writeDraftToStudio, EXPORT_REQUEST_KEY } from "@/lib/webmcp/publish";
import type { Approval, LogEntry } from "@/lib/webmcp/types";

const timeOf = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const KIND_STYLE: Record<LogEntry["kind"], string> = {
  read: "bg-muted text-muted-foreground",
  proposal: "bg-primary/10 text-primary",
  consequential: "bg-destructive/10 text-destructive",
};

function Panel({
  icon: Icon,
  title,
  subtitle,
  children,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-serif text-lg leading-tight">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function ApprovalCard({ approval }: { approval: Approval }) {
  const pending = approval.status === "pending";
  return (
    <div
      className={`rounded-lg border p-4 ${
        pending ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{approval.summary}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">bound to config {approval.hash}</p>
        </div>
        <Badge variant={pending ? "destructive" : "secondary"} className="capitalize">
          {approval.status}
        </Badge>
      </div>
      <dl className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
        {approval.details.map((d) => (
          <div key={d.label} className="flex gap-2">
            <dt className="shrink-0 text-muted-foreground">{d.label}:</dt>
            <dd className="truncate">{d.value}</dd>
          </div>
        ))}
      </dl>
      {pending && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => workspaceStore.decide(approval.id, "approved")}>
            <BadgeCheck className="mr-1.5 h-4 w-4" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => workspaceStore.decide(approval.id, "declined")}>
            <Ban className="mr-1.5 h-4 w-4" /> Decline
          </Button>
          <span className="text-xs text-muted-foreground">
            Single use. Any edit after approval invalidates it.
          </span>
        </div>
      )}
    </div>
  );
}

export function AgentWorkspace() {
  const status = useWebMcpTools();
  const objective = useWorkspace((s) => s.objective);
  const draft = useWorkspace((s) => s.draft);
  const approvals = useWorkspace((s) => s.approvals);
  const log = useWorkspace((s) => s.log);
  const analyses = useWorkspace((s) => s.analyses);
  const reportRequest = useWorkspace((s) => s.reportRequest);
  const [showTools, setShowTools] = useState(false);

  const liveApprovals = approvals.filter((a) => a.status !== "consumed" && a.status !== "declined").slice(0, 3);

  const openExport = () => {
    if (!reportRequest || typeof window === "undefined") return;
    try {
      localStorage.setItem(
        EXPORT_REQUEST_KEY,
        JSON.stringify({ surveyId: reportRequest.surveyId, kind: reportRequest.kind, at: Date.now() }),
      );
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="rounded-xl border bg-gradient-to-br from-primary/10 to-transparent p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl">Research Workspace</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Work with an AI browser agent on your own CampusVerify data. The agent can read your research context and
              propose work — you approve anything that publishes, saves or exports.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={status.ready ? "default" : "secondary"} className="gap-1.5">
              <Plug className="h-3.5 w-3.5" />
              {status.ready
                ? status.native
                  ? `Browser agent surface active · ${status.toolCount} tools`
                  : `Tools published · ${status.toolCount} available`
                : "Initialising"}
            </Badge>
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-4"
              onClick={() => setShowTools((v) => !v)}
            >
              {showTools ? "Hide" : "Show"} exposed tools
            </button>
          </div>
        </div>
        {showTools && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {status.toolNames.map((n) => (
              <code key={n} className="rounded bg-background/70 px-2 py-1 text-[11px]">
                {n}
              </code>
            ))}
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel
            icon={GraduationCap}
            title="Research objective"
            subtitle="What you are trying to find out. The agent reads this as context."
          >
            <Textarea
              value={objective}
              onChange={(e) => workspaceStore.setObjective(e.target.value)}
              rows={3}
              placeholder="e.g. Understand why final-year pharmacy students intend to emigrate after graduation."
            />
          </Panel>

          <Panel
            icon={ClipboardList}
            title="Working draft"
            subtitle="Anything the agent proposes lands here for you to edit."
            action={
              draft ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      writeDraftToStudio(draft);
                    }}
                    asChild
                  >
                    <Link to="/create">Open in Survey Studio</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => workspaceStore.setDraft(null)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : null
            }
          >
            {!draft ? (
              <p className="text-sm text-muted-foreground">
                No draft yet. Ask your agent to propose a survey for your objective, or build one yourself in{" "}
                <Link to="/create" className="underline underline-offset-4">
                  Survey Studio
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3">
                  <Input
                    value={draft.title}
                    onChange={(e) => workspaceStore.patchDraft({ title: e.target.value })}
                    placeholder="Survey title"
                  />
                  <Textarea
                    value={draft.description}
                    onChange={(e) => workspaceStore.patchDraft({ description: e.target.value })}
                    rows={2}
                    placeholder="Short description for respondents"
                  />
                </div>
                <Separator />
                <ol className="space-y-3">
                  {draft.questions.map((q, i) => (
                    <li key={q.id} className="rounded-lg border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Q{i + 1} · {q.type}
                          {q.required !== false ? " · required" : " · optional"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            workspaceStore.patchDraft({
                              questions: draft.questions.filter((x) => x.id !== q.id),
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Input
                        className="mt-2"
                        value={q.text}
                        onChange={(e) =>
                          workspaceStore.patchDraft({
                            questions: draft.questions.map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)),
                          })
                        }
                      />
                      {q.type === "choice" && q.options?.length ? (
                        <p className="mt-2 text-xs text-muted-foreground">Options: {q.options.join(" · ")}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
                <p className="font-mono text-[11px] text-muted-foreground">draft hash {draftHash(draft)}</p>
                {draft.publishedSurveyId && (
                  <p className="text-sm text-primary">
                    Published.{" "}
                    <Link to="/my-surveys" className="underline underline-offset-4">
                      View in My Surveys
                    </Link>
                  </p>
                )}
              </div>
            )}
          </Panel>

          {draft && (
            <Panel icon={Target} title="Proposed targeting" subtitle="Who this survey will be shown to.">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                {[
                  ["Visibility", draft.targeting.visibility],
                  ["Response goal", String(draft.targeting.response_goal)],
                  ["Department", draft.targeting.department || "Any"],
                  ["Year", draft.targeting.year || "Any"],
                  ["Country", draft.targeting.country || "Any"],
                  ["Age range", draft.targeting.age_range || "Any"],
                  ["Universities", draft.targeting.universities.join(", ") || "Any"],
                  ["Required criteria", draft.targeting.required_criteria.join(", ") || "None (all preferred)"],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <span className="shrink-0 text-muted-foreground">{label}:</span>
                    <span className="truncate">{value}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel
            icon={ShieldCheck}
            title="Approvals"
            subtitle="Nothing is published, saved or exported until you press Approve."
          >
            {liveApprovals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No action is waiting on you.</p>
            ) : (
              <div className="space-y-3">
                {liveApprovals.map((a) => (
                  <ApprovalCard key={a.id} approval={a} />
                ))}
              </div>
            )}
          </Panel>

          {analyses.length > 0 && (
            <Panel icon={BookOpen} title="Analysis results" subtitle="Aggregate only — small groups are suppressed.">
              <div className="space-y-3">
                {analyses.slice(0, 5).map((a) => (
                  <div key={a.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{a.surveyTitle}</p>
                      <span className="text-xs text-muted-foreground">{timeOf(a.at)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {a.groups.map((g) => (
                        <Badge key={g.group} variant="secondary">
                          {g.group}: {g.suppressed ? "suppressed" : `n=${g.n}`}
                        </Badge>
                      ))}
                    </div>
                    <Link
                      to="/survey/$id/analyze"
                      params={{ id: a.surveyId }}
                      className="mt-2 inline-block text-sm underline underline-offset-4"
                    >
                      Open full analysis
                    </Link>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {reportRequest && (
            <Panel icon={FileDown} title="Report prepared" subtitle="The agent configured an export — you download it.">
              <p className="text-sm">
                <span className="font-medium">{reportRequest.surveyTitle}</span> · format{" "}
                <span className="capitalize">{reportRequest.kind}</span>
              </p>
              <Button className="mt-3" size="sm" onClick={openExport} asChild>
                <Link to="/survey/$id/analyze" params={{ id: reportRequest.surveyId }}>
                  Open export dialog
                </Link>
              </Button>
            </Panel>
          )}
        </div>

        <aside className="space-y-6">
          <Panel icon={Activity} title="Agent activity" subtitle="Every tool call the agent makes, in order.">
            {log.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agent activity yet.</p>
            ) : (
              <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {log.map((e) => (
                  <li key={e.id} className="rounded-md border bg-background p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-[11px]">{e.tool}</code>
                      <span className="text-[11px] text-muted-foreground">{timeOf(e.at)}</span>
                    </div>
                    <p className="mt-1 text-sm">{e.summary}</p>
                    <div className="mt-1.5 flex gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${KIND_STYLE[e.kind]}`}>{e.kind}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {e.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel icon={ShieldCheck} title="What the agent cannot do">
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>Read participant names, emails or individual answers</li>
              <li>Read free-text verbatims or any survey it does not own</li>
              <li>Run SQL or reach admin, faculty or broadcast features</li>
              <li>Buy credits, pay for Research Boost, or mint share links</li>
              <li>Publish, save or export without your single-use approval</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
