import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  getSchoolTrackingAdminData,
  grantSchoolSurveyTracking,
  revokeSchoolSurveyTracking,
} from "@/lib/school-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SchoolSurveyTrackingPanel() {
  const queryClient = useQueryClient();
  const fetchData = useServerFn(getSchoolTrackingAdminData);
  const grantAccess = useServerFn(grantSchoolSurveyTracking);
  const revokeAccess = useServerFn(revokeSchoolSurveyTracking);
  const [surveyId, setSurveyId] = useState("");
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<"department" | "university">("department");
  const [department, setDepartment] = useState("");

  const { data, isPending } = useQuery({
    queryKey: ["school-admin", "tracking"],
    queryFn: () => fetchData(),
    retry: false,
  });

  const selectedSurvey = useMemo(
    () => data?.surveys.find((survey) => survey.id === surveyId),
    [data?.surveys, surveyId],
  );

  const grant = useMutation({
    mutationFn: () => grantAccess({ data: {
      surveyId,
      recipientEmail: email,
      scope,
      department: scope === "department" ? department : null,
    } }),
    onSuccess: async () => {
      setEmail("");
      await queryClient.invalidateQueries({ queryKey: ["school-admin", "tracking"] });
      toast.success("Tracking access granted");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not grant access"),
  });

  const revoke = useMutation({
    mutationFn: (grantId: string) => revokeAccess({ data: { grantId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["school-admin", "tracking"] });
      toast.success("Tracking access revoked");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not revoke access"),
  });

  if (isPending) return <p className="text-sm text-muted-foreground">Loading survey tracking…</p>;
  if (!data?.canManage) return <p className="text-sm text-muted-foreground">An active school partnership is required.</p>;

  return (
    <div className="space-y-5">
      <div className="border-l-2 border-primary bg-primary/5 px-4 py-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold">Limited response follow-up</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Recipients see eligible students' index numbers, departments, and response status only. Names, emails, answers, and submission times stay hidden.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-y border-foreground/10 py-5 md:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold">
          Survey
          <Select value={surveyId} onValueChange={setSurveyId}>
            <SelectTrigger><SelectValue placeholder="Choose a school-linked survey" /></SelectTrigger>
            <SelectContent>{data.surveys.map((survey) => <SelectItem key={survey.id} value={survey.id}>{survey.title}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Recipient's registered email
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="lecturer@school.edu" />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          Access scope
          <Select value={scope} onValueChange={(value) => setScope(value as "department" | "university")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="department">One department</SelectItem>
              <SelectItem value="university">University-wide</SelectItem>
            </SelectContent>
          </Select>
        </label>
        {scope === "department" && (
          <label className="space-y-1 text-xs font-semibold">
            Department
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue placeholder="Choose a department" /></SelectTrigger>
              <SelectContent>{data.departments.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </label>
        )}
        <div className="md:col-span-2">
          <Button
            onClick={() => grant.mutate()}
            disabled={!surveyId || !email.trim() || (scope === "department" && !department) || grant.isPending}
          >
            <UserPlus /> {grant.isPending ? "Granting…" : "Grant tracking access"}
          </Button>
          {selectedSurvey && <p className="mt-2 text-xs text-muted-foreground">{selectedSurvey.responseCount}/{selectedSurvey.responseGoal} responses · {selectedSurvey.isActive ? "Live" : "Closed"}</p>}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-2xl">Current access</h2>
        </div>
        <div className="divide-y divide-foreground/10 border-y border-foreground/10">
          {data.grants.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.surveyTitle}</p>
                <p className="truncate text-xs text-muted-foreground">{item.recipientEmail}</p>
                <p className="mt-1 text-xs">{item.scope === "university" ? "University-wide" : item.department}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => revoke.mutate(item.id)} disabled={revoke.isPending}>
                <Trash2 /> Revoke
              </Button>
            </div>
          ))}
          {data.grants.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No tracking access has been granted.</p>}
        </div>
      </div>
    </div>
  );
}