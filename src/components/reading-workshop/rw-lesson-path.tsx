import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Lock, PlayCircle, RotateCcw, Unlock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RwEmpty } from "@/components/reading-workshop/rw-shell";
import { RW_DAYS } from "@/lib/reading-workshop";
import { RW_LESSON_STATE_LABEL, type RwStateRow } from "@/lib/rw-unlock";
import { cn } from "@/lib/utils";

export function useRwLessonStates(learnerId?: string) {
  return useQuery({
    queryKey: ["rw-lesson-states", learnerId ?? "me"],
    queryFn: async () => {
      const { data, error } = learnerId
        ? await supabase.rpc("rw_states_for_learner", { _learner: learnerId })
        : await supabase.rpc("rw_my_lesson_states");
      if (error) throw new Error(error.message);
      return (data ?? []) as RwStateRow[];
    },
  });
}

const ICON = { locked: Lock, available: PlayCircle, in_progress: PlayCircle, submitted: Clock, resubmitted: Clock, redo: RotateCcw, validated: CheckCircle2 };

function UnlockForm({ learnerId, row }: { learnerId: string; row: RwStateRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Unlock className="mr-1.5 size-3.5" />Débloquer</Button>;
  async function go() {
    if (reason.trim().length < 5) return toast.error("Indiquez une justification (5 caractères minimum).");
    setBusy(true);
    const { error } = await supabase.rpc("rw_manual_unlock", { _learner: learnerId, _lesson: row.lesson_id, _reason: reason.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Texte débloqué.");
    qc.invalidateQueries({ queryKey: ["rw-lesson-states"] });
  }
  return (
    <div className="mt-2 w-full space-y-2">
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Justification du déblocage manuel" maxLength={500} />
      <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={go}>Confirmer</Button><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button></div>
    </div>
  );
}

export function RwLessonPath({ learnerId, canUnlock = false }: { learnerId?: string; canUnlock?: boolean }) {
  const { data: rows = [], isLoading } = useRwLessonStates(learnerId);
  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement du parcours…</p>;
  if (!rows.length) return <RwEmpty title="Aucun texte publié" text="Les textes de votre niveau apparaîtront ici dès leur publication." />;
  const done = rows.filter((r) => r.state === "validated").length;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{done} texte{done > 1 ? "s" : ""} validé{done > 1 ? "s" : ""} sur {rows.length}. Le texte suivant s'ouvre uniquement après la validation de votre coach.</p>
      <ol className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
        {rows.map((r) => {
          const I = ICON[r.state];
          const locked = r.state === "locked";
          return (
            <li key={r.lesson_id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3", locked && "opacity-70")}>
              <I className={cn("size-4 shrink-0", r.state === "validated" ? "text-primary" : r.state === "redo" ? "text-destructive" : "text-muted-foreground")} />
              <div className="min-w-0 flex-1">
                {locked || learnerId ? <p className="font-medium">{r.title}</p>
                  : <Link to="/reading-workshop/lesson/$id" params={{ id: r.lesson_id }} className="font-medium hover:text-primary">{r.title}</Link>}
                <p className="text-xs text-muted-foreground">Week {String(r.week_number).padStart(2, "0")} · {RW_DAYS[r.day_index - 1]}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold",
                r.state === "validated" ? "bg-[var(--rw-soft)] text-primary" : r.state === "redo" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
                {RW_LESSON_STATE_LABEL[r.state]}
              </span>
              {canUnlock && locked && learnerId && <UnlockForm learnerId={learnerId} row={r} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
