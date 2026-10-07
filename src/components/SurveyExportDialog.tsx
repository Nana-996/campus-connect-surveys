import { useEffect, useMemo, useState } from "react";
// WebMCP Challenge addition: lets the Agent Workspace pre-configure this
// existing dialog instead of an agent silently downloading anything.
import { EXPORT_REQUEST_KEY } from "@/lib/webmcp/publish";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, FileArchive, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import {
  computeSurveyStats,
  type ProfileLike,
  type ResponseLike,
  type SurveyLike,
} from "@/lib/report/stats";
import { DEFAULT_REPORT_OPTIONS, safeFileName, type ReportOptions } from "@/lib/report/pdf";
import { downloadBlob, downloadCsv, readableResponseRows, responsesReadableCsv } from "@/lib/report/csv";
import { Switch } from "@/components/ui/switch";

type Kind = "report" | "summary" | "package" | "csv";

const KINDS: Array<{ id: Kind; icon: any; title: string; blurb: string }> = [
  {
    id: "report",
    icon: FileText,
    title: "Research report (PDF)",
    blurb: "Cover, methodology, sample profile, executive summary, every question with charts and tables, cross-tabs and an appendix.",
  },
  {
    id: "summary",
    icon: FileText,
    title: "Summary report (PDF)",
    blurb: "The same report without verbatim quotes, cross-tabs or the appendix — good for a quick share.",
  },
  {
    id: "package",
    icon: FileArchive,
    title: "Research data package (ZIP)",
    blurb: "Wide + long response files, codebook, summary tables, sample profile, cross-tabs, verbatims and a README with citation.",
  },
  {
    id: "csv",
    icon: FileSpreadsheet,
    title: "Responses only (CSV)",
    blurb: "Easy-to-read sheet: numbered respondents, clear dates and the full question wording as column headers.",
  },
];

