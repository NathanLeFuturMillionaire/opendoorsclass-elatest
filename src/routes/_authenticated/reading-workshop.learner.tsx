import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RwAvatar, RwShell, RwStat } from "@/components/reading-workshop/rw-shell";
import { getRwMe } from "@/lib/reading-workshop.functions";
import { Button } from "@/components/ui/button";
import { RW_PROGRAM } from "@/lib/reading-workshop";
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
  const total = RW_PROGRAM.length * 6;
  const me = data?.learner;
  const { data: subs = [] } = useRwSubmissions("learner");
  const validated = new Set(subs.filter((x) => x.status === "validated").map((x) => x.lesson_id)).size;
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
      <div className="grid gap-4 sm:grid-cols-3">
        <RwStat label="Mon niveau" value={me?.level ?? "Non défini"} />
        <RwStat label="Lectures validées" value={`${validated} / ${total}`} />
        <RwStat label="Semaine en cours" value="1" hint={RW_PROGRAM[0]?.title} />
      </div>
      <Button asChild><Link to="/reading-workshop/library">Ouvrir la bibliothèque</Link></Button>
    </div>
  );
}
