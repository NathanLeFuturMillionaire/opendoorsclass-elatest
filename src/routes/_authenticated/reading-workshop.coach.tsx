import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RwShell, RwStat } from "@/components/reading-workshop/rw-shell";
import { useMemo, useState } from "react";
import { listRwCoachLearners } from "@/lib/reading-workshop.functions";
import { RwSubmissionsList, useRwSubmissions } from "@/components/reading-workshop/rw-submissions-list";
import { cn } from "@/lib/utils";
import { RwProgressTable } from "@/components/reading-workshop/rw-progress-table";

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
  const { data: allSubs = [] } = useRwSubmissions("coach");
  // Staff can read every row; the coach space only lists this coach's learners.
  const subs = useMemo(() => { const ids = new Set(data.map((l) => l.id)); return allSubs.filter((x) => ids.has(x.learner_id)); }, [allSubs, data]);
  const [tab, setTab] = useState<"submitted" | "redo" | "validated">("submitted");
  const count = (st: string) => subs.filter((x) => x.status === st).length;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <RwStat label="Apprenants suivis" value={data.length} />
        <RwStat label="Travaux à corriger" value={count("submitted")} />
        <RwStat label="Travaux validés" value={count("validated")} />
      </div>
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {([["submitted", "À corriger"], ["redo", "Reprises demandées"], ["validated", "Validés"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold", tab === k ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>{label} ({count(k)})</button>
          ))}
        </div>
        <RwSubmissionsList items={subs.filter((x) => x.status === tab)} mode="coach" />
      </section>
      <h3 className="text-xl font-bold">Suivi de mes apprenants</h3>
      <RwProgressTable learners={data} subs={subs} reportName="suivi-apprenants" />
    </div>
  );
}
