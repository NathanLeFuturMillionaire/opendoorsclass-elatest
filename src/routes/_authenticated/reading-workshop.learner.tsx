import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RwAvatar, RwShell } from "@/components/reading-workshop/rw-shell";
import { getRwMe } from "@/lib/reading-workshop.functions";
import { Button } from "@/components/ui/button";
import { RW_PROGRAM } from "@/lib/reading-workshop";
import { computeRwProgress } from "@/lib/rw-progress";
import { RwProgressPanel } from "@/components/reading-workshop/rw-progress";
import { useMemo } from "react";
import { RwSubmissionsList, useRwSubmissions } from "@/components/reading-workshop/rw-submissions-list";

export const Route = createFileRoute("/_authenticated/reading-workshop/learner")({
  head: () => ({ meta: [{ title: "Mon espace, Reading Workshop OpenDoorsClass" }] }),
  component: () => (
    <RwShell need="learner" title="Mon espace de lecture" subtitle="Votre niveau, votre progression et vos prochaines lectures.">
      <LearnerHome />
    </RwShell>
  ),
});

function LearnerHome() {
  const fetchMe = useServerFn(getRwMe);
  const { data } = useQuery({ queryKey: ["rw-me"], queryFn: () => fetchMe() });
  const me = data?.learner;
  const { data: subs = [] } = useRwSubmissions("learner");
  const progress = useMemo(() => computeRwProgress(subs, me?.start_date ?? null), [subs, me?.start_date]);
  const week = RW_PROGRAM[progress.currentWeek - 1];
  return (
    <div className="space-y-6">
      {me && (
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-[var(--rw-shadow)] sm:flex-row sm:items-center">
          <RwAvatar name={me.full_name} url={me.photo_url} size={88} />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Bienvenue</p>
            <p className="text-2xl font-extrabold">{me.full_name}</p>
          </div>
          {data?.myCoach && (
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--rw-soft)] px-4 py-3">
              <RwAvatar name={data.myCoach.full_name} url={data.myCoach.photo_url} size={40} />
              <div><p className="text-xs text-muted-foreground">Votre coach</p><p className="font-semibold">{data.myCoach.full_name}</p></div>
            </div>
          )}
        </div>
      )}
      <RwProgressPanel p={progress} />
      <div className="rounded-2xl border border-border bg-card p-4 text-sm"><span className="font-semibold">Niveau {me?.level ?? "non défini"}</span> · Semaine {progress.currentWeek} : {week?.title}</div>
      <Button asChild><Link to="/reading-workshop/library">Ouvrir la bibliothèque</Link></Button>
    </div>
  );
}
