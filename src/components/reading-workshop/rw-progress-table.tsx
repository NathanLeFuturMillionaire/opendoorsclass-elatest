import { useMemo } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RwAvatar, RwEmpty } from "@/components/reading-workshop/rw-shell";
import { RwProgressRing } from "@/components/reading-workshop/rw-progress";
import { computeRwProgress, rwReportCsv, type RwProgressSub } from "@/lib/rw-progress";

type Learner = { id: string; full_name: string; level: string; start_date?: string | null; coach_id?: string | null; photo_url?: string | null };

export function RwProgressTable({ learners, subs, coachName, reportName }: {
  learners: Learner[]; subs: (RwProgressSub & { learner_id: string })[]; coachName?: Record<string, string>; reportName: string;
}) {
  const rows = useMemo(() => {
    const by = new Map<string, RwProgressSub[]>();
    for (const s of subs) { const a = by.get(s.learner_id) ?? []; a.push(s); by.set(s.learner_id, a); }
    return learners.map((l) => ({ l, p: computeRwProgress(by.get(l.id) ?? [], l.start_date ?? null) }))
      .sort((a, b) => b.p.behind - a.p.behind || a.l.full_name.localeCompare(b.l.full_name));
  }, [learners, subs]);

  function exportCsv() {
    const csv = rwReportCsv(rows.map(({ l, p }) => ({ name: l.full_name, level: l.level, coach: l.coach_id ? coachName?.[l.coach_id] ?? "" : "", p })));
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${reportName}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!learners.length) return <RwEmpty title="Aucun apprenant à suivre" text="La progression apparaîtra dès qu'un apprenant sera inscrit." />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 size-4" /> Télécharger le rapport</Button></div>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
        {rows.map(({ l, p }) => (
          <li key={l.id} className="flex flex-wrap items-center gap-4 p-4">
            <RwProgressRing percent={p.percent} size={56} />
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <RwAvatar name={l.full_name} url={l.photo_url ?? null} size={36} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{l.full_name} <span className="ml-1 rounded-full bg-[var(--rw-soft)] px-2 py-0.5 text-xs font-bold text-primary">{l.level}</span></p>
                <p className="truncate text-xs text-muted-foreground">Semaine {p.currentWeek} · {p.validated} validées · Moyenne {p.averageScore ?? "aucune"}{p.averageScore !== null ? "/20" : ""}</p>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              {p.pending > 0 && <span className="rounded-full bg-muted px-2 py-1">{p.pending} en attente</span>}
              {p.redo > 0 && <span className="rounded-full bg-muted px-2 py-1">{p.redo} reprise{p.redo > 1 ? "s" : ""}</span>}
              {p.behind > 0 ? <span className="rounded-full bg-destructive/10 px-2 py-1 font-semibold text-destructive">{p.behind} séance{p.behind > 1 ? "s" : ""} de retard</span>
                : <span className="rounded-full bg-[var(--rw-soft)] px-2 py-1 font-semibold text-primary">À jour</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