export function SurveyExportDialog({
  survey,
  rows,
  allRows,
  profiles,
  filtersLabel,
  preparedBy,
}: {
  survey: SurveyLike;
  rows: ResponseLike[];
  allRows: ResponseLike[];
  profiles: Record<string, ProfileLike>;
  filtersLabel: string | null;
  preparedBy?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("report");
  const [busy, setBusy] = useState(false);
  const [useFilters, setUseFilters] = useState(true);
  const [includeVerbatims, setIncludeVerbatims] = useState(true);
  const [verbatimLimit, setVerbatimLimit] = useState(40);
  const [includeCrossTabs, setIncludeCrossTabs] = useState(true);
  const [includeSampleProfile, setIncludeSampleProfile] = useState(true);
  const [includeAppendix, setIncludeAppendix] = useState(true);
  const [includeGraphs, setIncludeGraphs] = useState(true);

  // WebMCP Challenge addition: honour an agent-prepared export request for
  // this survey. It only opens and pre-selects the format — the human presses
  // the export button themselves.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(EXPORT_REQUEST_KEY);
      if (!raw) return;
      const req = JSON.parse(raw) as { surveyId?: string; kind?: Kind };
      if (req?.surveyId !== survey.id) return;
      localStorage.removeItem(EXPORT_REQUEST_KEY);
      if (req.kind && KINDS.some((k) => k.id === req.kind)) setKind(req.kind);
      setOpen(true);
    } catch {
      /* ignore malformed request */
    }
  }, [survey.id]);

  const activeRows = useFilters && filtersLabel ? rows : allRows;
  const base = useMemo(() => safeFileName(survey.title), [survey.title]);

  const preview = useMemo(() => {
    if (!open) return null;
    const { header, body } = readableResponseRows({ survey, rows: activeRows, profiles });
    const stats = computeSurveyStats(survey, activeRows, profiles, allRows.length);
    const chartQ = stats.questions.find((q) => q.question.type !== "text" && q.answered > 0) ?? null;
    return { header, body: body.slice(0, 3), chartQ };
  }, [open, survey, activeRows, profiles, allRows.length]);

  const run = async () => {
    setBusy(true);
    const toastId = toast.loading("Preparing your export…");
    try {
      const stats = computeSurveyStats(survey, activeRows, profiles, allRows.length);
      const label = useFilters ? filtersLabel : null;
      const stamp = new Date().toISOString().slice(0, 10);

      if (kind === "csv") {
        downloadCsv(
          responsesReadableCsv({ survey, stats, rows: activeRows, profiles, filtersLabel: label }),
          `${base}_responses_${stamp}.csv`,
        );
      } else if (kind === "package") {
        const { buildDataPackage } = await import("@/lib/report/csv");
        const blob = await buildDataPackage({ survey, stats, rows: activeRows, profiles, filtersLabel: label });
        downloadBlob(blob, `${base}_data_package_${stamp}.zip`);
      } else {
        const { buildResearchReport } = await import("@/lib/report/pdf");
        const options: ReportOptions =
          kind === "summary"
            ? {
                ...DEFAULT_REPORT_OPTIONS,
                mode: "summary",
                includeVerbatims: false,
                includeCrossTabs: false,
                includeAppendix: false,
                includeSampleProfile,
                filtersLabel: label,
                preparedBy,
              }
            : {
                ...DEFAULT_REPORT_OPTIONS,
                mode: "full",
                includeVerbatims,
                verbatimLimit,
                includeCrossTabs,
                includeSampleProfile,
                includeAppendix,
                filtersLabel: label,
                preparedBy,
              };
        if (!includeGraphs) {
          options.chartTypes = Object.fromEntries(survey.questions.map((q) => [q.id, "none" as const]));
        }
        const blob = await buildResearchReport({ survey, stats, rows: activeRows, options });
        downloadBlob(blob, `${base}_${kind === "summary" ? "summary" : "report"}_${stamp}.pdf`);
      }
      toast.success("Export ready — check your downloads.", { id: toastId });
      setOpen(false);
    } catch (err: any) {
      console.error("[export] failed", err);
      toast.error(err?.message ?? "Couldn't build that export.", { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  const showReportToggles = kind === "report";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full rounded-full">
          <Download className="mr-1 h-3.5 w-3.5" /> Export results
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Export results</DialogTitle>
          <DialogDescription>
            Everything is generated from the responses you can already see. Respondents stay pseudonymous and small subgroups are suppressed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {KINDS.map((k) => {
            const Icon = k.icon;
            const active = kind === k.id;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition-colors ${
                  active ? "border-primary bg-primary/5" : "border-foreground/15 hover:bg-accent/40"
                }`}
              >
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{k.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{k.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3 rounded-2xl border border-foreground/15 bg-secondary/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Options</p>

          <label className="flex items-start gap-2 text-xs">
            <Checkbox checked={useFilters} onCheckedChange={(v) => setUseFilters(!!v)} disabled={!filtersLabel} />
            <span>
              Apply the filters currently on screen
              <span className="block text-muted-foreground">{filtersLabel ? filtersLabel : "No filters active — all responses will be included."}</span>
            </span>
          </label>

          {(kind === "report" || kind === "summary") && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-foreground/15 bg-background p-2.5">
              <span className="text-xs">
                <span className="block font-semibold">Include graphs</span>
                <span className="text-muted-foreground">{includeGraphs ? "Charts with a frequency table under each." : "Compact frequency tables only (count and percent)."}</span>
              </span>
              <Switch checked={includeGraphs} onCheckedChange={setIncludeGraphs} aria-label="Include graphs" />
            </div>
          )}

          {kind !== "csv" && (
            <label className="flex items-start gap-2 text-xs">
              <Checkbox checked={includeSampleProfile} onCheckedChange={(v) => setIncludeSampleProfile(!!v)} disabled={kind === "package"} />
              <span>Include the sample profile (who answered)</span>
            </label>
          )}

          {showReportToggles && (
            <>
              <label className="flex items-start gap-2 text-xs">
                <Checkbox checked={includeVerbatims} onCheckedChange={(v) => setIncludeVerbatims(!!v)} />
                <span>Include verbatim open-text answers</span>
              </label>
              {includeVerbatims && (
                <div className="flex items-center gap-2 pl-6 text-xs">
                  <Label htmlFor="verbatim-limit" className="text-muted-foreground">Max per question</Label>
                  <Input
                    id="verbatim-limit"
                    type="number"
                    min={1}
                    max={500}
                    value={verbatimLimit}
                    onChange={(e) => setVerbatimLimit(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                    className="h-7 w-20 text-xs"
                  />
                </div>
              )}
              <label className="flex items-start gap-2 text-xs">
                <Checkbox checked={includeCrossTabs} onCheckedChange={(v) => setIncludeCrossTabs(!!v)} />
                <span>Include cross-tabulations</span>
              </label>
              <label className="flex items-start gap-2 text-xs">
                <Checkbox checked={includeAppendix} onCheckedChange={(v) => setIncludeAppendix(!!v)} />
                <span>Include the questionnaire appendix and variable map</span>
              </label>
            </>
          )}

          <p className="text-[11px] text-muted-foreground">
            {activeRows.length} response{activeRows.length === 1 ? "" : "s"} will be included.
          </p>
        </div>

        {preview && (
          <div className="space-y-2 rounded-2xl border border-foreground/15 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Preview</p>
            {(kind === "csv" || kind === "package") && (
              preview.body.length === 0 ? (
                <p className="text-xs text-muted-foreground">No responses to show yet.</p>
              ) : (
                <div className="max-h-48 overflow-auto rounded-lg border border-foreground/10">
                  <table className="w-max min-w-full text-[11px]">
                    <thead className="sticky top-0 bg-secondary">
                      <tr>{preview.header.map((h, i) => <th key={i} className="max-w-[180px] truncate px-2 py-1 text-left font-semibold" title={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {preview.body.map((r, ri) => (
                        <tr key={ri} className="border-t border-foreground/10">
                          {r.map((c, ci) => <td key={ci} className="max-w-[180px] truncate px-2 py-1" title={String(c)}>{String(c)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
            {(kind === "report" || kind === "summary") && (
              preview.chartQ ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold">Q{preview.chartQ.index}. {preview.chartQ.question.text}</p>
                  {preview.chartQ.options.slice(0, 5).map((o) => (
                    <div key={o.label} className="flex items-center gap-2 text-[11px]">
                      <span className="w-28 shrink-0 truncate" title={o.label}>{o.label}</span>
                      {includeGraphs && (
                        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${o.pctAnswered}%` }} />
                        </span>
                      )}
                      <span className="ml-auto w-16 shrink-0 text-right tabular-nums text-muted-foreground">{o.count} · {o.pctAnswered}%</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground">Each question in the PDF looks like this{includeGraphs ? ", with a chart" : ", as a table only"}.</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No closed-question answers to chart yet.</p>
              )
            )}
            {kind === "package" && <p className="text-[11px] text-muted-foreground">The ZIP also has the easy-to-read sheet above, analysis files and a codebook.</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy} className="rounded-full">Cancel</Button>
          <Button onClick={run} disabled={busy || activeRows.length === 0} className="rounded-full">
            {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
