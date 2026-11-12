import { createFileRoute, Link } from "@tanstack/react-router";
import { RwEmpty, RwShell, RwStat, useRwContext } from "@/components/reading-workshop/rw-shell";
import { Button } from "@/components/ui/button";
import { RW_PROGRAM } from "@/lib/reading-workshop";

export const Route = createFileRoute("/_authenticated/reading-workshop/learner")({
  head: () => ({ meta: [{ title: "Mon espace, Reading Workshop OpenDoorsClass" }] }),
  component: () => (
    <RwShell need="learner" title="Mon espace de lecture" subtitle="Votre niveau, votre progression et vos prochaines lectures.">
      <LearnerHome />
    </RwShell>
  ),
});

function LearnerHome() {
  const { data } = useRwContext();
  const total = RW_PROGRAM.length * 6;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <RwStat label="Mon niveau" value={data?.learner?.level ?? "Non défini"} />
        <RwStat label="Lectures validées" value={`0 / ${total}`} />
        <RwStat label="Semaine en cours" value="1" hint={RW_PROGRAM[0]?.title} />
      </div>
      <RwEmpty title="Vos lectures arrivent bientôt" text="Les textes de votre niveau seront publiés dans la bibliothèque au fil du programme." />
      <Button asChild><Link to="/reading-workshop/library">Ouvrir la bibliothèque</Link></Button>
    </div>
  );
}
