import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { RwShell, RwStat } from "@/components/reading-workshop/rw-shell";
import { RwLessonEditor } from "@/components/reading-workshop/rw-lesson-editor";
import { Button } from "@/components/ui/button";
import { generateRwLesson, listRwProgram } from "@/lib/rw-lessons.functions";
import { RW_DAYS, RW_LEVELS, type RwLevel } from "@/lib/reading-workshop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reading-workshop/content")({
  head: () => ({ meta: [{ title: "Contenus, Reading Workshop OpenDoorsClass" }] }),
  component: () => (
    <RwShell need="admin" title="Bibliothèque pédagogique" subtitle="L'IA prépare chaque texte en brouillon. Relisez, vérifiez la source, puis publiez.">
      <Content />
    </RwShell>
  ),
});

function Content() {
  const qc = useQueryClient();
  const fetchProgram = useServerFn(listRwProgram);
  const generate = useServerFn(generateRwLesson);
  const { data: weeks = [] } = useQuery({ queryKey: ["rw-program"], queryFn: () => fetchProgram() });
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [openWeek, setOpenWeek] = useState(1);

  const all = weeks.flatMap((w) => w.sessions.flatMap((s) => s.lessons));
  const published = all.filter((l) => l.status === "published").length;

  async function gen(sessionId: string, level: RwLevel) {
    const key = `${sessionId}:${level}`;
    setBusy((b) => new Set(b).add(key));
    try {
      await generate({ data: { session_id: sessionId, level } });
      await qc.invalidateQueries({ queryKey: ["rw-program"] });
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Génération impossible.");
      return false;
    } finally {
      setBusy((b) => { const n = new Set(b); n.delete(key); return n; });
    }
  }

  async function genWeek(w: (typeof weeks)[number]) {
    const todo = w.sessions.flatMap((s) => RW_LEVELS.filter((l) => !s.lessons.some((x) => x.level === l.code)).map((l) => [s.id, l.code] as const));
    if (!todo.length) return toast.info("Tous les textes de cette semaine existent déjà.");
    toast.info(`${todo.length} textes en préparation. Gardez la page ouverte.`);
    let ok = 0;
    for (const [sid, lv] of todo) if (await gen(sid, lv)) ok++; else break;
    toast.success(`${ok} brouillon(s) prêt(s) à relire.`);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <RwStat label="Brouillons" value={all.length - published} />
        <RwStat label="Publiés" value={published} />
        <RwStat label="Objectif" value={`${all.length} / 600`} hint="120 séances x 5 niveaux" />
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><i className="size-3 rounded-full border border-dashed border-border" /> À créer</span>
        <span className="flex items-center gap-1.5"><i className="size-3 rounded-full bg-accent" /> Brouillon</span>
        <span className="flex items-center gap-1.5"><i className="size-3 rounded-full bg-primary" /> Publié</span>
      </div>
      <div className="space-y-3">
        {weeks.map((w) => (
          <section key={w.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <button type="button" onClick={() => setOpenWeek(openWeek === w.week_number ? 0 : w.week_number)} className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/40">
              <span><span className="text-xs font-semibold text-primary">Week {String(w.week_number).padStart(2, "0")}</span><span className="block font-bold">{w.title}</span></span>
              <span className="text-sm text-muted-foreground">{w.sessions.reduce((n, s) => n + s.lessons.length, 0)} / 30</span>
            </button>
            {openWeek === w.week_number && (
              <div className="space-y-2 border-t border-border p-4">
                {w.sessions.map((s) => (
                  <div key={s.id} className="flex flex-col gap-2 rounded-xl p-2 sm:flex-row sm:items-center">
                    <p className="flex-1 text-sm"><span className="mr-2 text-muted-foreground">{RW_DAYS[s.day_index - 1]}</span><span className="font-medium">{s.title}</span></p>
                    <div className="flex gap-1.5">
                      {RW_LEVELS.map((lv) => {
                        const l = s.lessons.find((x) => x.level === lv.code);
                        const loading = busy.has(`${s.id}:${lv.code}`);
                        return (
                          <button key={lv.code} type="button" disabled={loading}
                            title={l ? (l.status === "published" ? "Publié, cliquer pour relire" : "Brouillon, cliquer pour relire") : "Générer avec l'IA"}
                            onClick={() => (l ? setEditing(l.id) : gen(s.id, lv.code))}
                            className={cn("flex h-8 w-11 items-center justify-center rounded-lg text-xs font-bold transition",
                              !l && "border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary",
                              l?.status === "draft" && "bg-accent text-accent-foreground hover:ring-2 hover:ring-ring",
                              l?.status === "published" && "bg-primary text-primary-foreground hover:opacity-90")}>
                            {loading ? <Loader2 className="size-3.5 animate-spin" /> : lv.code}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => genWeek(w)} disabled={busy.size > 0}>
                  <Sparkles className="mr-1 size-4" /> Préparer les textes manquants de la semaine
                </Button>
              </div>
            )}
          </section>
        ))}
      </div>
      {editing && <RwLessonEditor id={editing} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["rw-program"] })} />}
      <p className="text-sm text-muted-foreground">Aperçu côté apprenant : ouvrez un texte publié depuis la <Link to="/reading-workshop/library" className="text-primary underline">bibliothèque</Link>.</p>
    </div>
  );
}
