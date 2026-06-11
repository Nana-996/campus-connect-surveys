import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { getMyManagerScope, listUniversitySurveys } from "@/lib/manager.functions";

export const Route = createFileRoute("/_authenticated/manage")({
  component: ManagePage,
  errorComponent: ({ error }) => (
    <div className="rounded-3xl border border-foreground/15 bg-card p-8 text-center">
      <p className="font-serif text-2xl">Something went wrong</p>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <p className="text-muted-foreground">Not found.</p>,
});

function ManagePage() {
  const fetchScope = useServerFn(getMyManagerScope);
  const fetchSurveys = useServerFn(listUniversitySurveys);
  const { data: scope, isLoading } = useQuery({ queryKey: ["mgr", "scope"], queryFn: () => fetchScope(), retry: false });
  const { data: surveys = [] } = useQuery({
    queryKey: ["mgr", "surveys"],
    queryFn: () => fetchSurveys(),
    enabled: !!scope?.canAccess,
    retry: false,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!scope?.canAccess) {
    return (
      <div className="rounded-3xl border border-foreground/15 bg-card p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-3 font-serif text-3xl">Managers only.</p>
        <p className="mt-1 text-sm text-muted-foreground">Ask the platform owner to grant you faculty access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Faculty dashboard</p>
        <h1 className="mt-1 font-serif text-5xl leading-[0.95]">
          {scope.university_name ?? "Your university"} <em className="text-primary">tracking.</em>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          See which students in your university responded to each survey. Answer content is confidential.
        </p>
      </div>

      {/* Mobile: card list (Track always visible) */}
      <ul className="space-y-3 md:hidden">
        {surveys.length === 0 && (
          <li className="rounded-2xl border border-foreground/15 bg-card p-6 text-center text-muted-foreground">
            No surveys in your university yet.
          </li>
        )}
        {surveys.map((s) => (
          <li key={s.id} className="rounded-2xl border border-foreground/15 bg-card p-4">
            <p className="font-serif text-lg leading-tight">{s.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.creator_name}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span>{s.response_count}/{s.response_goal} responses</span>
              <span className={s.is_active ? "text-primary font-semibold" : "text-muted-foreground"}>
                {s.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <Link
              to="/manage/$surveyId"
              params={{ surveyId: s.id }}
              className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Track <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-foreground/15 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Survey</th>
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3">Responses</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((s) => (
              <tr key={s.id} className="border-t border-foreground/10">
                <td className="px-4 py-3 font-medium">{s.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.creator_name}</td>
                <td className="px-4 py-3">{s.response_count}/{s.response_goal}</td>
                <td className="px-4 py-3">
                  {s.is_active ? <span className="text-primary">Active</span> : <span className="text-muted-foreground">Inactive</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to="/manage/$surveyId"
                    params={{ surveyId: s.id }}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Track <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
            {surveys.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No surveys in your university yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
