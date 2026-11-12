import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RwAvatar, RwEmpty } from "@/components/reading-workshop/rw-shell";
import { RW_STATUS_LABEL, signedRwMedia } from "@/lib/rw-submissions";
import { cn } from "@/lib/utils";

export type Sub = {
  id: string; kind: string; storage_path: string; status: keyof typeof RW_STATUS_LABEL; learner_note: string | null;
  coach_feedback: string | null; score: number | null; created_at: string; lesson_id: string; learner_id: string;
  rw_lessons: { title: string; level: string } | null; rw_learners: { full_name: string; level: string; start_date: string | null } | null;
};

export function useRwSubmissions(key: string, filter?: { lessonId?: string }) {
  return useQuery({
    queryKey: ["rw-my-submissions", key, filter?.lessonId ?? ""],
    queryFn: async () => {
      let q = supabase.from("rw_submissions")
        .select("id, kind, storage_path, status, learner_note, coach_feedback, score, created_at, lesson_id, learner_id, rw_lessons(title, level), rw_learners(full_name, level, start_date)")
        .order("created_at", { ascending: false }).limit(1000);
      if (filter?.lessonId) q = q.eq("lesson_id", filter.lessonId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Sub[];
    },
  });
}

const ICON = { submitted: Clock, redo: RotateCcw, validated: CheckCircle2 };

function Media({ s }: { s: Sub }) {
  const { data: url } = useQuery({ queryKey: ["rw-media", s.storage_path], queryFn: () => signedRwMedia(s.storage_path), staleTime: 30 * 60 * 1000 });
  if (!url) return <p className="text-xs text-muted-foreground">Chargement du média…</p>;
  return s.kind === "video" ? <video src={url} controls playsInline className="aspect-video w-full rounded-xl bg-muted" /> : <audio src={url} controls className="w-full" />;
}

function Review({ s }: { s: Sub }) {
  const qc = useQueryClient();
  const [fb, setFb] = useState(s.coach_feedback ?? "");
  const [score, setScore] = useState(s.score?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  async function decide(status: "validated" | "redo") {
    if (status === "redo" && !fb.trim()) return toast.error("Expliquez à l'apprenant ce qu'il doit améliorer.");
    const n = score === "" ? null : Math.max(0, Math.min(20, Math.round(Number(score))));
    setBusy(true);
    const { error } = await supabase.from("rw_submissions").update({ status, coach_feedback: fb.trim() || null, score: n }).eq("id", s.id);
    setBusy(false);
    if (error) return toast.error("Correction non enregistrée.");
    toast.success(status === "validated" ? "Lecture validée." : "Reprise demandée.");
    qc.invalidateQueries({ queryKey: ["rw-my-submissions"] });
  }
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <Textarea value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Votre retour : prononciation, fluidité, intonation…" maxLength={2000} />
      <div className="flex flex-wrap items-center gap-2">
        <Input type="number" min={0} max={20} value={score} onChange={(e) => setScore(e.target.value)} placeholder="Note /20" className="w-28" />
        <Button size="sm" disabled={busy} onClick={() => decide("validated")}>{busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 size-4" />}Valider</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("redo")}><RotateCcw className="mr-1.5 size-4" />Demander une reprise</Button>
      </div>
    </div>
  );
}

export function RwSubmissionsList({ items, mode }: { items: Sub[]; mode: "learner" | "coach" }) {
  if (!items.length) return <RwEmpty title={mode === "coach" ? "Aucun travail ici" : "Aucun envoi pour le moment"} text={mode === "coach" ? "Les lectures envoyées par vos apprenants apparaîtront ici." : "Enregistrez votre lecture depuis un texte de la bibliothèque."} />;
  return (
    <ul className="space-y-3">
      {items.map((s) => {
        const I = ICON[s.status];
        return (
          <li key={s.id} className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {mode === "coach" && <RwAvatar name={s.rw_learners?.full_name ?? "?"} size={36} />}
                <div>
                  <p className="font-semibold">{mode === "coach" ? s.rw_learners?.full_name : s.rw_lessons?.title}</p>
                  <p className="text-xs text-muted-foreground">{mode === "coach" ? `${s.rw_lessons?.title} · ` : ""}{s.rw_lessons?.level} · {s.kind === "video" ? "Vidéo" : "Audio"} · {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
              <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                s.status === "validated" ? "bg-[var(--rw-soft)] text-primary" : s.status === "redo" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
                <I className="size-3.5" />{RW_STATUS_LABEL[s.status]}{s.score !== null && ` · ${s.score}/20`}
              </span>
            </div>
            <Media s={s} />
            {s.learner_note && <p className="text-sm italic text-muted-foreground">« {s.learner_note} »</p>}
            {mode === "learner" && s.coach_feedback && <div className="rounded-xl bg-[var(--rw-soft)] p-3 text-sm"><p className="text-xs font-semibold text-primary">Retour du coach</p><p>{s.coach_feedback}</p></div>}
            {mode === "coach" && <Review s={s} />}
          </li>
        );
      })}
    </ul>
  );
}
