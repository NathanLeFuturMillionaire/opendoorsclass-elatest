import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RwShell } from "@/components/reading-workshop/rw-shell";
import { listRwLessons } from "@/lib/reading-workshop.functions";
import { RW_DAYS, RW_PROGRAM } from "@/lib/reading-workshop";

export const Route = createFileRoute("/_authenticated/reading-workshop/library")({
  head: () => ({ meta: [{ title: "Bibliothèque, Reading Workshop OpenDoorsClass" }] }),
  component: () => (
    <RwShell need="member" title="Bibliothèque de lecture" subtitle="20 semaines, 6 séances par semaine, du lundi au samedi.">
      <Library />
    </RwShell>
  ),
});

function Library() {
  const fetchLessons = useServerFn(listRwLessons);
  const { data = [] } = useQuery({ queryKey: ["rw-lessons"], queryFn: () => fetchLessons() });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{data.length} texte(s) disponible(s) pour le moment. Les séances sans texte sont en préparation.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {RW_PROGRAM.map((w) => (
          <section key={w.week} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Week {String(w.week).padStart(2, "0")}</p>
            <h2 className="text-lg font-bold">{w.title}</h2>
            <ol className="mt-3 space-y-1.5 text-sm">
              {w.sessions.map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span className="w-24 shrink-0 text-muted-foreground">{RW_DAYS[i]}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
