import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { RwShell, useRwContext } from "@/components/reading-workshop/rw-shell";
import { RwLessonPath } from "@/components/reading-workshop/rw-lesson-path";
import { Button } from "@/components/ui/button";
import { listRwProgram } from "@/lib/rw-lessons.functions";
import { RW_DAYS } from "@/lib/reading-workshop";

export const Route = createFileRoute("/_authenticated/reading-workshop/library")({
  head: () => ({ meta: [{ title: "Bibliothèque, Reading Workshop OpenDoorsClass" }] }),
  component: () => (
    <RwShell need="member" title="Bibliothèque de lecture" subtitle="20 semaines, 6 séances par semaine, du lundi au samedi.">
      <Library />
    </RwShell>
  ),
});

function Library() {
  const { data: ctx } = useRwContext();
  const fetchProgram = useServerFn(listRwProgram);
  const { data: weeks = [] } = useQuery({ queryKey: ["rw-program"], queryFn: () => fetchProgram() });
  const myLevel = ctx?.learner?.level;
  if (ctx?.learner && !ctx?.isStaff && !ctx?.isCoach) return <RwLessonPath />;
  return (
    <div className="space-y-4">
      {ctx?.isStaff && <Button asChild><Link to="/reading-workshop/content">Gérer les textes</Link></Button>}
      <div className="grid gap-4 md:grid-cols-2">
        {weeks.map((w) => (
          <section key={w.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Week {String(w.week_number).padStart(2, "0")}</p>
            <h2 className="text-lg font-bold">{w.title}</h2>
            <ol className="mt-3 space-y-1">
              {w.sessions.map((s) => {
                const pub = s.lessons.filter((l) => l.status === "published");
                const lesson = (myLevel && pub.find((l) => l.level === myLevel)) || pub[0];
                return (
                  <li key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50">
                    <span className="w-24 shrink-0 text-muted-foreground">{RW_DAYS[s.day_index - 1]}</span>
                    {lesson ? (
                      <Link to="/reading-workshop/lesson/$id" params={{ id: lesson.id }} className="flex-1 font-medium text-foreground hover:text-primary">{s.title}</Link>
                    ) : (
                      <span className="flex flex-1 items-center gap-1.5 text-muted-foreground">{s.title} <Lock className="size-3" aria-label="En préparation" /></span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
