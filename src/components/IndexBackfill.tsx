import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { IdCard } from "lucide-react";
import { updateMyStudentInfo } from "@/lib/manager.functions";

export function IndexBackfill({ currentDepartment }: { currentDepartment: string }) {
  const updateInfo = useServerFn(updateMyStudentInfo);
  const [indexNo, setIndexNo] = useState("");
  const [dept, setDept] = useState(currentDepartment);
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-2">
        <IdCard className="mt-0.5 h-4 w-4 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Add your index / student number</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your faculty managers use this to confirm whether you've responded to surveys. Answer
            content stays private.
          </p>
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              try {
                await updateInfo({
                  data: { index_number: indexNo.trim(), department: dept.trim() || undefined },
                });
                toast.success("Saved — refresh to see it on your card.");
              } catch (err: any) {
                toast.error(err.message || "Could not save");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <div className="flex-1 min-w-[140px]">
              <Label className="text-[10px] uppercase tracking-wider">Index #</Label>
              <Input
                value={indexNo}
                onChange={(e) => setIndexNo(e.target.value)}
                required
                maxLength={32}
                placeholder="e.g. 10876543"
                className="mt-1 h-9 rounded-lg font-mono"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-[10px] uppercase tracking-wider">Department</Label>
              <Input
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                placeholder="e.g. Pharmacy"
                className="mt-1 h-9 rounded-lg"
              />
            </div>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
