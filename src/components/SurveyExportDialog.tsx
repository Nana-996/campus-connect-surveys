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
import { downloadBlob, downloadCsv, responsesWideCsv } from "@/lib/report/csv";

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
    blurb: "One row per response with demographics and answers, Excel-safe encoding.",
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

  const run = async () => {
    setBusy(true);
    const toastId = toast.loading("Preparing your export…");
    try {
      const stats = computeSurveyStats(survey, activeRows, profiles, allRows.length);
      const label = useFilters ? filtersLabel : null;
      const stamp = new Date().toISOString().slice(0, 10);

      if (kind === "csv") {
        downloadCsv(
          responsesWideCsv({ survey, stats, rows: activeRows, profiles, filtersLabel: label }),
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
