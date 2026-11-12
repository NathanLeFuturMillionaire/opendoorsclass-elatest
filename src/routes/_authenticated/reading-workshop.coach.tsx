import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RwEmpty, RwShell, RwStat } from "@/components/reading-workshop/rw-shell";
import { listRwCoachLearners } from "@/lib/reading-workshop.functions";

export const Route = createFileRoute("/_authenticated/reading-workshop/coach")({
  head: () => ({ meta: [{ title: "Espace coach, Reading Workshop OpenDoorsClass" }] }),
  component: () => (
    <RwShell need="coach" title="Espace coach" subtitle="Vos apprenants et leurs travaux à corriger.">
      <CoachHome />
    </RwShell>
  ),
});

function CoachHome() {
  const fetchLearners = useServerFn(listRwCoachLearners);
  const { data = [] } = useQuery({ queryKey: ["rw-coach-learners"], queryFn: () => fetchLearners() });
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <RwStat label="Apprenants suivis" value={data.length} />
        <RwStat label="Travaux à corriger" value={0} />
        <RwStat label="Travaux validés" value={0} />
      </div>
      {data.length === 0 ? (
        <RwEmpty title="Aucun apprenant pour le moment" text="Les apprenants qui vous sont confiés apparaîtront ici." />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {data.map((l) => (
            <li key={l.id} className="flex items-center justify-between p-4">
              <span className="font-medium">{l.full_name}</span>
              <span className="rounded-full bg-[var(--rw-soft)] px-3 py-1 text-xs font-semibold text-primary">{l.level}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
