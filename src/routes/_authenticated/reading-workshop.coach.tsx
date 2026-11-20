import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RwShell, RwStat } from "@/components/reading-workshop/rw-shell";
import { useMemo, useState } from "react";
import { listRwCoachLearners } from "@/lib/reading-workshop.functions";
import { RwSubmissionsList, useRwSubmissions } from "@/components/reading-workshop/rw-submissions-list";
import { cn } from "@/lib/utils";
import { RwRemoveDialog, useInvalidateRwPeople, type RwRemoveTarget } from "@/components/reading-workshop/rw-remove-dialog";
import { Button } from "@/components/ui/button";
import { UserMinus } from "lucide-react";
import { RwProgressReports } from "@/components/reading-workshop/rw-progress-reports";

export const Route = createFileRoute("/_authenticated/reading-workshop/coach")({
  head: () => ({ meta: [
    { title: "Suivi coach et bilans, Reading Workshop OpenDoorsClass" },
    { name: "description", content: "Corrigez les lectures et suivez la progression hebdomadaire de vos apprenants Reading Workshop." },
    { property: "og:title", content: "Espace coach du Reading Workshop OpenDoorsClass" },
    { property: "og:description", content: "Corrections, alertes et rapports individuels de vos apprenants." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
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
  const [removing, setRemoving] = useState<RwRemoveTarget | null>(null);
  const refresh = useInvalidateRwPeople();
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
      <h3 className="text-xl font-bold">Suivi et rapports de mes apprenants</h3>
      <RwProgressReports learners={data} subs={subs} reportName="suivi-apprenants" />
      <section className="space-y-2">
        <h3 className="text-lg font-bold">Gérer mes apprenants</h3>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
          {data.filter((l) => l.is_active).map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className="font-semibold">{l.full_name} <span className="font-normal text-muted-foreground">· {l.level}</span></span>
              <Button size="sm" variant="ghost" onClick={() => setRemoving({ kind: "learner", id: l.id, name: l.full_name, active: true })}>
                <UserMinus className="mr-1 size-4 text-destructive" /> Retirer
              </Button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Un retrait est réversible : seul un administrateur peut réactiver l'apprenant.</p>
      </section>
      {removing && <RwRemoveDialog target={removing} onClose={() => setRemoving(null)} onDone={refresh} />}
    </div>
  );
}
