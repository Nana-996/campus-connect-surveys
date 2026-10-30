import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSurveyFunnel } from "@/lib/survey-funnel.functions";
import { completionPercent } from "@/lib/survey-funnel";

const rate = (count: number, total: number) => {
  const value = completionPercent(count, total);
  return value === null ? "—" : `${value}%`;
};

export function SurveyCompletionPanel() {
  const [days, setDays] = useState<7 | 30 | 90 | 0>(30);
  const fetch = useServerFn(getSurveyFunnel);
  const { data, error, isLoading, isFetching, refetch } = useQuery({ queryKey: ["admin", "survey-funnel", days], queryFn: () => fetch({ data: { days } }) });
  return (
    <section className="space-y-4 border-y border-border py-6" aria-labelledby="survey-completion-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="survey-completion-heading" className="font-serif text-2xl">Survey completion</h2>
        <div className="flex flex-wrap items-center gap-1">
          {([7, 30, 90, 0] as const).map((period) => <Button key={period} size="sm" variant={days === period ? "default" : "outline"} aria-pressed={days === period} onClick={() => setDays(period)}>{period ? `${period} days` : "All time"}</Button>)}
          <Button size="icon" variant="ghost" aria-label="Refresh survey completion" title="Refresh survey completion" disabled={isFetching} onClick={() => void refetch()}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading completion figures…</p> : error || !data ? <p className="text-sm text-destructive">Couldn't load completion figures. Try refreshing.</p> : <>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[{ label: "Started answering", n: data.started }, { label: "Reached signup / login", n: data.signup }, { label: "Submitted", n: data.submitted }, { label: "Completion rate", n: rate(data.submitted, data.started) }].map((item) => <div key={item.label} className="border-l-2 border-primary pl-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 font-serif text-3xl text-primary">{item.n}</p></div>)}
        </div>
        <p className="text-sm text-muted-foreground">Signup / login → submission: <strong className="text-foreground">{rate(data.signup_submitted, data.signup)}</strong> ({data.signup_submitted} of {data.signup}). Started but not submitted: <strong className="text-foreground">{data.started - data.submitted}</strong>.</p>
        {data.started === 0 ? <p className="text-sm text-muted-foreground">No tracked starts in this period. Earlier visits cannot be reconstructed.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><caption className="pb-2 text-left text-xs text-muted-foreground">Top 20 surveys by tracked starts</caption><thead><tr className="border-b border-border text-left"><th className="py-2 pr-4">Survey</th><th className="p-2">Starts</th><th className="p-2">Signup / login</th><th className="p-2">Submitted</th><th className="p-2">Completion</th></tr></thead><tbody>{data.surveys.map((survey) => <tr key={survey.survey_id} className="border-b border-border"><td className="max-w-72 py-3 pr-4 break-words">{survey.title}</td><td className="p-2">{survey.started}</td><td className="p-2">{survey.signup}</td><td className="p-2">{survey.submitted}</td><td className="p-2">{rate(survey.submitted, survey.started)}</td></tr>)}</tbody></table></div>}
        <p className="text-xs leading-relaxed text-muted-foreground">One browser attempt per survey, beginning with the first answer; repeated edits and confirmation reloads do not add starts. Signed-in respondents may skip signup. Submissions count only when saved, not when queued offline. The period groups attempts by their start date; later submissions update that same group. Private surveys are excluded. These are tracked attempts, not unique people; eligibility mismatches and unfinished attempts remain unsubmitted. {data.tracking_since ? `Tracking since ${new Date(data.tracking_since).toLocaleDateString()}.` : "Tracking begins with the first recorded answer."}</p>
      </>}
    </section>
  );
}